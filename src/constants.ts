import { Stage, Role, CandidateFlags } from './types';
import { isStageDisabled } from './lib/featureFlags';

export const STAGES: Record<Stage, { label: string; color: string; icon: string }> = {
  lead_generation:     { label: '1. Lead Generation',      color: '#3B82F6', icon: '◎' },
  sales:               { label: '2. Sales',                color: '#10B981', icon: '◈' },
  cs_qc:               { label: '3. CS QC Call',          color: '#8B5CF6', icon: '◉' },
  marketing_leader:    { label: '4. Marketing Leader',     color: '#059669', icon: '◆' },
  cs_strategy_check:   { label: '5. CS Strategy Check',    color: '#8B5CF6', icon: '◉' },
  resume_team:         { label: '6. Resume Team',          color: '#F59E0B', icon: '◐' },
  cs_assign_recruiter: { label: '7. CS Assign Recruiter', color: '#8B5CF6', icon: '◉' },
  recruiter:           { label: '8. Recruiter',            color: '#3B82F6', icon: '◎' },
  sys_admin:           { label: '9. System Admin',         color: '#64748B', icon: '◧' },
  marketing_active:    { label: '10. Marketing Active',     color: '#059669', icon: '◆' },
  marketing_inactive:  { label: 'Marketing Inactive',      color: '#F43F5E', icon: '⏸' },
  interviewing:        { label: '11. Interviewing',        color: '#8B5CF6', icon: '◉' },
  application_tracking: { label: '12. App Tracking',       color: '#3B82F6', icon: '◎' },
  offer:               { label: 'Offer',                   color: '#10B981', icon: '✉' },
  backout:             { label: 'Backout',                 color: '#6B7280', icon: '↩' },
  completed:           { label: 'Completed',               color: '#10B981', icon: '✓' },
  not_eligible:        { label: 'Not Eligible',            color: '#F43F5E', icon: '⊘' },
  not_interested:      { label: 'Not Interested',          color: '#6B7280', icon: '✕' },
};

export const getActiveStages = (): Record<Stage, { label: string; color: string; icon: string }> => {
  const result: any = {};
  for (const [key, val] of Object.entries(STAGES)) {
    if (!isStageDisabled(key)) {
      result[key as Stage] = val;
    }
  }
  return result;
};

export const normalizeStage = (rawStage?: string | null): Stage => {
  if (!rawStage) return 'lead_generation';
  const clean = String(rawStage).trim();
  if (clean in STAGES) return clean as Stage;

  const s = clean.toLowerCase().replace(/[\s-]+/g, '_');
  if (s in STAGES) return s as Stage;

  // Strip numeric prefixes like "1._" or "10._" or "12._"
  const stripped = s.replace(/^\d+[\._\s]+/, '');
  if (stripped in STAGES) return stripped as Stage;

  const aliases: Record<string, Stage> = {
    'lead': 'lead_generation',
    'lead_gen': 'lead_generation',
    'leads': 'lead_generation',
    'lead_generation': 'lead_generation',
    'sales': 'sales',
    'cs_qc': 'cs_qc',
    'qc': 'cs_qc',
    'csqc': 'cs_qc',
    'marketing_leader': 'marketing_leader',
    'cs_strategy_check': 'cs_strategy_check',
    'strategy': 'cs_strategy_check',
    'resume_team': 'resume_team',
    'resume': 'resume_team',
    'cs_assign_recruiter': 'cs_assign_recruiter',
    'assign_recruiter': 'cs_assign_recruiter',
    'recruiter': 'recruiter',
    'sys_admin': 'sys_admin',
    'system_admin': 'sys_admin',
    'admin': 'sys_admin',
    'marketing_active': 'marketing_active',
    'marketing': 'marketing_active',
    'active_marketing': 'marketing_active',
    'marketing_inactive': 'marketing_inactive',
    'inactive': 'marketing_inactive',
    'interview': 'interviewing',
    'interviewing': 'interviewing',
    'interviews': 'interviewing',
    'app_tracking': 'application_tracking',
    'application_tracking': 'application_tracking',
    'app_tracker': 'application_tracking',
    'apptracker': 'application_tracking',
    'application_tracker': 'application_tracking',
    'offer': 'offer',
    'backout': 'backout',
    'backed_out': 'backout',
    'completed': 'completed',
    'placed': 'completed',
    'not_eligible': 'not_eligible',
    'not_interested': 'not_interested',
  };

  if (aliases[s]) return aliases[s];
  if (aliases[stripped]) return aliases[stripped];

  for (const [key, val] of Object.entries(STAGES)) {
    const labelKey = val.label.toLowerCase().replace(/[\s-]+/g, '_');
    if (labelKey === s || labelKey.includes(s) || s.includes(labelKey)) {
      return key as Stage;
    }
  }

  return 'lead_generation';
};

export const BASE_TRANSITIONS: Record<Stage, Stage[]> = {
  lead_generation:     ['sales', 'not_eligible'],
  sales:               ['cs_qc', 'not_interested', 'not_eligible'],
  cs_qc:               ['marketing_leader'],
  marketing_leader:    ['cs_strategy_check'],
  cs_strategy_check:   ['resume_team'],
  resume_team:         ['cs_assign_recruiter'],
  cs_assign_recruiter: ['recruiter'],
  recruiter:           ['sys_admin'],
  sys_admin:           ['marketing_active'],
  marketing_active:    ['completed', 'marketing_inactive', 'offer', 'backout', 'interviewing', 'application_tracking'],
  marketing_inactive:  ['marketing_active'],
  interviewing:        ['offer', 'backout', 'application_tracking', 'marketing_active'],
  application_tracking: ['interviewing', 'marketing_active', 'offer', 'marketing_inactive', 'backout', 'completed'],
  offer:               ['completed', 'backout'],
  backout:             ['marketing_active', 'interviewing', 'application_tracking'],
  completed:           [],
  not_eligible:        ['lead_generation', 'sales'],
  not_interested:      ['lead_generation', 'sales'],
};

/**
 * Dynamic transitions proxy that automatically strips disabled stages (e.g. offer, completed).
 */
export const TRANSITIONS: Record<Stage, Stage[]> = new Proxy(BASE_TRANSITIONS, {
  get(target, prop: string) {
    const list = target[prop as Stage] || [];
    return list.filter((s: string) => !isStageDisabled(s));
  }
});

export const getActiveTransitions = (stage: Stage): Stage[] => {
  return (BASE_TRANSITIONS[stage] || []).filter(s => !isStageDisabled(s));
};

// Maps a stage to its logical previous stage, allowing users to move a candidate back if moved by mistake
export const BASE_PREVIOUS_STAGES: Record<Stage, Stage | null> = {
  lead_generation:     null,
  sales:               'lead_generation',
  cs_qc:               'sales',
  marketing_leader:    'cs_qc',
  cs_strategy_check:   'marketing_leader',
  resume_team:         'cs_strategy_check',
  cs_assign_recruiter: 'resume_team',
  recruiter:           'cs_assign_recruiter',
  sys_admin:           'recruiter',
  marketing_active:    'sys_admin',
  marketing_inactive:  'marketing_active',
  interviewing:        'marketing_active',
  application_tracking: 'interviewing',
  offer:               'interviewing',
  backout:             'offer',
  completed:           'marketing_active',
  not_eligible:        'sales',
  not_interested:      'sales',
};

export const PREVIOUS_STAGES: Record<Stage, Stage | null> = new Proxy(BASE_PREVIOUS_STAGES, {
  get(target, prop: string) {
    if (isStageDisabled(prop)) {
      return null;
    }
    const prev = target[prop as Stage];
    if (prev && isStageDisabled(prev)) {
      return null;
    }
    return prev ?? null;
  }
});

export const ROLE_PERMISSIONS: Record<Role, { allowedStages: Stage[] | 'ALL'; adminFeatures?: boolean; teamManagement?: boolean }> = {
  administrator: { allowedStages: 'ALL', adminFeatures: true, teamManagement: true },
  jpc_manager: { allowedStages: 'ALL', teamManagement: true },
  jpc_sysadmin: { allowedStages: 'ALL', adminFeatures: true, teamManagement: true },
  jpc_lead_gen: { allowedStages: ['lead_generation', 'not_eligible'] },
  jpc_sales: { allowedStages: ['lead_generation', 'sales', 'not_interested', 'not_eligible'] },
  jpc_cs: { allowedStages: 'ALL' },
  jpc_compliance_person: { allowedStages: 'ALL' },
  jpc_resume: { allowedStages: ['resume_team', 'marketing_active', 'application_tracking', 'interviewing'] },
  jpc_marketing: { allowedStages: ['marketing_leader', 'marketing_active', 'marketing_inactive', 'application_tracking', 'interviewing'] },
  jpc_marketing_support: { allowedStages: ['marketing_active', 'marketing_inactive', 'application_tracking', 'interviewing'] },
  jpc_recruiter: { allowedStages: ['recruiter', 'sys_admin', 'marketing_active', 'marketing_inactive', 'application_tracking', 'interviewing'] },
  jpc_proxy: { allowedStages: 'ALL' },
  jpc_candidate: { allowedStages: [] },
  candidate: { allowedStages: [] },
  aurrum_admin: { allowedStages: ['lead_generation', 'sales', 'marketing_active', 'application_tracking', 'interviewing', 'offer', 'completed', 'not_interested', 'not_eligible'], teamManagement: true },
  aurrum_sales: { allowedStages: ['lead_generation', 'sales', 'marketing_active', 'application_tracking', 'interviewing', 'not_interested', 'not_eligible'] },
  aurrum_team: { allowedStages: ['lead_generation', 'sales', 'marketing_active', 'application_tracking', 'interviewing', 'offer', 'completed', 'not_interested', 'not_eligible'] },
};

export const LEAD_SOURCES = [
  'Facebook', 'Instagram', 'Google Ads', 'Referral', 'Walk-in', 'WhatsApp', 'LinkedIn', 'Event', 'Self Lead', 'Other'
];

export const QC_CHECKLIST_TEMPLATE = [
  { key: 'name_verified', label: 'Full name verified' },
  { key: 'phone_verified', label: 'Phone number verified' },
  { key: 'email_verified', label: 'Email address verified' },
  { key: 'job_interest_conf', label: 'Job interest confirmed' },
  { key: 'package_explained', label: 'Package explained to candidate' },
  { key: 'payment_plan_conf', label: 'Payment plan confirmed' },
  { key: 'promises_discussed', label: 'Promises discussed' },
  { key: 'agreement_ready', label: 'Agreement ready to send' },
];

export const DEFAULT_CANDIDATE_FLAGS: CandidateFlags = {
  agreement_sent: false,
  agreement_signed: false,
  qc_checklist_done: false,
  resume_approved: false,
  candidate_resume_approved: false,
  marketing_email_created: false,
  two_step_verification: false,
  linkedin_optimized: false,
  marketing_started: false,
  sla_timeout_notified: false,
  marketing_strategy_done: false,
  resume_briefing_call_done: false,
};

export const normalizeCandidateFlags = (flags?: Partial<CandidateFlags> | null): CandidateFlags => {
  return {
    ...DEFAULT_CANDIDATE_FLAGS,
    ...(flags || {}),
  };
};

export const normalizeCandidateStage = (stage?: any): Stage => {
  return normalizeStage(stage);
};
