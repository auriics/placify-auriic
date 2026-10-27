import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { 
  PermissionAction, 
  ModulePermission, 
  PERMISSION_ACTIONS, 
  isAdminUser,
  AppModuleDefinition
} from '../types/permissions';
import { APP_MODULES, ALL_ROLES } from '../constants/defaultPermissions';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Lock, 
  Search, 
  Save, 
  RotateCcw, 
  Check, 
  X, 
  Eye, 
  Plus, 
  Edit2, 
  Trash2, 
  SlidersHorizontal, 
  Download, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Filter,
  Clock,
  Sparkles,
  Users,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';

export const PermissionsManagement: React.FC = () => {
  const { user } = useAuth();
  const { 
    getRolePermissions, 
    saveRolePermissions, 
    resetRolePermissions, 
    auditLogs, 
    isLoading: isPermissionsLoading 
  } = usePermissions();
  const { showToast } = useToast();

  const isUserAdmin = useMemo(() => isAdminUser(user), [user]);

  // Selected Role state
  const [selectedRole, setSelectedRole] = useState<Role>('jpc_sales');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');

  // Active View Tab: 'matrix' | 'audit'
  const [activeTab, setActiveTab] = useState<'matrix' | 'audit'>('matrix');

  // Module filter state
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // Staged / local edited permissions for selected role
  const [stagedPermissions, setStagedPermissions] = useState<Record<string, ModulePermission>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  // Sync staged permissions when selected role changes
  const activeRolePermissions = useMemo(() => {
    return getRolePermissions(selectedRole);
  }, [selectedRole, getRolePermissions]);

  // Initialize or reset staged state whenever selectedRole changes or activeRolePermissions changes
  React.useEffect(() => {
    setStagedPermissions(JSON.parse(JSON.stringify(activeRolePermissions)));
    setHasChanges(false);
  }, [selectedRole, activeRolePermissions]);

  // Filtered roles list
  const filteredRoles = useMemo(() => {
    return ALL_ROLES.filter(r => {
      const matchesSearch = r.label.toLowerCase().includes(roleSearchQuery.toLowerCase()) || 
                            r.role.toLowerCase().includes(roleSearchQuery.toLowerCase());
      const matchesGroup = selectedGroupFilter === 'All' || r.group === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [roleSearchQuery, selectedGroupFilter]);

  // Module categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    APP_MODULES.forEach(m => set.add(m.category));
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered modules list
  const filteredModules = useMemo(() => {
    return APP_MODULES.filter(m => {
      const matchesSearch = m.label.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
                            m.description.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
                            m.id.toLowerCase().includes(moduleSearchQuery.toLowerCase());
      const matchesCat = selectedCategoryFilter === 'All' || m.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [moduleSearchQuery, selectedCategoryFilter]);

  // Count changed actions
  const diffCount = useMemo(() => {
    let count = 0;
    const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'manage', 'export'];
    for (const mod of APP_MODULES) {
      const orig = activeRolePermissions[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };
      const cur = stagedPermissions[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };
      for (const act of actions) {
        if (Boolean(orig[act]) !== Boolean(cur[act])) {
          count++;
        }
      }
    }
    return count;
  }, [activeRolePermissions, stagedPermissions]);

  // Toggle single action for a module
  const handleToggleAction = useCallback((moduleId: string, action: PermissionAction) => {
    // Protected check: administrator / jpc_sysadmin cannot toggle off permissions_management
    if ((selectedRole === 'administrator' || selectedRole === 'jpc_sysadmin') && moduleId === 'permissions_management') {
      if (action === 'view' || action === 'manage') {
        showToast('Administrator access to Permissions Management is strictly locked for system safety.', 'info');
        return;
      }
    }

    // Non-admin check: cannot grant permissions_management to non-admin roles
    if (selectedRole !== 'administrator' && selectedRole !== 'jpc_sysadmin' && moduleId === 'permissions_management') {
      showToast('Permissions Management is an Administrator-only module and cannot be assigned to other roles.', 'error');
      return;
    }

    setStagedPermissions(prev => {
      const mod = prev[moduleId] ? { ...prev[moduleId] } : { view: false, create: false, edit: false, delete: false, manage: false, export: false };
      mod[action] = !mod[action];
      return {
        ...prev,
        [moduleId]: mod
      };
    });
    setHasChanges(true);
  }, [selectedRole, showToast]);

  // Bulk action for single module (Row select all / clear all)
  const handleRowBulkToggle = useCallback((moduleId: string, enableAll: boolean) => {
    const modDef = APP_MODULES.find(m => m.id === moduleId);
    if (!modDef) return;

    if (selectedRole !== 'administrator' && selectedRole !== 'jpc_sysadmin' && moduleId === 'permissions_management') {
      showToast('Permissions Management cannot be granted to non-admin roles.', 'error');
      return;
    }

    setStagedPermissions(prev => {
      const mod = prev[moduleId] ? { ...prev[moduleId] } : { view: false, create: false, edit: false, delete: false, manage: false, export: false };
      for (const act of modDef.supportedActions) {
        if ((selectedRole === 'administrator' || selectedRole === 'jpc_sysadmin') && moduleId === 'permissions_management' && (act === 'view' || act === 'manage') && !enableAll) {
          mod[act] = true; // Lockout guard
        } else {
          mod[act] = enableAll;
        }
      }
      return {
        ...prev,
        [moduleId]: mod
      };
    });
    setHasChanges(true);
  }, [selectedRole, showToast]);

  // Bulk: Select All modules for this role
  const handleSelectAllRole = useCallback(() => {
    setStagedPermissions(prev => {
      const next: Record<string, ModulePermission> = {};
      for (const mod of APP_MODULES) {
        if (selectedRole !== 'administrator' && selectedRole !== 'jpc_sysadmin' && mod.id === 'permissions_management') {
          next[mod.id] = { view: false, create: false, edit: false, delete: false, manage: false, export: false };
          continue;
        }
        const p: ModulePermission = { view: false, create: false, edit: false, delete: false, manage: false, export: false };
        for (const act of mod.supportedActions) {
          p[act] = true;
        }
        next[mod.id] = p;
      }
      return next;
    });
    setHasChanges(true);
  }, [selectedRole]);

  // Bulk: Clear All modules for this role
  const handleClearAllRole = useCallback(() => {
    setStagedPermissions(prev => {
      const next: Record<string, ModulePermission> = {};
      for (const mod of APP_MODULES) {
        const p: ModulePermission = { view: false, create: false, edit: false, delete: false, manage: false, export: false };
        // Lockout protection for admin
        if ((selectedRole === 'administrator' || selectedRole === 'jpc_sysadmin') && (mod.id === 'permissions_management' || mod.id === 'team')) {
          p.view = true;
          p.manage = true;
        }
        next[mod.id] = p;
      }
      return next;
    });
    setHasChanges(true);
  }, [selectedRole]);

  // Discard changes
  const handleDiscardChanges = useCallback(() => {
    setStagedPermissions(JSON.parse(JSON.stringify(activeRolePermissions)));
    setHasChanges(false);
    showToast('Unsaved changes discarded.', 'info');
  }, [activeRolePermissions, showToast]);

  // Save changes execution
  const handleConfirmSave = async () => {
    setIsSaving(true);
    setIsConfirmModalOpen(false);
    try {
      await saveRolePermissions(selectedRole, stagedPermissions);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default execution
  const handleConfirmReset = async () => {
    setIsResetConfirmModalOpen(false);
    setIsSaving(true);
    try {
      await resetRolePermissions(selectedRole);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to reset role permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // ACCESS DENIED VIEW FOR NON-ADMIN USERS
  // =========================================================================
  if (!isUserAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-secondary border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
          <p className="text-xs text-text-muted leading-relaxed mb-6">
            The Permissions Management console is strictly restricted to users with the <span className="font-semibold text-text-primary">Administrator</span> role. Your account (<span className="font-mono text-accent-blue">{user?.role || 'Guest'}</span>) is not authorized to view or configure role permissions.
          </p>
          <button
            onClick={() => { window.location.hash = '#dashboard'; }}
            className="w-full py-3 px-4 bg-bg-tertiary hover:bg-border-primary border border-border-primary rounded-xl text-xs font-semibold text-text-primary transition-all flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-accent-blue shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Permissions Management
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-red/10 text-accent-red border border-accent-red/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Admin Only
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Centralized role-based access control. Grant or revoke module actions dynamically across the CRM.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Matrix vs Audit Trail */}
        <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-xl border border-border-primary shadow-sm">
          <button
            onClick={() => setActiveTab('matrix')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
              activeTab === 'matrix'
                ? "bg-accent-blue text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Permissions Matrix
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
              activeTab === 'audit'
                ? "bg-accent-blue text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Audit Trail
            {auditLogs.length > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeTab === 'audit' ? "bg-white/20 text-white" : "bg-bg-tertiary text-text-secondary"
              )}>
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Role Selector (4 cols on lg) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-bg-secondary border border-border-primary rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-blue" />
                  Select Role
                </h3>
                <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-md border border-border-primary">
                  {filteredRoles.length} Roles
                </span>
              </div>

              {/* Role Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearchQuery}
                  onChange={e => setRoleSearchQuery(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-primary rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-all"
                />
              </div>

              {/* Role Group Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {['All', 'Administration', 'Management', 'Operations', 'External', 'Aurrum'].map(grp => (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium transition-all",
                      selectedGroupFilter === grp
                        ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                        : "bg-bg-tertiary text-text-muted hover:text-text-primary border border-transparent"
                    )}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* Roles List */}
              <div className="space-y-1.5 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                {filteredRoles.map(item => {
                  const isSelected = selectedRole === item.role;
                  const isRoleAdmin = item.role === 'administrator' || item.role === 'jpc_sysadmin';
                  return (
                    <button
                      key={item.role}
                      onClick={() => {
                        if (hasChanges) {
                          if (window.confirm('You have unsaved permission changes. Switch role without saving?')) {
                            setSelectedRole(item.role);
                          }
                        } else {
                          setSelectedRole(item.role);
                        }
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                        isSelected
                          ? "bg-accent-blue/10 border-accent-blue text-text-primary shadow-sm"
                          : "bg-bg-tertiary/40 hover:bg-bg-tertiary border-border-primary/60 text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-semibold truncate",
                            isSelected ? "text-accent-blue" : "text-text-primary"
                          )}>
                            {item.label}
                          </span>
                          {isRoleAdmin && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-red-500/10 text-red-500 border border-red-500/20 rounded font-mono">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-text-muted truncate">
                          {item.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-secondary border border-border-primary">
                          {item.group}
                        </span>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Modules Matrix (8 cols on lg) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Role Header Banner & Quick Controls */}
            <div className="bg-bg-secondary border border-border-primary rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                    Configuring Permissions For
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-lg font-bold text-text-primary">
                      {ALL_ROLES.find(r => r.role === selectedRole)?.label || selectedRole}
                    </h2>
                    <span className="font-mono text-xs text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-md border border-accent-blue/20">
                      {selectedRole}
                    </span>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSelectAllRole}
                    className="px-3 py-1.5 bg-bg-tertiary hover:bg-border-primary border border-border-primary rounded-xl text-xs font-semibold text-text-primary transition-all flex items-center gap-1.5"
                    title="Enable all permissions for this role"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllRole}
                    className="px-3 py-1.5 bg-bg-tertiary hover:bg-border-primary border border-border-primary rounded-xl text-xs font-semibold text-text-primary transition-all flex items-center gap-1.5"
                    title="Disable all permissions for this role"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsResetConfirmModalOpen(true)}
                    className="px-3 py-1.5 bg-bg-tertiary hover:bg-amber-500/10 border border-border-primary hover:border-amber-500/30 rounded-xl text-xs font-semibold text-text-primary hover:text-amber-500 transition-all flex items-center gap-1.5"
                    title="Reset role to default system permissions"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Defaults
                  </button>
                </div>
              </div>

              {/* Module Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border-primary/50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={moduleSearchQuery}
                    onChange={e => setModuleSearchQuery(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                        selectedCategoryFilter === cat
                          ? "bg-accent-blue text-white shadow-sm"
                          : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary/50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-bg-secondary border border-border-primary rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-tertiary/70 border-b border-border-primary text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 min-w-[220px]">Application Module</th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-accent-blue" /> View
                        </span>
                      </th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-emerald-500" /> Create
                        </span>
                      </th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit
                        </span>
                      </th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
                        </span>
                      </th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" /> Manage
                        </span>
                      </th>
                      <th className="py-3 px-3 text-center min-w-[70px]">
                        <span className="flex items-center justify-center gap-1">
                          <Download className="w-3.5 h-3.5 text-teal-500" /> Export
                        </span>
                      </th>
                      <th className="py-3 px-3 text-right min-w-[90px]">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary/50 text-xs">
                    {filteredModules.map((mod) => {
                      const modPerm = stagedPermissions[mod.id] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        manage: false,
                        export: false,
                      };

                      const isProtectedAdminModule = 
                        (selectedRole === 'administrator' || selectedRole === 'jpc_sysadmin') &&
                        mod.id === 'permissions_management';

                      const isRestrictedNonAdminModule =
                        selectedRole !== 'administrator' &&
                        selectedRole !== 'jpc_sysadmin' &&
                        mod.id === 'permissions_management';

                      return (
                        <tr 
                          key={mod.id}
                          className="hover:bg-bg-tertiary/30 transition-colors group"
                        >
                          <td className="py-3.5 px-4 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary text-xs">
                                {mod.label}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted border border-border-primary">
                                {mod.category}
                              </span>
                              {isProtectedAdminModule && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold">
                                  Locked
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-muted leading-relaxed line-clamp-1">
                              {mod.description}
                            </p>
                          </td>

                          {/* Action Checkboxes */}
                          {(['view', 'create', 'edit', 'delete', 'manage', 'export'] as PermissionAction[]).map((action) => {
                            const isSupported = mod.supportedActions.includes(action);
                            const isChecked = Boolean(modPerm[action]);

                            if (!isSupported) {
                              return (
                                <td key={action} className="py-3.5 px-3 text-center">
                                  <span className="text-text-muted/40 font-mono select-none">—</span>
                                </td>
                              );
                            }

                            // If this is permissions_management and not admin, disabled
                            const isDisabled = isRestrictedNonAdminModule || 
                              (isProtectedAdminModule && (action === 'view' || action === 'manage'));

                            return (
                              <td key={action} className="py-3.5 px-3 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer relative group/chk">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handleToggleAction(mod.id, action)}
                                    className="sr-only peer"
                                  />
                                  <div className={cn(
                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                    isChecked
                                      ? "bg-accent-blue border-accent-blue text-white shadow-xs"
                                      : "bg-bg-tertiary border-border-primary hover:border-accent-blue/50 text-transparent",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                  )}>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                </label>
                              </td>
                            );
                          })}

                          {/* Quick Row Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleRowBulkToggle(mod.id, true)}
                                disabled={isRestrictedNonAdminModule}
                                title="Enable all actions for this module"
                                className="p-1 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-all disabled:opacity-40"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRowBulkToggle(mod.id, false)}
                                disabled={isRestrictedNonAdminModule || isProtectedAdminModule}
                                title="Disable all actions for this module"
                                className="p-1 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all disabled:opacity-40"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Trail View */
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <History className="w-4 h-4 text-accent-blue" />
                Permission Change Audit Log
              </h3>
              <p className="text-xs text-text-muted">
                Immutable, real-time log of all permission updates made by administrators.
              </p>
            </div>
            <span className="text-xs font-mono text-text-muted bg-bg-tertiary px-3 py-1 rounded-xl border border-border-primary">
              {auditLogs.length} Records
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border-primary rounded-2xl">
              <Clock className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-text-secondary">No audit logs recorded yet</p>
              <p className="text-xs text-text-muted mt-1">Permission changes made through this console will be recorded here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-bg-tertiary/40 border border-border-primary/60 rounded-xl p-4 space-y-2 hover:border-border-primary transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-bold flex items-center justify-center text-xs">
                        {log.admin_name ? log.admin_name[0].toUpperCase() : 'A'}
                      </span>
                      <div>
                        <span className="font-semibold text-xs text-text-primary">{log.admin_name || 'Administrator'}</span>
                        {log.admin_email && (
                          <span className="text-[11px] text-text-muted ml-1.5 font-mono">({log.admin_email})</span>
                        )}
                        <span className="text-text-muted text-xs mx-1.5">•</span>
                        <span className="text-xs text-text-secondary">
                          updated permissions for role: <span className="font-semibold text-accent-blue">{log.affected_role}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  {log.changes && log.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {log.changes.map((ch, idx) => (
                        <span 
                          key={idx}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono border",
                            ch.to 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          )}
                        >
                          {ch.module} ({ch.action}): {ch.from ? 'ON' : 'OFF'} → {ch.to ? 'ON' : 'OFF'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Sticky Save / Discard Bar */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-bg-secondary/95 backdrop-blur-md border border-border-primary rounded-2xl p-3 sm:px-6 shadow-2xl flex items-center gap-4 max-w-lg w-full mx-4"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  Unsaved Changes
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {diffCount} action{diffCount !== 1 ? 's' : ''} modified for {selectedRole}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition-all"
              >
                Discard
              </button>
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-xs font-bold shadow-md shadow-accent-blue/20 transition-all flex items-center gap-1.5"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Saving Permissions */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Permission Changes"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-text-primary">
                Applying dynamic permission updates to role: <span className="font-bold underline">{selectedRole}</span>
              </p>
              <p className="text-text-muted">
                These changes will take effect immediately in real-time across all active user sessions for this role.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Summary of Modifications ({diffCount})
            </span>
            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 text-xs">
              {APP_MODULES.map(mod => {
                const orig = activeRolePermissions[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };
                const cur = stagedPermissions[mod.id] || { view: false, create: false, edit: false, delete: false, manage: false, export: false };
                const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'manage', 'export'];
                const changedActions = actions.filter(a => Boolean(orig[a]) !== Boolean(cur[a]));
                if (changedActions.length === 0) return null;

                return (
                  <div key={mod.id} className="p-2 bg-bg-tertiary rounded-lg border border-border-primary/50 flex items-center justify-between">
                    <span className="font-medium text-text-primary">{mod.label}</span>
                    <div className="flex gap-1">
                      {changedActions.map(a => (
                        <span 
                          key={a}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono",
                            cur[a] ? "bg-emerald-500/10 text-emerald-500 font-bold" : "bg-red-500/10 text-red-500"
                          )}
                        >
                          {a}: {cur[a] ? 'ENABLE' : 'DISABLE'}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-primary">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-accent-blue/90 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm & Apply Now
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Reset to Defaults */}
      <Modal
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
        title="Reset Role to Factory Defaults"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-text-primary">
                Are you sure you want to reset <span className="font-bold underline">{selectedRole}</span>?
              </p>
              <p className="text-text-muted">
                This will overwrite any custom configured permissions and revert this role back to the system factory defaults.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-primary">
            <button
              onClick={() => setIsResetConfirmModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
