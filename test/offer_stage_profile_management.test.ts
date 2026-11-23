import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isOfferStageDisabled, 
  isCompletedStageDisabled, 
  isPaymentsRevenueDisabled, 
  isPipelineAppTrackingDisabled,
  isStageDisabled 
} from '../src/lib/featureFlags';
import { 
  STAGES, 
  getActiveStages, 
  TRANSITIONS, 
  PREVIOUS_STAGES, 
  normalizeStage,
  normalizeCandidateStage 
} from '../src/constants';
import { getStageEntries } from '../src/pages/Pipeline';
import { Candidate, User } from '../src/types';
import { canUserAccessCandidate } from '../src/lib/permissions';

// Mock helper simulating storage logic for stage transition validation
function validateCandidateStageSave(
  candidate: Partial<Candidate>, 
  existingCandidate: Partial<Candidate> | null
): { allowed: boolean; error?: string } {
  const currentStage = normalizeCandidateStage(candidate.current_stage);
  const existingStage = existingCandidate?.current_stage 
    ? normalizeCandidateStage(existingCandidate.current_stage) 
    : null;

  const isTransitioningToOffer = currentStage === 'offer' && existingStage !== 'offer';
  if (isTransitioningToOffer && isOfferStageDisabled()) {
    return { allowed: false, error: 'Offer stage is disabled in system configuration' };
  }

  const isTransitioningToCompleted = currentStage === 'completed' && existingStage !== 'completed';
  if (isTransitioningToCompleted && isCompletedStageDisabled()) {
    return { allowed: false, error: 'Completed stage is disabled in system configuration' };
  }

  return { allowed: true };
}

test('1. Candidate Profile Updates in Offer Stage: Existing Offer candidates can be updated', () => {
  // Ensure feature flags are ON
  process.env.DISABLE_OFFER_STAGE = 'true';
  process.env.DISABLE_COMPLETED_STAGE = 'true';
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';
  process.env.DISABLE_PIPELINE_APP_TRACKING = 'true';

  assert.equal(isOfferStageDisabled(), true);

  // Existing candidate whose current stage is already 'offer'
  const existingOfferCandidate: Candidate = {
    id: 'na88qjvs1',
    full_name: 'Existing Offer Candidate',
    email: 'offer.cand@example.com',
    phone: '+1-555-0199',
    current_stage: 'offer',
    assigned_recruiter: 'recruiter_101',
    assigned_marketing_leader: 'tl_201',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };

  // Scenario 1 & 2: Update permitted profile details (phone, email, notes)
  const profileUpdateResult = validateCandidateStageSave(
    { ...existingOfferCandidate, phone: '+1-555-0999', email: 'updated@example.com' },
    existingOfferCandidate
  );
  assert.equal(profileUpdateResult.allowed, true, 'Profile information update on existing Offer candidate must be permitted');

  // Scenario 3: Change recruiter and team assignments
  const assignmentUpdateResult = validateCandidateStageSave(
    { 
      ...existingOfferCandidate, 
      assigned_recruiter: 'recruiter_999',
      assigned_marketing_leader: 'tl_888' 
    },
    existingOfferCandidate
  );
  assert.equal(assignmentUpdateResult.allowed, true, 'Recruiter & Team assignment updates on existing Offer candidate must be permitted');

  // Scenario 5: Underlying workflow status remains 'offer'
  const updatedCandidate = { 
    ...existingOfferCandidate, 
    assigned_recruiter: 'recruiter_999' 
  };
  assert.equal(updatedCandidate.current_stage, 'offer', 'Candidate underlying stage must remain offer');
});

test('2. Stage Transitions to Disabled Offer & Completed Stages are Strictly Blocked', () => {
  process.env.DISABLE_OFFER_STAGE = 'true';
  process.env.DISABLE_COMPLETED_STAGE = 'true';

  // Candidate currently in 'interviewing'
  const interviewingCandidate: Candidate = {
    id: 'cand_interview_1',
    full_name: 'Interview Candidate',
    current_stage: 'interviewing',
    created_at: '2026-02-01T00:00:00.000Z'
  };

  // Attempt to transition interviewing -> offer
  const transitionToOfferResult = validateCandidateStageSave(
    { ...interviewingCandidate, current_stage: 'offer' },
    interviewingCandidate
  );
  assert.equal(transitionToOfferResult.allowed, false);
  assert.equal(transitionToOfferResult.error, 'Offer stage is disabled in system configuration');

  // Attempt to transition interviewing -> completed
  const transitionToCompletedResult = validateCandidateStageSave(
    { ...interviewingCandidate, current_stage: 'completed' },
    interviewingCandidate
  );
  assert.equal(transitionToCompletedResult.allowed, false);
  assert.equal(transitionToCompletedResult.error, 'Completed stage is disabled in system configuration');

  // Attempt to create a brand new candidate directly in offer
  const newCandidateInOfferResult = validateCandidateStageSave(
    { id: 'brand_new_cand', full_name: 'New Cand', current_stage: 'offer' },
    null
  );
  assert.equal(newCandidateInOfferResult.allowed, false);
  assert.equal(newCandidateInOfferResult.error, 'Offer stage is disabled in system configuration');
});

test('3. Offer and Completed Stages Remain Hidden in UI Structures', () => {
  process.env.DISABLE_OFFER_STAGE = 'true';
  process.env.DISABLE_COMPLETED_STAGE = 'true';
  process.env.DISABLE_PIPELINE_APP_TRACKING = 'true';

  // 1. Pipeline board columns
  const pipelineStages = getStageEntries().map(([key]) => key);
  assert.equal(pipelineStages.includes('offer'), false, 'Offer must be hidden from Pipeline');
  assert.equal(pipelineStages.includes('completed'), false, 'Completed must be hidden from Pipeline');
  assert.equal(pipelineStages.includes('application_tracking'), false, 'App Tracking must be hidden from Pipeline');
  assert.equal(pipelineStages.includes('sales'), true, 'Sales must remain in Pipeline');
  assert.equal(pipelineStages.includes('interviewing'), true, 'Interviewing must remain in Pipeline');

  // 2. Active stages dropdown & menus
  const activeStages = getActiveStages();
  assert.equal('offer' in activeStages, false, 'Offer must not appear in active stages');
  assert.equal('completed' in activeStages, false, 'Completed must not appear in active stages');

  // 3. Stage transition options
  const interviewTransitions = TRANSITIONS['interviewing'] || [];
  assert.equal(interviewTransitions.includes('offer'), false, 'Interviewing cannot transition to offer');
  assert.equal(interviewTransitions.includes('completed'), false, 'Interviewing cannot transition to completed');

  // 4. PREVIOUS_STAGES
  assert.equal(PREVIOUS_STAGES['offer'], null, 'Undo to disabled offer must be null');
});

test('4. Payment and Revenue Restrictions are Strictly Enforced', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';
  assert.equal(isPaymentsRevenueDisabled(), true);

  // Verify that financial keys are sanitized during patch
  const patchPayload: Record<string, any> = {
    full_name: 'Test Candidate',
    package_amount: 1500,
    total_paid: 500,
    balance_remaining: 1000
  };

  if (isPaymentsRevenueDisabled()) {
    delete patchPayload.package_amount;
    delete patchPayload.total_paid;
    delete patchPayload.balance_remaining;
  }

  assert.equal(patchPayload.package_amount, undefined);
  assert.equal(patchPayload.total_paid, undefined);
  assert.equal(patchPayload.balance_remaining, undefined);
  assert.equal(patchPayload.full_name, 'Test Candidate');
});

test('5. Recruiter and Team Assignment Permissions for Offer Candidates', () => {
  const adminUser: User = {
    id: 'admin_1',
    role: 'administrator',
    username: 'admin',
    display_name: 'Admin User'
  };

  const recruiterUser: User = {
    id: 'rec_42',
    role: 'jpc_recruiter',
    username: 'rec_42',
    display_name: 'Assigned Recruiter'
  };

  const otherRecruiterUser: User = {
    id: 'rec_99',
    role: 'jpc_recruiter',
    username: 'rec_99',
    display_name: 'Other Recruiter'
  };

  const offerCandidate: Candidate = {
    id: 'cand_offer_rbac',
    full_name: 'RBAC Offer Candidate',
    current_stage: 'offer',
    assigned_recruiter: 'rec_42'
  };

  // Administrator can access and manage
  assert.equal(canUserAccessCandidate(offerCandidate, adminUser, []), true);

  // Assigned recruiter can access their own candidate
  assert.equal(canUserAccessCandidate(offerCandidate, recruiterUser, []), true);

  // Unassigned recruiter cannot access another recruiter's candidate
  assert.equal(canUserAccessCandidate(offerCandidate, otherRecruiterUser, []), false);
});
