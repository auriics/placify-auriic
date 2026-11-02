import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUserAccessCandidate, matchesProfileHandlingAccess, isComplianceHead } from '../src/lib/permissions';
import { Candidate, User } from '../src/types';

// =========================================================================
// MOCK DATA SETUP
// =========================================================================

// Compliance Head Users with different Profile Handling Access
const csDayShiftUser: User = {
  id: 'cs-day',
  username: 'compliance_day',
  display_name: 'CS Officer (Day)',
  role: 'jpc_cs',
  profile_handling_access: 'Day Shift',
  created_at: new Date().toISOString()
};

const csNightShiftUser: User = {
  id: 'cs-night',
  username: 'compliance_night',
  display_name: 'CS Officer (Night)',
  role: 'jpc_cs',
  profile_handling_access: 'Night Shift',
  created_at: new Date().toISOString()
};

const csAllProfilesUser: User = {
  id: 'cs-all',
  username: 'compliance_all',
  display_name: 'CS Officer (All)',
  role: 'jpc_cs',
  profile_handling_access: 'All',
  created_at: new Date().toISOString()
};

// Existing Compliance Head without profile_handling_access set
const csUnsetUser: User = {
  id: 'cs-legacy',
  username: 'compliance_legacy',
  display_name: 'CS Officer (Legacy Unset)',
  role: 'jpc_cs',
  created_at: new Date().toISOString()
};

// Faiz / Care Compliance Head
const csFaizDayUser: User = {
  id: 'cs-faiz-day',
  username: 'care',
  display_name: 'Faiz CS Head',
  role: 'jpc_cs',
  profile_handling_access: 'Day Shift',
  created_at: new Date().toISOString()
};

// Other Roles
const adminUser: User = {
  id: 'admin-1',
  username: 'admin',
  display_name: 'Super Admin',
  role: 'administrator',
  created_at: new Date().toISOString()
};

const recruiterUser: User = {
  id: 'rec-1',
  username: 'rec1',
  display_name: 'Recruiter 1',
  role: 'jpc_recruiter',
  created_at: new Date().toISOString()
};

// Candidate Profiles
const dayShiftCandidate: Candidate = {
  id: 'cand-day-1',
  full_name: 'Day Shift Candidate',
  shift_preference: 'Day Shift',
  assigned_recruiter: 'rec-1',
  current_stage: 'interviewing',
  created_at: new Date().toISOString()
} as Candidate;

const nightShiftCandidate: Candidate = {
  id: 'cand-night-1',
  full_name: 'Night Shift Candidate',
  shift_preference: 'Night Shift',
  assigned_recruiter: 'rec-1',
  current_stage: 'interviewing',
  created_at: new Date().toISOString()
} as Candidate;

const notSetCandidate: Candidate = {
  id: 'cand-unset-1',
  full_name: 'Not Set Candidate',
  shift_preference: 'Not Set',
  assigned_recruiter: 'rec-1',
  current_stage: 'interviewing',
  created_at: new Date().toISOString()
} as Candidate;

const nullShiftCandidate: Candidate = {
  id: 'cand-null-1',
  full_name: 'Null Shift Candidate',
  shift_preference: null,
  assigned_recruiter: 'rec-1',
  current_stage: 'interviewing',
  created_at: new Date().toISOString()
} as Candidate;

// =========================================================================
// TEST SUITE: PROFILE HANDLING ACCESS PERMISSIONS
// =========================================================================

test('1. matchesProfileHandlingAccess: helper function accuracy & normalization', () => {
  // Day Shift access
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'Day Shift'), true);
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'day_shift'), true);
  assert.equal(matchesProfileHandlingAccess('Night Shift', 'Day Shift'), false);
  assert.equal(matchesProfileHandlingAccess('Not Set', 'Day Shift'), false);
  assert.equal(matchesProfileHandlingAccess(null, 'Day Shift'), false);

  // Night Shift access
  assert.equal(matchesProfileHandlingAccess('Night Shift', 'Night Shift'), true);
  assert.equal(matchesProfileHandlingAccess('Night Shift', 'night_shift'), true);
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'Night Shift'), false);
  assert.equal(matchesProfileHandlingAccess('Not Set', 'Night Shift'), false);
  assert.equal(matchesProfileHandlingAccess(null, 'Night Shift'), false);

  // All Profiles access
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'All'), true);
  assert.equal(matchesProfileHandlingAccess('Night Shift', 'All'), true);
  assert.equal(matchesProfileHandlingAccess('Not Set', 'All'), true);
  assert.equal(matchesProfileHandlingAccess(null, 'All'), true);
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'all'), true);
  assert.equal(matchesProfileHandlingAccess('Day Shift', 'All Profiles'), true);

  // Backward-compatible default when profileAccess is undefined / null
  assert.equal(matchesProfileHandlingAccess('Day Shift', undefined), true, 'Default must permit Day Shift');
  assert.equal(matchesProfileHandlingAccess('Night Shift', undefined), false, 'Default must NOT permit Night Shift');
  assert.equal(matchesProfileHandlingAccess(null, undefined), false, 'Default must NOT permit null');
});

test('2. Day Shift Compliance Head: Access strictly limited to Day Shift candidate profiles', () => {
  assert.equal(canUserAccessCandidate(dayShiftCandidate, csDayShiftUser), true, 'Day Shift Compliance Head MUST access Day Shift profiles');
  assert.equal(canUserAccessCandidate(nightShiftCandidate, csDayShiftUser), false, 'Day Shift Compliance Head MUST NOT access Night Shift profiles');
  assert.equal(canUserAccessCandidate(notSetCandidate, csDayShiftUser), false, 'Day Shift Compliance Head MUST NOT access Not Set profiles');
  assert.equal(canUserAccessCandidate(nullShiftCandidate, csDayShiftUser), false, 'Day Shift Compliance Head MUST NOT access null shift profiles');
});

test('3. Night Shift Compliance Head: Access strictly limited to Night Shift candidate profiles', () => {
  assert.equal(canUserAccessCandidate(nightShiftCandidate, csNightShiftUser), true, 'Night Shift Compliance Head MUST access Night Shift profiles');
  assert.equal(canUserAccessCandidate(dayShiftCandidate, csNightShiftUser), false, 'Night Shift Compliance Head MUST NOT access Day Shift profiles');
  assert.equal(canUserAccessCandidate(notSetCandidate, csNightShiftUser), false, 'Night Shift Compliance Head MUST NOT access Not Set profiles');
  assert.equal(canUserAccessCandidate(nullShiftCandidate, csNightShiftUser), false, 'Night Shift Compliance Head MUST NOT access null shift profiles');
});

test('4. All Profiles Compliance Head: Access granted to both Day Shift and Night Shift candidate profiles', () => {
  assert.equal(canUserAccessCandidate(dayShiftCandidate, csAllProfilesUser), true, 'All Profiles Compliance Head MUST access Day Shift profiles');
  assert.equal(canUserAccessCandidate(nightShiftCandidate, csAllProfilesUser), true, 'All Profiles Compliance Head MUST access Night Shift profiles');
  assert.equal(canUserAccessCandidate(notSetCandidate, csAllProfilesUser), true, 'All Profiles Compliance Head MUST access Not Set profiles');
  assert.equal(canUserAccessCandidate(nullShiftCandidate, csAllProfilesUser), true, 'All Profiles Compliance Head MUST access null shift profiles');
});

test('5. Backward Compatibility: Compliance Head without profile_handling_access defaults safely to Day Shift only', () => {
  assert.equal(canUserAccessCandidate(dayShiftCandidate, csUnsetUser), true, 'Unset Compliance Head defaults to Day Shift profiles');
  assert.equal(canUserAccessCandidate(nightShiftCandidate, csUnsetUser), false, 'Unset Compliance Head MUST NOT unintentionally access Night Shift profiles');
  assert.equal(canUserAccessCandidate(notSetCandidate, csUnsetUser), false, 'Unset Compliance Head MUST NOT access Not Set profiles');
});

test('6. CS Leader (Faiz / Care): Profile handling access setting is strictly honored', () => {
  assert.equal(canUserAccessCandidate(dayShiftCandidate, csFaizDayUser), true, 'Faiz with Day Shift can access Day Shift profiles');
  assert.equal(canUserAccessCandidate(nightShiftCandidate, csFaizDayUser), false, 'Faiz with Day Shift CANNOT access Night Shift profiles');
});

test('7. Other roles unaffected: Administrator, SysAdmin, Recruiter retain expected behavior', () => {
  // Admin has full access to all candidate shifts
  assert.equal(canUserAccessCandidate(dayShiftCandidate, adminUser), true);
  assert.equal(canUserAccessCandidate(nightShiftCandidate, adminUser), true);

  // Recruiter access depends on assigned recruiter, not shift
  assert.equal(canUserAccessCandidate(dayShiftCandidate, recruiterUser), true);
  assert.equal(canUserAccessCandidate(nightShiftCandidate, recruiterUser), true);
});

test('8. Existing Compliance Head Authority: isComplianceHead remains true across all permission variations', () => {
  assert.equal(isComplianceHead(csDayShiftUser), true, 'Day Shift user is recognized as Compliance Head');
  assert.equal(isComplianceHead(csNightShiftUser), true, 'Night Shift user is recognized as Compliance Head');
  assert.equal(isComplianceHead(csAllProfilesUser), true, 'All Profiles user is recognized as Compliance Head');
  assert.equal(isComplianceHead(csUnsetUser), true, 'Unset user is recognized as Compliance Head');
  assert.equal(isComplianceHead(csFaizDayUser), true, 'Faiz is recognized as Compliance Head');
});
