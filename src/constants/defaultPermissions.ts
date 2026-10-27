import { Role } from '../types';
import { 
  AppModuleDefinition, 
  ModulePermission, 
  createEmptyModulePermission, 
  createFullModulePermission 
} from '../types/permissions';

export const APP_MODULES: AppModuleDefinition[] = [
  // Core CRM
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'Core CRM',
    description: 'Executive overview, key performance indicators, and lead metrics.',
    route: '#dashboard',
    supportedActions: ['view', 'export'],
  },
  {
    id: 'crm_dashboard',
    label: 'CRM Leads & Sales',
    category: 'Core CRM',
    description: 'Lead generation performance, conversion rates, and sales activity logs.',
    route: '#crm-dashboard',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'pipeline',
    label: 'Pipeline Board',
    category: 'Core CRM',
    description: 'Interactive Kanban board tracking candidates through recruitment stages.',
    route: '#pipeline',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    category: 'Core CRM',
    description: 'Candidate profiles, resume details, contact records, and interview logs.',
    route: '#candidates',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'followups',
    label: 'Follow-Ups',
    category: 'Core CRM',
    description: 'Scheduled reminders, tasks, and interaction notes with candidates.',
    route: '#followups',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'not_interested',
    label: 'Not Interested',
    category: 'Core CRM',
    description: 'Candidates who declined or are not interested in the program.',
    route: '#not-interested',
    supportedActions: ['view', 'edit', 'delete', 'export'],
  },
  {
    id: 'not_eligible',
    label: 'Not Eligible',
    category: 'Core CRM',
    description: 'Candidates filtered out as not eligible based on criteria.',
    route: '#not-eligible',
    supportedActions: ['view', 'edit', 'delete', 'export'],
  },

  // Recruitment & Operations
  {
    id: 'app_tracker',
    label: 'App Tracker',
    category: 'Recruitment & Operations',
    description: 'Tracking external job applications submitted on behalf of candidates.',
    route: '#applications',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'resume_log',
    label: 'Resume Log',
    category: 'Recruitment & Operations',
    description: 'Resume revision requests, marketing resumes, and approval workflow.',
    route: '#resume-log',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'resume_prep',
    label: 'Resume Prep Log',
    category: 'Recruitment & Operations',
    description: 'Technical resume preparation, keyword tuning, and formatting logs.',
    route: '#resume-prep-log',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'rtr_log',
    label: 'RTR Log',
    category: 'Recruitment & Operations',
    description: 'Right-to-Represent requests, candidate consent, and agency submissions.',
    route: '#rtr-log',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'target_compliance',
    label: 'Target Compliance',
    category: 'Recruitment & Operations',
    description: 'Recruiter and team target tracking, KPI compliance, and velocity.',
    route: '#target-dashboard',
    supportedActions: ['view', 'edit', 'manage', 'export'],
  },
  {
    id: 'cv_repository',
    label: 'CV Repository',
    category: 'Recruitment & Operations',
    description: 'Centralized repository of candidate CVs, original resumes, and drafts.',
    route: '#cv-repository',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    id: 'domain_resumes',
    label: 'Domain Resumes',
    category: 'Recruitment & Operations',
    description: 'Domain-specific resume bank and reference templates for marketing.',
    route: '#domain-resumes',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export'],
  },

  // Interview Support
  {
    id: 'interview_support',
    label: 'Interview Support',
    category: 'Interview Support',
    description: 'Interview rounds scheduling, meeting links, and candidate preparation.',
    route: '#interviews',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'proxy_support',
    label: 'Proxy Support',
    category: 'Interview Support',
    description: 'Proxy availability management, assignment engine, and proxy dashboard.',
    route: '#interviews-proxy',
    supportedActions: ['view', 'create', 'edit', 'manage', 'export'],
  },

  // System & Admin
  {
    id: 'team',
    label: 'Team Management',
    category: 'System & Admin',
    description: 'Manage team members, sales availability, leave dates, and SMTP setup.',
    route: '#team',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  {
    id: 'permissions_management',
    label: 'Permissions Management',
    category: 'System & Admin',
    description: 'Centralized role-based permissions matrix and access control (Admin Only).',
    route: '#permissions-management',
    supportedActions: ['view', 'edit', 'manage'],
  },
  {
    id: 'receipt',
    label: 'Receipts & Billing',
    category: 'System & Admin',
    description: 'Candidate payments, payment agreements, and financial receipts.',
    route: '#receipt',
    supportedActions: ['view', 'create', 'edit', 'manage', 'export'],
  },
  {
    id: 'feature_alerts',
    label: 'Feature Announcements',
    category: 'System & Admin',
    description: 'System release notes, feature updates, and platform announcements.',
    route: '#feature-alerts',
    supportedActions: ['view'],
  },

  // Aurrum Careers
  {
    id: 'aurrum_careers',
    label: 'Aurrum Careers Modules',
    category: 'Aurrum Careers',
    description: 'Aurrum-branded candidate intake, sales pipeline, and interviews.',
    route: '#aurrum-dashboard',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
];

export const ALL_ROLES: { role: Role; label: string; group: 'Administration' | 'Management' | 'Operations' | 'External' | 'Aurrum' }[] = [
  { role: 'administrator', label: 'Administrator', group: 'Administration' },
  { role: 'jpc_sysadmin', label: 'System Admin', group: 'Administration' },
  { role: 'jpc_manager', label: 'Auriic Manager', group: 'Management' },
  { role: 'jpc_cs', label: 'Compliance Head', group: 'Management' },
  { role: 'jpc_marketing', label: 'Marketing Leader (TL)', group: 'Management' },
  { role: 'jpc_sales', label: 'Sales Team', group: 'Operations' },
  { role: 'jpc_lead_gen', label: 'Lead Generation', group: 'Operations' },
  { role: 'jpc_compliance_person', label: 'Compliance Person', group: 'Operations' },
  { role: 'jpc_resume', label: 'Resume Team', group: 'Operations' },
  { role: 'jpc_recruiter', label: 'Recruiter', group: 'Operations' },
  { role: 'jpc_marketing_support', label: 'Marketing Support', group: 'Operations' },
  { role: 'jpc_proxy', label: 'Proxy Team', group: 'Operations' },
  { role: 'jpc_candidate', label: 'Candidate User', group: 'External' },
  { role: 'candidate', label: 'Candidate', group: 'External' },
  { role: 'aurrum_admin', label: 'Aurrum Admin', group: 'Aurrum' },
  { role: 'aurrum_sales', label: 'Aurrum Sales', group: 'Aurrum' },
  { role: 'aurrum_team', label: 'Aurrum Team', group: 'Aurrum' },
];

/**
 * Creates a role permission mapping using module IDs.
 */
const buildRolePermissions = (
  rules: Record<string, Partial<ModulePermission>>
): Record<string, ModulePermission> => {
  const result: Record<string, ModulePermission> = {};
  for (const mod of APP_MODULES) {
    const base = createEmptyModulePermission();
    if (rules[mod.id]) {
      result[mod.id] = { ...base, ...rules[mod.id] };
    } else {
      result[mod.id] = base;
    }
  }
  return result;
};

/**
 * Build full permission set for administrators (all modules true).
 */
const buildAdminPermissions = (): Record<string, ModulePermission> => {
  const result: Record<string, ModulePermission> = {};
  for (const mod of APP_MODULES) {
    result[mod.id] = createFullModulePermission();
  }
  return result;
};

/**
 * Default System Role Permissions
 * Exactly mirrors baseline production functionality.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<string, ModulePermission>> = {
  administrator: buildAdminPermissions(),
  jpc_sysadmin: buildAdminPermissions(),

  jpc_manager: buildRolePermissions({
    dashboard: { view: true, export: true },
    crm_dashboard: { view: true, create: true, edit: true, delete: true, manage: true, export: true },
    pipeline: { view: true, create: true, edit: true, delete: true, manage: true, export: true },
    candidates: { view: true, create: true, edit: true, delete: true, manage: true, export: true },
    followups: { view: true, create: true, edit: true, manage: true, export: true },
    not_interested: { view: true, edit: true, delete: true, export: true },
    not_eligible: { view: true, edit: true, delete: true, export: true },
    app_tracker: { view: true, create: true, edit: true, manage: true, export: true },
    resume_log: { view: true, create: true, edit: true, manage: true, export: true },
    resume_prep: { view: true, create: true, edit: true, manage: true, export: true },
    rtr_log: { view: true, create: true, edit: true, manage: true, export: true },
    target_compliance: { view: true, edit: true, manage: true, export: true },
    cv_repository: { view: true, create: true, edit: true, export: true },
    domain_resumes: { view: true, create: true, edit: true, export: true },
    interview_support: { view: true, create: true, edit: true, manage: true, export: true },
    proxy_support: { view: true, create: true, edit: true, manage: true, export: true },
    team: { view: true, create: true, edit: true, manage: true, export: true },
    receipt: { view: true, create: true, edit: true, manage: true, export: true },
    feature_alerts: { view: true },
    aurrum_careers: { view: true, create: true, edit: true, manage: true, export: true },
  }),

  jpc_sales: buildRolePermissions({
    dashboard: { view: true },
    pipeline: { view: true, edit: true },
    candidates: { view: true, create: true, edit: true },
    followups: { view: true, create: true, edit: true },
    not_interested: { view: true, edit: true },
    not_eligible: { view: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_lead_gen: buildRolePermissions({
    dashboard: { view: true },
    candidates: { view: true, create: true },
    followups: { view: true, create: true, edit: true },
    not_interested: { view: true, edit: true },
    not_eligible: { view: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_cs: buildRolePermissions({
    dashboard: { view: true },
    crm_dashboard: { view: true },
    pipeline: { view: true, edit: true, manage: true },
    candidates: { view: true, edit: true, manage: true },
    followups: { view: true, create: true, edit: true },
    app_tracker: { view: true, create: true, edit: true, manage: true },
    resume_log: { view: true, create: true, edit: true, manage: true },
    resume_prep: { view: true, create: true, edit: true, manage: true },
    rtr_log: { view: true, create: true, edit: true, manage: true },
    target_compliance: { view: true, edit: true, manage: true, export: true },
    cv_repository: { view: true, create: true, edit: true },
    domain_resumes: { view: true, create: true, edit: true },
    interview_support: { view: true, create: true, edit: true, manage: true },
    proxy_support: { view: true, create: true, edit: true },
    team: { view: true },
    receipt: { view: true, create: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_compliance_person: buildRolePermissions({
    dashboard: { view: true },
    crm_dashboard: { view: true },
    pipeline: { view: true, edit: true },
    candidates: { view: true, edit: true },
    followups: { view: true, create: true, edit: true },
    app_tracker: { view: true, create: true, edit: true },
    resume_log: { view: true, create: true, edit: true },
    resume_prep: { view: true, create: true, edit: true },
    rtr_log: { view: true, create: true, edit: true },
    target_compliance: { view: true, edit: true, export: true },
    cv_repository: { view: true, create: true, edit: true },
    domain_resumes: { view: true, create: true, edit: true },
    interview_support: { view: true, create: true, edit: true },
    proxy_support: { view: true, create: true, edit: true },
    receipt: { view: true, create: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_resume: buildRolePermissions({
    dashboard: { view: true },
    pipeline: { view: true, edit: true },
    candidates: { view: true, edit: true },
    resume_log: { view: true, create: true, edit: true },
    resume_prep: { view: true, create: true, edit: true },
    cv_repository: { view: true, create: true, edit: true },
    domain_resumes: { view: true, create: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_recruiter: buildRolePermissions({
    dashboard: { view: true },
    pipeline: { view: true, edit: true },
    candidates: { view: true, edit: true },
    app_tracker: { view: true, create: true, edit: true },
    resume_log: { view: true, create: true },
    resume_prep: { view: true, create: true },
    rtr_log: { view: true, create: true },
    domain_resumes: { view: true },
    interview_support: { view: true, create: true },
    feature_alerts: { view: true },
  }),

  jpc_marketing: buildRolePermissions({
    dashboard: { view: true },
    pipeline: { view: true, edit: true, manage: true },
    candidates: { view: true, edit: true, manage: true },
    app_tracker: { view: true, create: true, edit: true, manage: true },
    resume_log: { view: true, create: true, edit: true, manage: true },
    resume_prep: { view: true, create: true, edit: true, manage: true },
    rtr_log: { view: true, create: true, edit: true, manage: true },
    cv_repository: { view: true, create: true, edit: true },
    domain_resumes: { view: true, create: true, edit: true },
    interview_support: { view: true, create: true, edit: true },
    team: { view: true },
    feature_alerts: { view: true },
  }),

  jpc_marketing_support: buildRolePermissions({
    dashboard: { view: true },
    pipeline: { view: true, edit: true },
    candidates: { view: true, edit: true },
    followups: { view: true, create: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_proxy: buildRolePermissions({
    dashboard: { view: true },
    interview_support: { view: true, create: true, edit: true },
    proxy_support: { view: true, create: true, edit: true },
    feature_alerts: { view: true },
  }),

  jpc_candidate: buildRolePermissions({
    dashboard: { view: true },
    candidates: { view: true },
    receipt: { view: true },
  }),

  candidate: buildRolePermissions({
    dashboard: { view: true },
    candidates: { view: true },
    receipt: { view: true },
  }),

  aurrum_admin: buildRolePermissions({
    dashboard: { view: true },
    aurrum_careers: { view: true, create: true, edit: true, delete: true, manage: true, export: true },
    receipt: { view: true, create: true, edit: true },
  }),

  aurrum_sales: buildRolePermissions({
    dashboard: { view: true },
    aurrum_careers: { view: true, create: true, edit: true },
    receipt: { view: true },
  }),

  aurrum_team: buildRolePermissions({
    dashboard: { view: true },
    aurrum_careers: { view: true, create: true, edit: true, export: true },
    receipt: { view: true },
  }),
};
