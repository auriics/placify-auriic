import test from 'node:test';
import assert from 'node:assert/strict';
import { canUserAccessCandidate, isProxyUser } from '../src/lib/permissions';
import { Candidate, User } from '../src/types';

// ============================================================================
// TEST FIXTURES: USERS ACROSS ALL ROLES
// ============================================================================

const adminUser: User = {
  id: 'u_admin',
  username: 'admin',
  email: 'admin@auriic.co',
  role: 'administrator',
  display_name: 'Admin User'
};

const sysAdminUser: User = {
  id: 'u_sysadmin',
  username: 'sysadmin',
  email: 'sysadmin@auriic.co',
  role: 'jpc_sysadmin',
  display_name: 'System Admin'
};

const managerUser: User = {
  id: 'u_manager',
  username: 'manager',
  email: 'manager@auriic.co',
  role: 'jpc_manager',
  display_name: 'Operations Manager'
};

const csDayShiftUser: User = {
  id: 'u_cs_day',
  username: 'cs.day',
  email: 'cs.day@auriic.co',
  role: 'jpc_cs',
  profile_handling_access: 'Day Shift',
  display_name: 'CS Head Day'
};

const csNightShiftUser: User = {
  id: 'u_cs_night',
  username: 'cs.night',
  email: 'cs.night@auriic.co',
  role: 'jpc_cs',
  profile_handling_access: 'Night Shift',
  display_name: 'CS Head Night'
};

const csAllProfilesUser: User = {
  id: 'u_cs_all',
  username: 'cs.all',
  email: 'cs.all@auriic.co',
  role: 'jpc_cs',
  profile_handling_access: 'All',
  display_name: 'CS Head All'
};

const compliancePerson: User = {
  id: 'u_comp_person',
  username: 'comp.person',
  email: 'comp@auriic.co',
  role: 'jpc_compliance_person',
  leader_id: 'u_cs_day',
  display_name: 'Compliance Specialist'
};

const proxyRoleUser: User = {
  id: 'u_proxy_1',
  username: 'proxy_interviewer',
  email: 'proxy@auriic.co',
  role: 'jpc_proxy',
  display_name: 'Proxy Specialist'
};

const designatedProxyByEmail: User = {
  id: 'u_nihal_proxy',
  username: 'nihalnx09',
  email: 'nihalnx09@gmail.com',
  role: 'candidate',
  display_name: 'Nihal Proxy'
};

const designatedProxyByUsername: User = {
  id: 'u_rudra_proxy',
  username: 'rudraksh.rawal',
  email: 'rudra@auriic.co',
  role: 'jpc_proxy',
  display_name: 'Rudraksh Rawal'
};

const nonProxyNihalResumeUser: User = {
  id: 'u_nihal_resume',
  username: 'nihal.khalyani',
  email: 'nihal.khalyani@auriic.co',
  role: 'jpc_resume',
  display_name: 'Nihal Khalyani'
};

const teamLeaderMarketing: User = {
  id: 'u_tl_1',
  username: 'tl_marketing',
  email: 'tl@auriic.co',
  role: 'jpc_marketing',
  display_name: 'Marketing Leader'
};

const recruiterA: User = {
  id: 'u_rec_a',
  username: 'recruiter.a',
  email: 'rec.a@auriic.co',
  role: 'jpc_recruiter',
  leader_id: 'u_tl_1',
  display_name: 'Recruiter A'
};

const recruiterB: User = {
  id: 'u_rec_b',
  username: 'recruiter.b',
  email: 'rec.b@auriic.co',
  role: 'jpc_recruiter',
  leader_id: 'u_tl_1',
  display_name: 'Recruiter B'
};

const salesUser: User = {
  id: 'u_sales_1',
  username: 'sales.rep',
  email: 'sales@auriic.co',
  role: 'jpc_sales',
  display_name: 'Sales Rep One'
};

const leadGenUser: User = {
  id: 'u_leadgen_1',
  username: 'leadgen.user',
  email: 'leadgen@auriic.co',
  role: 'jpc_lead_gen',
  display_name: 'Lead Generator'
};

const resumeTeamUser: User = {
  id: 'u_resume_1',
  username: 'resume.specialist',
  email: 'resume@auriic.co',
  role: 'jpc_resume',
  display_name: 'Resume Specialist'
};

const teamList: User[] = [
  adminUser,
  sysAdminUser,
  managerUser,
  csDayShiftUser,
  csNightShiftUser,
  csAllProfilesUser,
  compliancePerson,
  proxyRoleUser,
  designatedProxyByEmail,
  designatedProxyByUsername,
  nonProxyNihalResumeUser,
  teamLeaderMarketing,
  recruiterA,
  recruiterB,
  salesUser,
  leadGenUser,
  resumeTeamUser
];

// ============================================================================
// TEST FIXTURES: CANDIDATES
// ============================================================================

const candidateRecA: Candidate = {
  id: 'cand_rec_a',
  full_name: 'Candidate For Recruiter A',
  email: 'cand.a@example.com',
  phone: '+1 555 1010',
  whatsapp: '+1 555 1010',
  job_interest: 'Full Stack Java',
  current_stage: 'marketing_active',
  assigned_recruiter: 'u_rec_a',
  assigned_marketing_leader: 'u_tl_1',
  assigned_cs: 'u_cs_day',
  assigned_sales: 'u_sales_1',
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateRecB: Candidate = {
  id: 'cand_rec_b',
  full_name: 'Candidate For Recruiter B',
  email: 'cand.b@example.com',
  phone: '+1 555 2020',
  whatsapp: '+1 555 2020',
  job_interest: 'Python Backend',
  current_stage: 'marketing_active',
  assigned_recruiter: 'u_rec_b',
  // No assigned_marketing_leader explicitly on document, but recruiter reports to u_tl_1
  assigned_cs: 'u_cs_night',
  assigned_sales: 'u_sales_1',
  shift_preference: 'Night Shift',
  crm_brand: 'auriic'
};

const candidateHistoricalRecA: Candidate = {
  id: 'cand_hist_a',
  full_name: 'Candidate Previously With Recruiter A',
  email: 'cand.hist@example.com',
  phone: '+1 555 3030',
  whatsapp: '+1 555 3030',
  job_interest: 'DevOps',
  current_stage: 'marketing_active',
  assigned_recruiter: 'u_rec_b', // Currently with B
  previous_recruiters: [
    {
      recruiter_id: 'u_rec_a',
      recruiter_name: 'Recruiter A',
      assigned_at: '2026-01-01T00:00:00Z',
      unassigned_at: '2026-02-01T00:00:00Z'
    }
  ],
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateSalesGen: Candidate = {
  id: 'cand_sales_gen',
  full_name: 'Lead Generated by Sales Rep',
  email: 'cand.salesgen@example.com',
  phone: '+1 555 4040',
  whatsapp: '+1 555 4040',
  job_interest: 'Data Engineer',
  current_stage: 'sales',
  lead_generated_by: 'u_sales_1',
  assigned_sales: null, // Not assigned yet, but generated by salesUser
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateLeadGen: Candidate = {
  id: 'cand_lead_gen',
  full_name: 'Lead Generated by Lead Gen',
  email: 'cand.leadgen@example.com',
  phone: '+1 555 5050',
  whatsapp: '+1 555 5050',
  job_interest: 'QA Automation',
  current_stage: 'lead_generation',
  lead_generated_by: 'u_leadgen_1',
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateUnassigned: Candidate = {
  id: 'cand_unassigned',
  full_name: 'Unassigned Auto Candidate',
  email: 'auto.cand@example.com',
  phone: '+1 555 6060',
  whatsapp: '+1 555 6060',
  job_interest: 'Frontend React',
  current_stage: 'lead_generation',
  assigned_recruiter: null,
  assigned_sales: null,
  assigned_cs: null,
  assigned_resume: null,
  assigned_marketing_leader: null,
  assigned_marketing: null,
  lead_generated_by: null,
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateInterviewing: Candidate = {
  id: 'cand_interviewing',
  full_name: 'Candidate In Interviewing Stage',
  email: 'cand.interview@example.com',
  phone: '+1 555 7070',
  whatsapp: '+1 555 7070',
  job_interest: 'Cloud Architect',
  current_stage: 'interviewing',
  assigned_recruiter: 'u_rec_a',
  assigned_resume: 'u_resume_1',
  shift_preference: 'Day Shift',
  crm_brand: 'auriic'
};

const candidateAurrum: Candidate = {
  id: 'cand_aurrum',
  full_name: 'Aurrum Candidate',
  email: 'aurrum.user@example.com',
  phone: '+1 555 8080',
  whatsapp: '+1 555 8080',
  job_interest: 'Nurse Practitioner',
  current_stage: 'lead_generation',
  crm_brand: 'aurrum'
};

// ============================================================================
// TESTS
// ============================================================================

test('1. Proxy Person Visibility: canUserAccessCandidate allows all Placify CRM candidates', () => {
  // Check role: jpc_proxy
  assert.equal(isProxyUser(proxyRoleUser), true);
  assert.equal(canUserAccessCandidate(candidateRecA, proxyRoleUser, teamList), true, 'Proxy can access candidate A');
  assert.equal(canUserAccessCandidate(candidateRecB, proxyRoleUser, teamList), true, 'Proxy can access candidate B');
  assert.equal(canUserAccessCandidate(candidateInterviewing, proxyRoleUser, teamList), true, 'Proxy can access interviewing candidate');
  assert.equal(canUserAccessCandidate(candidateUnassigned, proxyRoleUser, teamList), true, 'Proxy can access unassigned candidate');

  // Check designated proxy by email (Nihal Proxy)
  assert.equal(isProxyUser(designatedProxyByEmail), true);
  assert.equal(canUserAccessCandidate(candidateRecA, designatedProxyByEmail, teamList), true, 'Designated proxy by email can access candidate');

  // Check designated proxy by username (Rudraksh)
  assert.equal(isProxyUser(designatedProxyByUsername), true);
  assert.equal(canUserAccessCandidate(candidateRecA, designatedProxyByUsername, teamList), true, 'Designated proxy by username can access candidate');

  // Verify non-proxy Nihal (resume member) is not classified as proxy
  assert.equal(isProxyUser(nonProxyNihalResumeUser), false);
});

test('2. Administrators, System Administrators, Managers have full visibility', () => {
  for (const mgr of [adminUser, sysAdminUser, managerUser]) {
    assert.equal(canUserAccessCandidate(candidateRecA, mgr, teamList), true);
    assert.equal(canUserAccessCandidate(candidateRecB, mgr, teamList), true);
    assert.equal(canUserAccessCandidate(candidateHistoricalRecA, mgr, teamList), true);
    assert.equal(canUserAccessCandidate(candidateUnassigned, mgr, teamList), true);
  }
});

test('3. Recruiter candidate isolation: strictly assigned candidates + previous recruiters', () => {
  // Recruiter A can access own candidate
  assert.equal(canUserAccessCandidate(candidateRecA, recruiterA, teamList), true);
  // Recruiter A CANNOT access Recruiter B's candidate
  assert.equal(canUserAccessCandidate(candidateRecB, recruiterA, teamList), false);
  // Recruiter A CAN access historical candidate where they were in previous_recruiters
  assert.equal(canUserAccessCandidate(candidateHistoricalRecA, recruiterA, teamList), true);
  // Recruiter B can access own candidate
  assert.equal(canUserAccessCandidate(candidateRecB, recruiterB, teamList), true);
  // Recruiter B CANNOT access Recruiter A's candidate
  assert.equal(canUserAccessCandidate(candidateRecA, recruiterB, teamList), false);
});

test('4. Marketing Leader / Recruiter Team Leader visibility: team recruiters hierarchy', () => {
  // Team Leader can access candidate A (assigned_marketing_leader matches)
  assert.equal(canUserAccessCandidate(candidateRecA, teamLeaderMarketing, teamList), true);
  // Team Leader can access candidate B (recruiter B reports to team leader, even without assigned_marketing_leader on doc)
  assert.equal(canUserAccessCandidate(candidateRecB, teamLeaderMarketing, teamList), true);
});

test('5. Sales Representative visibility: assigned sales, generated leads, unassigned leads', () => {
  // Assigned sales candidate
  assert.equal(canUserAccessCandidate(candidateRecA, salesUser, teamList), true);
  // Generated by sales rep (even if assigned_sales is null)
  assert.equal(canUserAccessCandidate(candidateSalesGen, salesUser, teamList), true);
  // Unassigned auto-candidate (allowed for staff to process)
  assert.equal(canUserAccessCandidate(candidateUnassigned, salesUser, teamList), true);
  // Candidate B is assigned to salesUser as well
  assert.equal(canUserAccessCandidate(candidateRecB, salesUser, teamList), true);
});

test('6. Lead Generation visibility: generated leads and unassigned auto-candidates', () => {
  // Lead generated by this user
  assert.equal(canUserAccessCandidate(candidateLeadGen, leadGenUser, teamList), true);
  // Unassigned auto-candidate
  assert.equal(canUserAccessCandidate(candidateUnassigned, leadGenUser, teamList), true);
  // Not generated by lead gen and assigned to someone else
  assert.equal(canUserAccessCandidate(candidateRecA, leadGenUser, teamList), false);
});

test('7. CS Head Profile Handling Access: Day Shift vs Night Shift vs All Profiles', () => {
  // Day Shift CS can access Day Shift profile
  assert.equal(canUserAccessCandidate(candidateRecA, csDayShiftUser, teamList), true);
  // Day Shift CS CANNOT access Night Shift profile
  assert.equal(canUserAccessCandidate(candidateRecB, csDayShiftUser, teamList), false);

  // Night Shift CS can access Night Shift profile
  assert.equal(canUserAccessCandidate(candidateRecB, csNightShiftUser, teamList), true);
  // Night Shift CS CANNOT access Day Shift profile
  assert.equal(canUserAccessCandidate(candidateRecA, csNightShiftUser, teamList), false);

  // All Profiles CS can access both
  assert.equal(canUserAccessCandidate(candidateRecA, csAllProfilesUser, teamList), true);
  assert.equal(canUserAccessCandidate(candidateRecB, csAllProfilesUser, teamList), true);
});

test('8. Compliance Person visibility: assigned CS, assigned sales, or leader CS', () => {
  // Candidate A has assigned_cs matching compliancePerson leader (u_cs_day)
  assert.equal(canUserAccessCandidate(candidateRecA, compliancePerson, teamList), true);
});

test('9. Resume Team visibility: marketing_active, interviewing, or assigned resume', () => {
  // In marketing_active
  assert.equal(canUserAccessCandidate(candidateRecA, resumeTeamUser, teamList), true);
  // In interviewing
  assert.equal(canUserAccessCandidate(candidateInterviewing, resumeTeamUser, teamList), true);
  // Lead gen stage not assigned to resume team -> false
  assert.equal(canUserAccessCandidate(candidateLeadGen, resumeTeamUser, teamList), false);
});

test('10. Candidate Role: strictly self-access only', () => {
  const candidateUser: User = {
    id: 'u_cand_1',
    username: 'cand.user',
    email: 'cand.a@example.com',
    role: 'candidate',
    candidate_id: 'cand_rec_a'
  };

  // Self candidate
  assert.equal(canUserAccessCandidate(candidateRecA, candidateUser, teamList), true);
  // Other candidate
  assert.equal(canUserAccessCandidate(candidateRecB, candidateUser, teamList), false);
});

test('11. Brand isolation: Aurrum candidate isolation', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  const rajUser: User = {
    id: 'u_raj',
    username: 'raj.lal',
    email: 'raj.lal@auriic.co',
    role: 'administrator'
  };

  // Raj Lal is explicitly restricted from Aurrum candidates
  assert.equal(canUserAccessCandidate(candidateAurrum, rajUser, teamList), false);
  // Other Admin can access Aurrum candidates
  assert.equal(canUserAccessCandidate(candidateAurrum, adminUser, teamList), true);
});
