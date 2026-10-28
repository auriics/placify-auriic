import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteInterviewRequest, isRecruiterTeamLeader, isTeamMemberOfLeader } from '../src/lib/permissions';
import { User, Candidate, InterviewSupportRequest } from '../src/types';

// =========================================================================
// MOCK DATA SETUP
// =========================================================================

// Management Users
const adminUser: User = { id: 'admin-1', username: 'admin', display_name: 'Super Admin', role: 'administrator', created_at: '' };
const sysAdminUser: User = { id: 'sysadmin-1', username: 'sysadmin', display_name: 'Sys Admin', role: 'jpc_sysadmin', created_at: '' };
const managerUser: User = { id: 'mgr-1', username: 'manager', display_name: 'Ops Manager', role: 'jpc_manager', created_at: '' };
const csHeadUser: User = { id: 'cs-1', username: 'care', display_name: 'CS Faiz', role: 'jpc_cs', created_at: '' };
const compliancePersonUser: User = { id: 'cp-1', username: 'cp1', display_name: 'Compliance Person', role: 'jpc_compliance_person', created_at: '' };
const proxyUser: User = { id: 'proxy-1', username: 'proxy1', display_name: 'Tech Proxy', role: 'jpc_proxy', created_at: '' };

// Team Leaders
const tlAlpha: User = { id: 'tl-alpha', username: 'nikhil.sevak', display_name: 'Nikhil Sevak', role: 'jpc_marketing', created_at: '' };
const tlBeta: User = { id: 'tl-beta', username: 'jay.patel', display_name: 'Jay Patel', role: 'jpc_marketing', created_at: '' };
const tlSupport: User = { id: 'tl-sup', username: 'tlsup', display_name: 'TL Support', role: 'jpc_marketing_support', created_at: '' };

// Recruiters under Team Alpha
const recAlpha1: User = { id: 'rec-a1', username: 'rec_a1', display_name: 'Recruiter A1', role: 'jpc_recruiter', leader_id: 'tl-alpha', created_at: '' };
const recAlpha2: User = { id: 'rec-a2', username: 'rec_a2', display_name: 'Recruiter A2', role: 'jpc_recruiter', leader_id: 'tl-alpha', created_at: '' };

// Recruiters under Team Beta
const recBeta1: User = { id: 'rec-b1', username: 'rec_b1', display_name: 'Recruiter B1', role: 'jpc_recruiter', leader_id: 'tl-beta', created_at: '' };

// Other roles
const salesUser: User = { id: 'sales-1', username: 'sales1', display_name: 'Sales Rep', role: 'jpc_sales', created_at: '' };
const leadGenUser: User = { id: 'lg-1', username: 'lg1', display_name: 'Lead Gen', role: 'jpc_lead_gen', created_at: '' };
const candidatePortalUser: User = { id: 'cand-user', username: 'cand1', display_name: 'Candidate User', role: 'candidate', created_at: '' };

const allUsers: User[] = [
  adminUser, sysAdminUser, managerUser, csHeadUser, compliancePersonUser, proxyUser,
  tlAlpha, tlBeta, tlSupport,
  recAlpha1, recAlpha2, recBeta1,
  salesUser, leadGenUser, candidatePortalUser
];

// Candidates
const candidateAlphaTeam: Candidate = {
  id: 'cand-1',
  full_name: 'Candidate Alpha',
  phone: '1234567890',
  email: 'alpha@example.com',
  whatsapp: '1234567890',
  job_interest: 'Full Stack',
  domain_interested: 'IT',
  location: 'US',
  education: 'BS',
  degree: 'CS',
  university: 'MIT',
  graduation_year: '2020',
  experience_years: '4',
  current_company: 'Acme',
  current_designation: 'Engineer',
  skills: 'React, Node',
  linkedin_url: '',
  lead_source: 'Portal',
  lead_generated_by: 'lg-1',
  assigned_sales: 'sales-1',
  assigned_cs: 'cs-1',
  assigned_resume: null,
  assigned_marketing_leader: 'tl-alpha',
  assigned_recruiter: 'rec-a1',
  assigned_marketing: 'tl-alpha',
  package_name: 'Support Pro',
  package_amount: 500,
  domain_suggested: 'IT',
  notes: '',
  current_stage: 'interviewing',
  flags: {} as any,
  deleted_at: null,
  created_at: '',
  updated_at: ''
};

const candidateBetaTeam: Candidate = {
  ...candidateAlphaTeam,
  id: 'cand-2',
  full_name: 'Candidate Beta',
  assigned_marketing_leader: 'tl-beta',
  assigned_recruiter: 'rec-b1',
  assigned_marketing: 'tl-beta'
};

// Interview Requests
const interviewAlpha: Partial<InterviewSupportRequest> = {
  id: 'req-alpha-1',
  candidate_id: 'cand-1',
  recruiter_id: 'rec-a1',
  created_by: 'rec-a1',
  company_name: 'TechCorp',
  job_title: 'Senior Developer'
};

const interviewBeta: Partial<InterviewSupportRequest> = {
  id: 'req-beta-1',
  candidate_id: 'cand-2',
  recruiter_id: 'rec-b1',
  created_by: 'rec-b1',
  company_name: 'BetaCorp',
  job_title: 'Data Analyst'
};

// =========================================================================
// TEST SUITE
// =========================================================================

test('1. Management & Proxy authority retains full delete permissions', () => {
  assert.equal(canDeleteInterviewRequest(adminUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
  assert.equal(canDeleteInterviewRequest(sysAdminUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
  assert.equal(canDeleteInterviewRequest(managerUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
  assert.equal(canDeleteInterviewRequest(csHeadUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
  assert.equal(canDeleteInterviewRequest(compliancePersonUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
  assert.equal(canDeleteInterviewRequest(proxyUser, interviewAlpha, candidateAlphaTeam, allUsers), true);
});

test('2. Recruiter Team Leader can delete interviews for their team members', () => {
  // TL Alpha can delete interview created by recruiter under them (recAlpha1)
  assert.equal(isRecruiterTeamLeader(tlAlpha), true);
  assert.equal(isTeamMemberOfLeader('rec-a1', tlAlpha, allUsers), true);
  assert.equal(canDeleteInterviewRequest(tlAlpha, interviewAlpha, candidateAlphaTeam, allUsers), true);

  // Even without passing the candidate object, TL Alpha can delete based on recruiter_id reporting to them
  assert.equal(canDeleteInterviewRequest(tlAlpha, interviewAlpha, null, allUsers), true);

  // TL Alpha can delete interview when candidate has assigned_marketing_leader matching TL Alpha
  const interviewWithUnassignedRecruiter: Partial<InterviewSupportRequest> = {
    id: 'req-alpha-2',
    candidate_id: 'cand-1',
    recruiter_id: 'unknown-rec',
    created_by: 'unknown-creator'
  };
  assert.equal(canDeleteInterviewRequest(tlAlpha, interviewWithUnassignedRecruiter, candidateAlphaTeam, allUsers), true);
});

test('3. Recruiter Team Leader CANNOT delete interviews belonging to unrelated teams', () => {
  // TL Alpha attempting to delete Team Beta interview
  assert.equal(isTeamMemberOfLeader('rec-b1', tlAlpha, allUsers), false);
  assert.equal(canDeleteInterviewRequest(tlAlpha, interviewBeta, candidateBetaTeam, allUsers), false);
  assert.equal(canDeleteInterviewRequest(tlAlpha, interviewBeta, null, allUsers), false);

  // TL Beta attempting to delete Team Alpha interview
  assert.equal(canDeleteInterviewRequest(tlBeta, interviewAlpha, candidateAlphaTeam, allUsers), false);
});

test('4. Direct ownership allows recruiter to delete their own interview', () => {
  // Recruiter A1 can delete their own interview
  assert.equal(canDeleteInterviewRequest(recAlpha1, interviewAlpha, candidateAlphaTeam, allUsers), true);
});

test('5. Regular recruiter CANNOT delete interviews of other recruiters or teams', () => {
  // Recruiter A2 (same team, but not creator or assigned) cannot delete Recruiter A1's interview
  assert.equal(canDeleteInterviewRequest(recAlpha2, interviewAlpha, candidateAlphaTeam, allUsers), false);

  // Recruiter A1 cannot delete Recruiter B1's interview
  assert.equal(canDeleteInterviewRequest(recAlpha1, interviewBeta, candidateBetaTeam, allUsers), false);
});

test('6. Unauthorized roles (Sales, Lead Gen, Candidate) cannot delete interviews', () => {
  assert.equal(canDeleteInterviewRequest(salesUser, interviewAlpha, candidateAlphaTeam, allUsers), false);
  assert.equal(canDeleteInterviewRequest(leadGenUser, interviewAlpha, candidateAlphaTeam, allUsers), false);
  assert.equal(canDeleteInterviewRequest(candidatePortalUser, interviewAlpha, candidateAlphaTeam, allUsers), false);
  assert.equal(canDeleteInterviewRequest(null, interviewAlpha, candidateAlphaTeam, allUsers), false);
});

test('7. Team Leader Support role works with team interviews', () => {
  assert.equal(isRecruiterTeamLeader(tlSupport), true);
  // Direct ownership on TL Support
  const interviewTLSupport: Partial<InterviewSupportRequest> = {
    id: 'req-tl-sup',
    recruiter_id: 'tl-sup',
    created_by: 'tl-sup'
  };
  assert.equal(canDeleteInterviewRequest(tlSupport, interviewTLSupport, null, allUsers), true);
});

test('8. Team Leader CAN delete interviews inside Today and Upcoming regardless of team', () => {
  // interviewBeta belongs to Team Beta, but if it is today or upcoming, TL Alpha CAN delete it
  assert.equal(
    canDeleteInterviewRequest(tlAlpha, interviewBeta, candidateBetaTeam, allUsers, { isTodayOrUpcoming: true }),
    true
  );

  // If rounds data shows today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const roundsToday = [{ booked_slot_time: `${todayStr}T14:00:00Z` }];
  assert.equal(
    canDeleteInterviewRequest(tlAlpha, interviewBeta, candidateBetaTeam, allUsers, { rounds: roundsToday }),
    true
  );

  // If rounds data is in the past, normal team scoping applies (so TL Alpha cannot delete Team Beta's past interview)
  const roundsPast = [{ booked_slot_time: '2020-01-01T10:00:00Z' }];
  assert.equal(
    canDeleteInterviewRequest(tlAlpha, interviewBeta, candidateBetaTeam, allUsers, { rounds: roundsPast }),
    false
  );
});

test('9. Auriic Team Leader CANNOT delete Aurrum Careers interviews, even if Today or Upcoming', () => {
  const aurrumCandidate: Candidate = {
    ...candidateBetaTeam,
    crm_brand: 'aurrum'
  };

  const aurrumInterview: Partial<InterviewSupportRequest> = {
    id: 'req-aurrum-1',
    candidate_id: aurrumCandidate.id,
    recruiter_id: 'rec-a1',
    created_by: 'rec-a1'
  };

  // TL Alpha cannot delete Aurrum Careers interview even with isTodayOrUpcoming: true
  assert.equal(
    canDeleteInterviewRequest(tlAlpha, aurrumInterview, aurrumCandidate, allUsers, { isTodayOrUpcoming: true }),
    false
  );

  // TL Alpha cannot delete even if their own recruiter created it
  assert.equal(
    canDeleteInterviewRequest(tlAlpha, aurrumInterview, aurrumCandidate, allUsers),
    false
  );

  // Administrator CAN delete Aurrum Careers interview
  assert.equal(
    canDeleteInterviewRequest(adminUser, aurrumInterview, aurrumCandidate, allUsers),
    true
  );

  // Manager CAN delete Aurrum Careers interview
  assert.equal(
    canDeleteInterviewRequest(managerUser, aurrumInterview, aurrumCandidate, allUsers),
    true
  );
});
