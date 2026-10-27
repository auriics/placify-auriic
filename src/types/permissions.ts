import { Role, User } from '../types';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  manage: boolean;
  export: boolean;
}

export type ModuleCategory = 
  | 'Core CRM'
  | 'Recruitment & Operations'
  | 'Interview Support'
  | 'System & Admin'
  | 'Aurrum Careers';

export interface AppModuleDefinition {
  id: string;
  label: string;
  category: ModuleCategory;
  description: string;
  route?: string;
  supportedActions: PermissionAction[];
}

export interface RolePermissionsRecord {
  id?: string;
  role: Role;
  modules: Record<string, ModulePermission>;
  updated_at: string;
  updated_by: string;
  updated_by_name?: string;
}

export interface PermissionChangeItem {
  module: string;
  action: PermissionAction;
  from: boolean;
  to: boolean;
}

export interface PermissionAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email?: string;
  affected_role: Role;
  changes: PermissionChangeItem[];
  summary: string;
  created_at: string;
}

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string; description: string }[] = [
  { key: 'view', label: 'View', description: 'Access module pages and view records' },
  { key: 'create', label: 'Create', description: 'Add and create new records' },
  { key: 'edit', label: 'Edit', description: 'Modify and update existing records' },
  { key: 'delete', label: 'Delete', description: 'Delete and remove records' },
  { key: 'manage', label: 'Manage', description: 'Configure settings, assignments, and special controls' },
  { key: 'export', label: 'Export', description: 'Download and export data reports' },
];

export const createEmptyModulePermission = (): ModulePermission => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
  manage: false,
  export: false,
});

export const createFullModulePermission = (): ModulePermission => ({
  view: true,
  create: true,
  edit: true,
  delete: true,
  manage: true,
  export: true,
});

/**
 * Checks whether a given user is an Administrator with permissions management authority.
 * Strictly limited to administrator, jpc_sysadmin, and system owner email.
 */
export const isAdminUser = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'administrator' || user.role === 'jpc_sysadmin') return true;
  if (user.email === 'paramatwork3076@gmail.com' || user.email === 'officialparamparmar@gmail.com') return true;
  return false;
};
