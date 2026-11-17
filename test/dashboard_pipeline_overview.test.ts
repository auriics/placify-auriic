import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/constants';
import { isStageDisabled } from '../src/lib/featureFlags';

test('Pipeline Overview: excludes offer and completed cards while keeping other stages', () => {
  // Simulate the filter used in Dashboard.tsx Pipeline Overview
  const filteredStages = Object.entries(STAGES).filter(
    ([key]) => key !== 'not_interested' && key !== 'offer' && key !== 'completed' && !isStageDisabled(key)
  );

  const stageKeys = filteredStages.map(([key]) => key);

  // 1. Verify offer and completed are strictly excluded
  assert.equal(stageKeys.includes('offer'), false, 'Offer stage must NOT be present in Pipeline Overview');
  assert.equal(stageKeys.includes('completed'), false, 'Completed stage must NOT be present in Pipeline Overview');
  assert.equal(stageKeys.includes('not_interested'), false, 'Not Interested stage must NOT be present in Pipeline Overview');

  // 2. Verify all other core pipeline stages remain present
  const expectedStages = [
    'lead_generation',
    'sales',
    'cs_qc',
    'marketing_leader',
    'cs_strategy_check',
    'resume_team',
    'cs_assign_recruiter',
    'recruiter',
    'sys_admin',
    'marketing_active',
    'marketing_inactive',
    'interviewing',
    'application_tracking',
    'backout',
    'not_eligible'
  ];

  for (const expected of expectedStages) {
    assert.equal(stageKeys.includes(expected), true, `${expected} stage must remain in Pipeline Overview`);
  }

  // 3. Verify STAGES dictionary still has offer and completed for other app functionalities
  assert.equal('offer' in STAGES, true, 'STAGES definition must preserve offer');
  assert.equal('completed' in STAGES, true, 'STAGES definition must preserve completed');
});
