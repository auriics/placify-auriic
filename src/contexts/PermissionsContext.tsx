import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { Role } from '../types';
import { 
  PermissionAction, 
  ModulePermission, 
  RolePermissionsRecord, 
  PermissionAuditLog, 
  PermissionChangeItem,
  isAdminUser 
} from '../types/permissions';
import { DEFAULT_ROLE_PERMISSIONS, APP_MODULES } from '../constants/defaultPermissions';
import { subscribeToCollection } from '../services/storage';
import { doc, setDoc, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface PermissionsContextType {
  hasPermission: (module: string, action: PermissionAction) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canManage: (module: string) => boolean;
  canExport: (module: string) => boolean;
  getRolePermissions: (role: Role) => Record<string, ModulePermission>;
  saveRolePermissions: (role: Role, newPermissions: Record<string, ModulePermission>) => Promise<void>;
  resetRolePermissions: (role: Role) => Promise<void>;
  auditLogs: PermissionAuditLog[];
  isLoading: boolean;
  isAdmin: boolean;
  refreshPermissions: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useAuth();
  const { showToast } = useToast();

  const [rolePermissions, setRolePermissions] = useState<Record<Role, Record<string, ModulePermission>>>(
    () => JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS))
  );
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  // Subscribe to real-time role permissions from Firestore
  useEffect(() => {
    if (!isAuthReady) return;

    let unsubAudit = () => {};

    const unsubPerms = subscribeToCollection<RolePermissionsRecord>('jpc_role_permissions', (records) => {
      setRolePermissions((prev) => {
        const next = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as Record<Role, Record<string, ModulePermission>>;
        for (const rec of records) {
          if (rec.role && rec.modules) {
            next[rec.role] = {
              ...(next[rec.role] || {}),
              ...rec.modules,
            };
          }
        }
        return next;
      });
      setIsLoading(false);
    });

    // If Admin, also subscribe to real-time audit logs
    if (isAdmin) {
      try {
        const q = query(collection(db, 'jpc_permission_audit_logs'), orderBy('created_at', 'desc'), limit(100));
        unsubAudit = onSnapshot(q, (snapshot) => {
          const logs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PermissionAuditLog));
          setAuditLogs(logs);
        }, (err) => {
          console.warn('[PermissionsContext] Audit log query failed (index may be pending):', err);
          // Fallback simple query
          subscribeToCollection<PermissionAuditLog>('jpc_permission_audit_logs', (logs) => {
            const sorted = [...logs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            setAuditLogs(sorted.slice(0, 100));
          });
        });
      } catch (err) {
        console.warn('[PermissionsContext] Audit log subscription error:', err);
      }
    }

    return () => {
      unsubPerms();
      unsubAudit();
    };
  }, [isAuthReady, isAdmin]);

  /**
   * Evaluates if current user has permission for a specific module action.
   */
  const hasPermission = useCallback(
    (module: string, action: PermissionAction): boolean => {
      if (!user) return false;

      // 1. Strict Admin-only module guard for permissions_management
      if (module === 'permissions_management') {
        return isAdminUser(user);
      }

      // 2. Anti-lockout guard: Administrator always retains view/manage on team and dashboard
      if (isAdminUser(user)) {
        if (module === 'team' || module === 'dashboard') {
          return true;
        }
      }

      const role = user.role;
      const userPerms = rolePermissions[role];
      if (!userPerms || !userPerms[module]) {
        // Fallback to default
        const fallback = DEFAULT_ROLE_PERMISSIONS[role]?.[module];
        return fallback ? Boolean(fallback[action]) : false;
      }

      return Boolean(userPerms[module][action]);
    },
    [user, rolePermissions]
  );

  const canView = useCallback((module: string) => hasPermission(module, 'view'), [hasPermission]);
  const canCreate = useCallback((module: string) => hasPermission(module, 'create'), [hasPermission]);
  const canEdit = useCallback((module: string) => hasPermission(module, 'edit'), [hasPermission]);
  const canDelete = useCallback((module: string) => hasPermission(module, 'delete'), [hasPermission]);
  const canManage = useCallback((module: string) => hasPermission(module, 'manage'), [hasPermission]);
  const canExport = useCallback((module: string) => hasPermission(module, 'export'), [hasPermission]);

  /**
   * Retrieves the current permissions map for a given role.
   */
  const getRolePermissions = useCallback(
    (role: Role): Record<string, ModulePermission> => {
      if (rolePermissions[role]) {
        return rolePermissions[role];
      }
      return DEFAULT_ROLE_PERMISSIONS[role] || {};
    },
    [rolePermissions]
  );

  /**
   * Saves updated permissions for a role to Firestore and logs an audit record.
   */
  const saveRolePermissions = useCallback(
    async (role: Role, newPermissions: Record<string, ModulePermission>) => {
      if (!isAdminUser(user)) {
        showToast('Unauthorized: Only administrators can modify permissions.', 'error');
        throw new Error('Unauthorized');
      }

      // Anti-lockout validation: Admin cannot remove view/manage on permissions_management for Admin roles
      if (role === 'administrator' || role === 'jpc_sysadmin') {
        if (newPermissions.permissions_management) {
          newPermissions.permissions_management.view = true;
          newPermissions.permissions_management.edit = true;
          newPermissions.permissions_management.manage = true;
        }
      }

      // Non-admin privilege escalation protection: non-admins cannot have permissions_management
      if (role !== 'administrator' && role !== 'jpc_sysadmin') {
        if (newPermissions.permissions_management) {
          newPermissions.permissions_management = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            manage: false,
            export: false,
          };
        }
      }

      // Calculate diff for audit log
      const current = getRolePermissions(role);
      const changes: PermissionChangeItem[] = [];

      for (const mod of APP_MODULES) {
        const curMod = current[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };
        const newMod = newPermissions[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };

        const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'manage', 'export'];
        for (const act of actions) {
          if (Boolean(curMod[act]) !== Boolean(newMod[act])) {
            changes.push({
              module: mod.label,
              action: act,
              from: Boolean(curMod[act]),
              to: Boolean(newMod[act]),
            });
          }
        }
      }

      const now = new Date().toISOString();
      const record: RolePermissionsRecord = {
        id: role,
        role,
        modules: newPermissions,
        updated_at: now,
        updated_by: String(user.id),
        updated_by_name: user.display_name || user.username || 'Admin',
      };

      try {
        // 1. Save to Firestore jpc_role_permissions
        await setDoc(doc(db, 'jpc_role_permissions', role), record);

        // 2. Also try server API endpoint to sync backend if available
        try {
          await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role,
              modules: newPermissions,
              adminUser: {
                id: user.id,
                name: user.display_name || user.username,
                email: user.email,
                role: user.role
              },
              changes
            }),
          });
        } catch (apiErr) {
          console.warn('[PermissionsContext] Server API sync optional notice:', apiErr);
        }

        // 3. Write audit log to Firestore
        if (changes.length > 0) {
          const auditEntry: Omit<PermissionAuditLog, 'id'> = {
            admin_id: String(user.id),
            admin_name: user.display_name || user.username || 'Admin',
            admin_email: user.email,
            affected_role: role,
            changes,
            summary: `Updated ${changes.length} permission(s) for role "${role}".`,
            created_at: now,
          };
          await addDoc(collection(db, 'jpc_permission_audit_logs'), auditEntry);
        }

        // 4. Update local state immediately for instant feedback
        setRolePermissions(prev => ({
          ...prev,
          [role]: newPermissions,
        }));

        showToast(`Permissions updated successfully for "${role}".`, 'success');
      } catch (err: any) {
        console.error('[PermissionsContext] Failed to save permissions:', err);
        showToast(`Failed to save permissions: ${err?.message || 'Unknown error'}`, 'error');
        throw err;
      }
    },
    [user, getRolePermissions, showToast]
  );

  /**
   * Resets a role back to default system permissions.
   */
  const resetRolePermissions = useCallback(
    async (role: Role) => {
      const defaults = DEFAULT_ROLE_PERMISSIONS[role];
      if (!defaults) {
        showToast(`No default permissions found for role "${role}".`, 'error');
        return;
      }
      await saveRolePermissions(role, JSON.parse(JSON.stringify(defaults)));
      showToast(`Role "${role}" reset to default system permissions.`, 'info');
    },
    [saveRolePermissions, showToast]
  );

  const refreshPermissions = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const value = useMemo(
    () => ({
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDelete,
      canManage,
      canExport,
      getRolePermissions,
      saveRolePermissions,
      resetRolePermissions,
      auditLogs,
      isLoading,
      isAdmin,
      refreshPermissions,
    }),
    [
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDelete,
      canManage,
      canExport,
      getRolePermissions,
      saveRolePermissions,
      resetRolePermissions,
      auditLogs,
      isLoading,
      isAdmin,
      refreshPermissions,
    ]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
