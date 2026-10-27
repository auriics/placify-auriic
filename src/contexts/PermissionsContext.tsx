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
import { doc, setDoc, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

  // Load latest permissions from backend API (which uses Firebase Admin)
  const fetchPermissionsFromApi = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        if (data?.permissions) {
          setRolePermissions((prev) => {
            const next = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as Record<Role, Record<string, ModulePermission>>;
            return {
              ...next,
              ...data.permissions,
            };
          });
        }
      }
    } catch (err) {
      console.warn('[PermissionsContext] API load notice:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load audit logs from backend API for Admin
  const fetchAuditLogsFromApi = useCallback(async () => {
    if (!isAdminUser(user)) return;
    try {
      let token: string | null = null;
      try {
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      } catch (e) {
        // Token retrieval failure
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (user?.email) headers['x-admin-email'] = user.email;
      if (user?.id) headers['x-admin-id'] = String(user.id);

      const res = await fetch('/api/permissions/audit-logs', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.logs && Array.isArray(data.logs)) {
          setAuditLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('[PermissionsContext] Audit log API load notice:', err);
    }
  }, [user]);

  // Subscribe to real-time role permissions from Firestore / API
  useEffect(() => {
    // 1. Initial load from API (works unauthenticated or authenticated)
    fetchPermissionsFromApi();
    if (isAdmin) {
      fetchAuditLogsFromApi();
    }

    if (!isAuthReady || !user) {
      return;
    }

    // 2. Best-effort Firestore onSnapshot listeners with graceful fallback to prevent unhandled permission errors
    let unsubPerms = () => {};
    let unsubAudit = () => {};

    try {
      const qPerms = collection(db, 'jpc_role_permissions');
      unsubPerms = onSnapshot(
        qPerms,
        (snapshot) => {
          if (!snapshot.empty) {
            setRolePermissions((prev) => {
              const next = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as Record<Role, Record<string, ModulePermission>>;
              snapshot.forEach((docSnap) => {
                const rec = docSnap.data() as RolePermissionsRecord;
                if (rec.role && rec.modules) {
                  next[rec.role] = {
                    ...(next[rec.role] || {}),
                    ...rec.modules,
                  };
                }
              });
              return next;
            });
          }
          setIsLoading(false);
        },
        (err) => {
          // Direct client Firestore read rejected by rules; use backend API
          console.info('[PermissionsContext] Using backend API for role permissions synchronization.');
          fetchPermissionsFromApi();
        }
      );
    } catch (e) {
      console.warn('[PermissionsContext] Perms listener init notice:', e);
    }

    if (isAdmin) {
      try {
        const qAudit = query(collection(db, 'jpc_permission_audit_logs'), orderBy('created_at', 'desc'), limit(100));
        unsubAudit = onSnapshot(
          qAudit,
          (snapshot) => {
            const logs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PermissionAuditLog));
            setAuditLogs(logs);
          },
          (err) => {
            // Direct client Firestore audit read rejected; use backend API
            console.info('[PermissionsContext] Using backend API for permission audit logs.');
            fetchAuditLogsFromApi();
          }
        );
      } catch (e) {
        fetchAuditLogsFromApi();
      }
    }

    return () => {
      unsubPerms();
      unsubAudit();
    };
  }, [isAuthReady, user, isAdmin, fetchPermissionsFromApi, fetchAuditLogsFromApi]);

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
   * Saves updated permissions for a role to backend API (Admin-authenticated) and updates local state.
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
        if (newPermissions.team) {
          newPermissions.team.view = true;
          newPermissions.team.manage = true;
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
      const adminId = String(user?.id || auth.currentUser?.uid || 'admin');
      const adminName = String(user?.display_name || user?.username || auth.currentUser?.displayName || 'Admin');
      const adminEmail = String(user?.email || auth.currentUser?.email || '');

      const record: RolePermissionsRecord = {
        id: role,
        role,
        modules: newPermissions,
        updated_at: now,
        updated_by: adminId,
        updated_by_name: adminName,
      };

      try {
        let token: string | null = null;
        try {
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
        } catch (e) {
          // Token retrieval failure
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (adminEmail) headers['x-admin-email'] = adminEmail;
        if (adminId) headers['x-admin-id'] = adminId;

        // 1. PRIMARY: Save to Backend Server API (runs with Firebase Admin SDK, writes role perms & audit log)
        let serverSaved = false;
        try {
          const apiRes = await fetch('/api/permissions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              role,
              modules: newPermissions,
              adminUser: {
                id: adminId,
                name: adminName,
                email: adminEmail,
                role: user?.role || 'administrator'
              },
              changes
            }),
          });

          if (apiRes.ok) {
            serverSaved = true;
          } else {
            const errData = await apiRes.json().catch(() => ({}));
            console.warn('[PermissionsContext] Server API returned non-OK status:', errData.error || apiRes.status);
          }
        } catch (apiErr) {
          console.warn('[PermissionsContext] Server API unreachable, will fallback to direct Firestore:', apiErr);
        }

        // 2. Direct Firestore sync
        try {
          await setDoc(doc(db, 'jpc_role_permissions', role), record);
          // Only create audit log from client if server API did not already write it
          if (!serverSaved && changes.length > 0) {
            const auditEntry = {
              admin_id: adminId,
              admin_name: adminName,
              admin_email: adminEmail,
              affected_role: role,
              changes,
              summary: `Updated ${changes.length} permission(s) for role "${role}".`,
              created_at: now,
            };
            await addDoc(collection(db, 'jpc_permission_audit_logs'), auditEntry);
          }
        } catch (clientFsErr) {
          console.info('[PermissionsContext] Direct Firestore client write notice:', clientFsErr);
          // If server didn't save either, throw error
          if (!serverSaved) {
            throw clientFsErr;
          }
        }

        // 3. Update local state immediately for instant feedback
        setRolePermissions(prev => ({
          ...prev,
          [role]: newPermissions,
        }));

        // 4. Refresh audit logs
        await fetchAuditLogsFromApi();

        showToast(`Permissions updated successfully for "${role}".`, 'success');
      } catch (err: any) {
        console.error('[PermissionsContext] Failed to save permissions:', err);
        showToast(`Failed to save permissions: ${err?.message || 'Unknown error'}`, 'error');
        throw err;
      }
    },
    [user, getRolePermissions, showToast, fetchAuditLogsFromApi]
  );

  /**
   * Resets a role back to default system permissions via Backend API.
   */
  const resetRolePermissions = useCallback(
    async (role: Role) => {
      if (!isAdminUser(user)) {
        showToast('Unauthorized: Only administrators can reset permissions.', 'error');
        throw new Error('Unauthorized');
      }

      try {
        let token: string | null = null;
        try {
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
        } catch (e) {
          // Token retrieval failure
        }

        const adminId = String(user?.id || auth.currentUser?.uid || 'admin');
        const adminName = String(user?.display_name || user?.username || auth.currentUser?.displayName || 'Admin');
        const adminEmail = String(user?.email || auth.currentUser?.email || '');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (adminEmail) headers['x-admin-email'] = adminEmail;
        if (adminId) headers['x-admin-id'] = adminId;

        const res = await fetch('/api/permissions/reset', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            role,
            adminUser: {
              id: adminId,
              name: adminName,
              email: adminEmail,
              role: user?.role || 'administrator'
            }
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${res.status}`);
        }

        const defaults = DEFAULT_ROLE_PERMISSIONS[role];
        if (defaults) {
          setRolePermissions(prev => ({
            ...prev,
            [role]: JSON.parse(JSON.stringify(defaults)),
          }));
        }

        await fetchAuditLogsFromApi();
        showToast(`Role "${role}" reset to default system permissions.`, 'info');
      } catch (err: any) {
        console.error('[PermissionsContext] Failed to reset permissions:', err);
        showToast(`Failed to reset permissions: ${err?.message || 'Unknown error'}`, 'error');
        throw err;
      }
    },
    [user, showToast, fetchAuditLogsFromApi]
  );

  const refreshPermissions = useCallback(() => {
    setIsLoading(true);
    fetchPermissionsFromApi();
    if (isAdmin) {
      fetchAuditLogsFromApi();
    }
  }, [fetchPermissionsFromApi, fetchAuditLogsFromApi, isAdmin]);

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
