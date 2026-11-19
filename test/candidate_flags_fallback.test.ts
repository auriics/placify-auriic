import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  DEFAULT_CANDIDATE_FLAGS, 
  normalizeCandidateFlags, 
  normalizeCandidateStage,
  STAGES,
  TRANSITIONS,
  PREVIOUS_STAGES
} from '../src/constants';
import { Candidate, CandidateFlags, Stage } from '../src/types';

test('DEFAULT_CANDIDATE_FLAGS has all required boolean flags set to false', () => {
  assert.equal(DEFAULT_CANDIDATE_FLAGS.agreement_sent, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.agreement_signed, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.qc_checklist_done, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.marketing_strategy_done, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.resume_briefing_call_done, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.resume_approved, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.candidate_resume_approved, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.marketing_email_created, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.two_step_verification, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.linkedin_optimized, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.marketing_started, false);
  assert.equal(DEFAULT_CANDIDATE_FLAGS.sla_timeout_notified, false);
});

test('normalizeCandidateFlags safely defaults missing/undefined/null flags', () => {
  // Undefined
  const fromUndefined = normalizeCandidateFlags(undefined);
  assert.equal(fromUndefined.agreement_sent, false);
  assert.equal(typeof fromUndefined.agreement_sent, 'boolean');

  // Null
  const fromNull = normalizeCandidateFlags(null);
  assert.equal(fromNull.agreement_sent, false);
  assert.equal(fromNull.agreement_signed, false);

  // Empty object
  const fromEmpty = normalizeCandidateFlags({});
  assert.equal(fromEmpty.agreement_sent, false);
  assert.equal(fromEmpty.linkedin_optimized, false);

  // Partial flags preserved
  const fromPartial = normalizeCandidateFlags({
    agreement_sent: true,
    marketing_email_created: true
  });
  assert.equal(fromPartial.agreement_sent, true);
  assert.equal(fromPartial.marketing_email_created, true);
  assert.equal(fromPartial.agreement_signed, false);
  assert.equal(fromPartial.qc_checklist_done, false);
});

test('normalizeCandidateStage safely handles legacy, missing, or corrupt stages', () => {
  assert.equal(normalizeCandidateStage(undefined), 'lead_generation');
  assert.equal(normalizeCandidateStage(null), 'lead_generation');
  assert.equal(normalizeCandidateStage(''), 'lead_generation');
  assert.equal(normalizeCandidateStage('invalid_stage_xyz'), 'lead_generation');
  assert.equal(normalizeCandidateStage(123), 'lead_generation');

  // Valid stages remain unchanged
  assert.equal(normalizeCandidateStage('sales'), 'sales');
  assert.equal(normalizeCandidateStage('cs_qc'), 'cs_qc');
  assert.equal(normalizeCandidateStage('interviewing'), 'interviewing');
  assert.equal(normalizeCandidateStage('marketing_active'), 'marketing_active');
});

test('Legacy candidate without flags does NOT crash when checking agreement_sent or rendering status flags', () => {
  // Simulate legacy Firestore document lacking flags completely
  const legacyDoc: any = {
    id: 'cand_legacy_123',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    current_stage: undefined,
    // flags is undefined!
  };

  const normalizedCandidate: Candidate = {
    ...legacyDoc,
    current_stage: normalizeCandidateStage(legacyDoc.current_stage),
    flags: normalizeCandidateFlags(legacyDoc.flags),
  };

  // 1. Check agreement_sent access
  assert.doesNotThrow(() => {
    const isSent = normalizedCandidate.flags.agreement_sent;
    assert.equal(isSent, false);
  });

  // 2. Check CandidateDetail status flags loop
  const groups = [
    {
      title: 'CS Team',
      flags: [
        { key: 'agreement_sent', label: 'Agreement Sent' },
        { key: 'agreement_signed', label: 'Agreement Signed' },
        { key: 'qc_checklist_done', label: 'QC Checklist Done' },
      ]
    }
  ];

  assert.doesNotThrow(() => {
    groups.forEach(group => {
      group.flags.forEach(flag => {
        const active = Boolean(normalizedCandidate.flags?.[flag.key as keyof CandidateFlags]);
        assert.equal(active, false);
      });
    });
  });

  // 3. Check Onboarding Success condition
  assert.doesNotThrow(() => {
    const isCompleted = [
      'agreement_sent',
      'agreement_signed',
      'qc_checklist_done',
      'marketing_strategy_done',
      'resume_briefing_call_done',
      'resume_approved',
      'candidate_resume_approved',
      'marketing_email_created',
      'two_step_verification',
      'linkedin_optimized'
    ].every(key => Boolean(normalizedCandidate.flags?.[key as keyof CandidateFlags]));
    assert.equal(isCompleted, false);
  });

  // 4. Check toggle flag
  const toggled = {
    ...normalizedCandidate,
    flags: {
      ...normalizeCandidateFlags(normalizedCandidate.flags),
      agreement_sent: !normalizedCandidate.flags.agreement_sent
    }
  };
  assert.equal(toggled.flags.agreement_sent, true);
  assert.equal(toggled.flags.agreement_signed, false);
});

test('Pipeline grouping safely handles candidates with undefined or missing current_stage', () => {
  const candidates: any[] = [
    { id: '1', full_name: 'Lead 1', current_stage: 'sales' },
    { id: '2', full_name: 'Lead 2', current_stage: undefined },
    { id: '3', full_name: 'Lead 3', current_stage: null },
  ];

  const groups: Record<string, any[]> = {};
  candidates.forEach(c => {
    const stageKey = c.current_stage || 'lead_generation';
    if (!groups[stageKey]) {
      groups[stageKey] = [];
    }
    groups[stageKey].push(c);
  });

  assert.equal(groups['sales'].length, 1);
  assert.equal(groups['lead_generation'].length, 2);
  assert.equal(groups['undefined'], undefined);
});

test('Safe stage lookup does not throw on undefined, null, or corrupted stage key', () => {
  const corruptStages = [undefined, null, '', 'unknown_phase'];

  corruptStages.forEach(st => {
    const stageInfo = STAGES[st as unknown as Stage];
    // Safe lookup pattern
    const label = stageInfo?.label || (typeof st === 'string' && st ? st : 'Lead Generation');
    const color = stageInfo?.color || '#3B82F6';
    const icon = stageInfo?.icon || '◎';

    assert.ok(label);
    assert.ok(color);
    assert.ok(icon);

    // Transitions lookup
    const transitions = TRANSITIONS[st as unknown as Stage] || [];
    assert.ok(Array.isArray(transitions));

    // Previous stages lookup
    const prev = PREVIOUS_STAGES[st as unknown as Stage];
    assert.equal(prev, null);
  });
});
