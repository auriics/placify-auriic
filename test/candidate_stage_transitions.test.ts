import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  STAGES, 
  BASE_TRANSITIONS, 
  TRANSITIONS, 
  BASE_PREVIOUS_STAGES, 
  PREVIOUS_STAGES, 
  ROLE_PERMISSIONS, 
  normalizeStage, 
  normalizeCandidateStage 
} from '../src/constants';
import { canUserAccessCandidate } from '../src/lib/permissions';
import { Candidate, User } from '../src/types';

test('1. normalizeStage and normalizeCandidateStage accuracy', () => {
  // Exact standard stages
  assert.equal(normalizeStage('application_tracking'), 'application_tracking');
  assert.equal(normalizeStage('marketing_active'), 'marketing_active');
  assert.equal(normalizeStage('interviewing'), 'interviewing');
  assert.equal(normalizeStage('lead_generation'), 'lead_generation');

  // Case insensitive and spaces
  assert.equal(normalizeStage('Application Tracking'), 'application_tracking');
  assert.equal(normalizeStage('  app tracking  '), 'application_tracking');
  assert.equal(normalizeStage('MARKETING ACTIVE'), 'marketing_active');
  assert.equal(normalizeStage('Interviewing'), 'interviewing');

  // Prefixes like "12. App Tracking"
  assert.equal(normalizeStage('12. App Tracking'), 'application_tracking');
  assert.equal(normalizeStage('11. Interviewing'), 'interviewing');
  assert.equal(normalizeStage('10. Marketing Active'), 'marketing_active');
  assert.equal(normalizeStage('1. Lead Generation'), 'lead_generation');

  // Null, undefined, empty defaults to lead_generation
  assert.equal(normalizeStage(null), 'lead_generation');
  assert.equal(normalizeStage(undefined), 'lead_generation');
  assert.equal(normalizeStage(''), 'lead_generation');

  // normalizeCandidateStage matches normalizeStage
  assert.equal(normalizeCandidateStage('12. App Tracking'), 'application_tracking');
  assert.equal(normalizeCandidateStage('application_tracking'), 'application_tracking');
});

test('2. Stage Transitions: application_tracking is NOT a dead end', () => {
  // Base transitions for application_tracking must contain forward and lateral steps
  const baseAppTransitions = BASE_TRANSITIONS['application_tracking'];
  assert.ok(Array.isArray(baseAppTransitions), 'BASE_TRANSITIONS.application_tracking must be an array');
  assert.ok(baseAppTransitions.includes('interviewing'), 'Must be able to transition to interviewing');
  assert.ok(baseAppTransitions.includes('marketing_active'), 'Must be able to transition to marketing_active');
  assert.ok(baseAppTransitions.includes('backout'), 'Must be able to transition to backout');
  assert.ok(baseAppTransitions.includes('marketing_inactive'), 'Must be able to transition to marketing_inactive');

  // interviewing must be able to transition to application_tracking and marketing_active
  const baseInterviewTransitions = BASE_TRANSITIONS['interviewing'];
  assert.ok(baseInterviewTransitions.includes('application_tracking'), 'interviewing must transition to application_tracking');
  assert.ok(baseInterviewTransitions.includes('marketing_active'), 'interviewing must transition to marketing_active');

  // marketing_active must be able to transition to application_tracking
  const baseMarketingTransitions = BASE_TRANSITIONS['marketing_active'];
  assert.ok(baseMarketingTransitions.includes('application_tracking'), 'marketing_active must transition to application_tracking');

  // Dynamic TRANSITIONS proxy must return active stages
  const activeTransitions = TRANSITIONS['application_tracking'];
  assert.ok(activeTransitions.includes('interviewing'));
  assert.ok(activeTransitions.includes('marketing_active'));
});

test('3. Previous Stages: application_tracking undo support', () => {
  assert.equal(BASE_PREVIOUS_STAGES['application_tracking'], 'interviewing');
  assert.equal(PREVIOUS_STAGES['application_tracking'], 'interviewing');
});

test('4. ROLE_PERMISSIONS: allowedStages covers application_tracking and marketing_active', () => {
  // Recruiter
  const recruiterStages = ROLE_PERMISSIONS['jpc_recruiter'].allowedStages as string[];
  assert.ok(recruiterStages.includes('application_tracking'), 'recruiter must have application_tracking');
  assert.ok(recruiterStages.includes('marketing_active'), 'recruiter must have marketing_active');

  // Marketing
  const marketingStages = ROLE_PERMISSIONS['jpc_marketing'].allowedStages as string[];
  assert.ok(marketingStages.includes('application_tracking'), 'marketing must have application_tracking');

  // Aurrum roles
  const aurrumAdminStages = ROLE_PERMISSIONS['aurrum_admin'].allowedStages as string[];
  assert.ok(aurrumAdminStages.includes('application_tracking'), 'aurrum_admin must have application_tracking');
  assert.ok(aurrumAdminStages.includes('marketing_active'), 'aurrum_admin must have marketing_active');

  // Administrators and CS have ALL
  assert.equal(ROLE_PERMISSIONS['administrator'].allowedStages, 'ALL');
  assert.equal(ROLE_PERMISSIONS['jpc_manager'].allowedStages, 'ALL');
  assert.equal(ROLE_PERMISSIONS['jpc_cs'].allowedStages, 'ALL');
});

test('5. App Tracker Eligibility and Filtering logic for Sai Siddarth Vakacherla', () => {
  const targetCandidate: Candidate = {
    id: 'cand_sai_siddarth_123',
    full_name: 'Sai Siddarth Vakacherla',
    phone: '+1 234 567 8900',
    email: 'sai.siddarth@example.com',
    whatsapp: '+1 234 567 8900',
    job_interest: 'Full Stack Java Developer',
    current_stage: 'application_tracking',
    assigned_recruiter: 'recruiter_456',
    crm_brand: 'auriic'
  };

  const adminUser: User = {
    id: 'admin_1',
    name: 'Administrator',
    role: 'administrator',
    email: 'admin@auriic.co'
  };

  const recruiterUser: User = {
    id: 'recruiter_456',
    name: 'John Recruiter',
    role: 'jpc_recruiter',
    email: 'john@auriic.co'
  };

  // Eligibility check function from AppTracker
  const isEligibleStage = (c: Candidate) => {
    const s = normalizeStage(c.current_stage);
    return (
      s === 'application_tracking' ||
      s === 'marketing_active' ||
      s === 'interviewing' ||
      s === 'marketing_inactive' ||
      s === 'offer' ||
      s === 'backout' ||
      s === 'completed'
    );
  };

  assert.equal(isEligibleStage(targetCandidate), true, 'Sai Siddarth Vakacherla in application_tracking must be eligible');

  // Permissions check
  assert.equal(canUserAccessCandidate(targetCandidate, adminUser, []), true, 'Admin can access candidate');
  assert.equal(canUserAccessCandidate(targetCandidate, recruiterUser, []), true, 'Assigned recruiter can access candidate');

  // Multi-token search simulation matching AppTracker filterOption
  const searchQueries = [
    'Sai Siddarth Vakacherla',
    'Sai Siddarth',
    'Sai Vakacherla',
    'siddarth',
    'Vakacherla',
    'cand_sai_siddarth_123',
    '234 567'
  ];

  const targetText = `${targetCandidate.full_name} ${targetCandidate.id} ${targetCandidate.email} ${targetCandidate.phone}`.toLowerCase();

  for (const q of searchQueries) {
    const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = tokens.every(token => targetText.includes(token));
    assert.equal(matches, true, `Query "${q}" must match candidate`);
  }
});
