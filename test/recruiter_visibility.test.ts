import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUserAccessCandidate } from '../src/lib/permissions';
import { performGlobalSearch } from '../src/lib/searchUtils';
import { Candidate, User } from '../src/types';

const teamLeader: User = {
  id: 'tl_1',
  username: 'tl.one',
  display_name: 'Team Leader One',
  email: 'tl1@auriic.co',
  role: 'jpc_marketing',
};

const recruiterA: User = {
  id: 'rec_a',
  username: 'recruiter.a',
  display_name: 'Recruiter A',
  email: 'recruiter.a@auriic.co',
  role: 'jpc_recruiter',
  leader_id: 'tl_1',
};

const recruiterB: User = {
  id: 'rec_b',
  username: 'recruiter.b',
  display_name: 'Recruiter B',
  email: 'recruiter.b@auriic.co',
  role: 'jpc_recruiter',
  leader_id: 'tl_1', // Same Team Leader as Recruiter A!
};

const adminUser: User = {
  id: 'admin_1',
  username: 'admin',
  display_name: 'Admin User',
  email: 'admin@auriic.co',
  role: 'administrator',
};

const teamUsers: User[] = [teamLeader, recruiterA, recruiterB, adminUser];

const candA: Candidate = {
  id: 'cand_a',
  full_name: 'Alice Candidate',
  email: 'alice@example.com',
  phone: '+1 555 111 2222',
  whatsapp: '+1 555 111 2222',
  job_interest: 'Java Developer',
  current_stage: 'marketing_active',
  assigned_recruiter: 'rec_a',
  assigned_marketing_leader: 'tl_1',
  crm_brand: 'auriic',
};

const candB: Candidate = {
  id: 'cand_b',
  full_name: 'Bob Candidate',
  email: 'bob@example.com',
  phone: '+1 555 333 4444',
  whatsapp: '+1 555 333 4444',
  job_interest: 'Python Developer',
  current_stage: 'marketing_active',
  assigned_recruiter: 'rec_b',
  assigned_marketing_leader: 'tl_1', // Same Team Leader!
  crm_brand: 'auriic',
};

const candUnassigned: Candidate = {
  id: 'cand_unassigned',
  full_name: 'Unassigned Lead',
  email: 'unassigned@example.com',
  phone: '+1 555 999 0000',
  whatsapp: '+1 555 999 0000',
  job_interest: 'Data Analyst',
  current_stage: 'lead_generation',
  crm_brand: 'auriic',
};

test('1. Recruiter A sees ONLY Recruiter A candidates (never Recruiter B even under same Team Leader)', () => {
  assert.equal(canUserAccessCandidate(candA, recruiterA, teamUsers), true, 'Recruiter A must access own candidate');
  assert.equal(canUserAccessCandidate(candB, recruiterA, teamUsers), false, 'Recruiter A must NOT access Recruiter B candidate even with same leader_id');
  assert.equal(canUserAccessCandidate(candUnassigned, recruiterA, teamUsers), false, 'Recruiter A must NOT access unassigned candidates');
});

test('2. Recruiter B sees ONLY Recruiter B candidates (never Recruiter A)', () => {
  assert.equal(canUserAccessCandidate(candB, recruiterB, teamUsers), true, 'Recruiter B must access own candidate');
  assert.equal(canUserAccessCandidate(candA, recruiterB, teamUsers), false, 'Recruiter B must NOT access Recruiter A candidate');
  assert.equal(canUserAccessCandidate(candUnassigned, recruiterB, teamUsers), false, 'Recruiter B must NOT access unassigned candidates');
});

test('3. Global Search strictly isolates Recruiter A and Recruiter B', () => {
  const allCandidates = [candA, candB, candUnassigned];

  const searchAsA = performGlobalSearch({
    query: 'Candidate',
    user: recruiterA,
    candidates: allCandidates,
    team: teamUsers,
    applications: [],
    interviews: [],
    resumeRequests: [],
    followUps: [],
  });
  assert.equal(searchAsA.counts.candidates, 1, 'Recruiter A Global Search should only return 1 candidate');
  assert.equal(searchAsA.results.find(i => i.category === 'candidates')?.id, 'cand_a');

  const searchBAsA = performGlobalSearch({
    query: 'Bob Candidate',
    user: recruiterA,
    candidates: allCandidates,
    team: teamUsers,
    applications: [],
    interviews: [],
    resumeRequests: [],
    followUps: [],
  });
  assert.equal(searchBAsA.counts.candidates, 0, 'Recruiter A must NOT find Recruiter B candidate via Global Search');
});

test('4. Team Leader and Administrator retain full authorized visibility', () => {
  assert.equal(canUserAccessCandidate(candA, teamLeader, teamUsers), true, 'Team Leader must access Recruiter A candidate');
  assert.equal(canUserAccessCandidate(candB, teamLeader, teamUsers), true, 'Team Leader must access Recruiter B candidate');
  assert.equal(canUserAccessCandidate(candA, adminUser, teamUsers), true, 'Admin must access Recruiter A candidate');
  assert.equal(canUserAccessCandidate(candB, adminUser, teamUsers), true, 'Admin must access Recruiter B candidate');
  assert.equal(canUserAccessCandidate(candUnassigned, adminUser, teamUsers), true, 'Admin must access unassigned candidate');
});

test('5. Backout & Historical Candidates: Recruiter retains visibility for candidates assigned to them before backout/reassignment', () => {
  const backedOutCand: Candidate = {
    ...candA,
    id: 'cand_backout_a',
    current_stage: 'backout',
  };
  assert.equal(canUserAccessCandidate(backedOutCand, recruiterA, teamUsers), true, 'Recruiter A must still see their backed-out candidate');
  assert.equal(canUserAccessCandidate(backedOutCand, recruiterB, teamUsers), false, 'Recruiter B must NOT see Recruiter A backed-out candidate');

  const historicalCand: Candidate = {
    ...candB,
    id: 'cand_hist_a',
    assigned_recruiter: 'rec_b',
    previous_recruiters: [{ recruiter_id: 'rec_a', recruiter_name: 'Recruiter A', unassigned_at: new Date().toISOString() }],
  };
  assert.equal(canUserAccessCandidate(historicalCand, recruiterA, teamUsers), true, 'Recruiter A must retain historical visibility via previous_recruiters');
});
