import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isOfferStageDisabled, 
  isCompletedStageDisabled, 
  isPaymentsRevenueDisabled, 
  isStageDisabled 
} from '../src/lib/featureFlags';
import { 
  STAGES, 
  getActiveStages, 
  TRANSITIONS, 
  PREVIOUS_STAGES, 
  BASE_TRANSITIONS, 
  BASE_PREVIOUS_STAGES 
} from '../src/constants';

test('Feature Flags: ON Mode (Flags set to true)', () => {
  // Set env vars to true
  process.env.DISABLE_OFFER_STAGE = 'true';
  process.env.DISABLE_COMPLETED_STAGE = 'true';
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';

  // 1. Verify flag getters
  assert.equal(isOfferStageDisabled(), true, 'isOfferStageDisabled should be true');
  assert.equal(isCompletedStageDisabled(), true, 'isCompletedStageDisabled should be true');
  assert.equal(isPaymentsRevenueDisabled(), true, 'isPaymentsRevenueDisabled should be true');

  // 2. Verify stage disabling helper
  assert.equal(isStageDisabled('offer'), true, 'offer stage must be disabled');
  assert.equal(isStageDisabled('completed'), true, 'completed stage must be disabled');
  assert.equal(isStageDisabled('sales'), false, 'sales stage must remain active');
  assert.equal(isStageDisabled('interviewing'), false, 'interviewing stage must remain active');

  // 3. Verify getActiveStages() excludes offer & completed
  const activeStages = getActiveStages();
  assert.equal('offer' in activeStages, false, 'active stages must not contain offer');
  assert.equal('completed' in activeStages, false, 'active stages must not contain completed');
  assert.equal('sales' in activeStages, true, 'active stages must contain sales');

  // 4. Verify TRANSITIONS proxy filters out offer & completed
  const interviewingTransitions = TRANSITIONS['interviewing'];
  assert.equal(interviewingTransitions.includes('offer'), false, 'interviewing transitions must not contain offer');
  assert.equal(interviewingTransitions.includes('completed'), false, 'interviewing transitions must not contain completed');

  const marketingActiveTransitions = TRANSITIONS['marketing_active'];
  assert.equal(marketingActiveTransitions.includes('offer'), false, 'marketing_active transitions must not contain offer');
  assert.equal(marketingActiveTransitions.includes('completed'), false, 'marketing_active transitions must not contain completed');

  // 5. Verify PREVIOUS_STAGES proxy prevents moving back to disabled stages
  assert.equal(PREVIOUS_STAGES['backout'], null, 'backout cannot revert to disabled offer stage');
  assert.equal(PREVIOUS_STAGES['offer'], null, 'disabled offer cannot revert to previous stage');
});

test('Feature Flags: OFF Mode (Flags set to false / restored)', () => {
  // Set env vars to false
  process.env.DISABLE_OFFER_STAGE = 'false';
  process.env.DISABLE_COMPLETED_STAGE = 'false';
  process.env.DISABLE_PAYMENTS_REVENUE = 'false';

  // 1. Verify flag getters
  assert.equal(isOfferStageDisabled(), false, 'isOfferStageDisabled should be false');
  assert.equal(isCompletedStageDisabled(), false, 'isCompletedStageDisabled should be false');
  assert.equal(isPaymentsRevenueDisabled(), false, 'isPaymentsRevenueDisabled should be false');

  // 2. Verify stage disabling helper
  assert.equal(isStageDisabled('offer'), false, 'offer stage must be enabled');
  assert.equal(isStageDisabled('completed'), false, 'completed stage must be enabled');
  assert.equal(isStageDisabled('sales'), false, 'sales stage must be enabled');

  // 3. Verify getActiveStages() includes offer & completed
  const activeStages = getActiveStages();
  assert.equal('offer' in activeStages, true, 'active stages must contain offer');
  assert.equal('completed' in activeStages, true, 'active stages must contain completed');
  assert.equal('sales' in activeStages, true, 'active stages must contain sales');

  // 4. Verify TRANSITIONS proxy restores offer & completed
  const interviewingTransitions = TRANSITIONS['interviewing'];
  assert.equal(interviewingTransitions.includes('offer'), true, 'interviewing transitions must restore offer');

  const marketingActiveTransitions = TRANSITIONS['marketing_active'];
  assert.equal(marketingActiveTransitions.includes('offer'), true, 'marketing_active transitions must restore offer');
  assert.equal(marketingActiveTransitions.includes('completed'), true, 'marketing_active transitions must restore completed');

  // 5. Verify PREVIOUS_STAGES proxy restores original previous stages
  assert.equal(PREVIOUS_STAGES['offer'], 'interviewing', 'offer reverts to interviewing');
  assert.equal(PREVIOUS_STAGES['completed'], 'marketing_active', 'completed reverts to marketing_active');
});

test('Feature Flags: Dynamic Toggle without code changes', () => {
  // Dynamically turn ON
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';
  process.env.DISABLE_OFFER_STAGE = 'true';
  process.env.DISABLE_COMPLETED_STAGE = 'true';

  assert.equal(isPaymentsRevenueDisabled(), true);
  assert.equal(TRANSITIONS['interviewing'].includes('offer'), false);

  // Dynamically turn OFF
  process.env.DISABLE_PAYMENTS_REVENUE = 'false';
  process.env.DISABLE_OFFER_STAGE = 'false';
  process.env.DISABLE_COMPLETED_STAGE = 'false';

  assert.equal(isPaymentsRevenueDisabled(), false);
  assert.equal(TRANSITIONS['interviewing'].includes('offer'), true);
  assert.equal(TRANSITIONS['marketing_active'].includes('completed'), true);
});
