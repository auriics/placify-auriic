import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizePhoneDigits, 
  matchesPhone, 
  matchesTokens, 
  performGlobalSearch 
} from '../src/lib/searchUtils';
import { 
  Candidate, 
  User, 
  Application, 
  InterviewSupportRequest, 
  ResumeChangeRequest, 
  FollowUp 
} from '../src/types';

// Mock test data
const mockAdminUser: User = {
  id: 'usr_admin_1',
  username: 'admin.user',
  display_name: 'Administrator',
  email: 'admin@auriic.co',
  role: 'administrator',
  created_at: new Date().toISOString()
};

const mockRecruiterUser: User = {
  id: 'usr_recruiter_1',
  username: 'john.recruiter',
  display_name: 'John Recruiter',
  email: 'john.recruiter@auriic.co',
  role: 'jpc_recruiter',
  created_at: new Date().toISOString()
};

const mockComplianceDayShift: User = {
  id: 'usr_compliance_day',
  username: 'compliance.day',
  display_name: 'Compliance Day',
  email: 'compliance.day@auriic.co',
  role: 'jpc_cs',
  profile_handling_access: 'Day Shift',
  created_at: new Date().toISOString()
};

const mockComplianceNightShift: User = {
  id: 'usr_compliance_night',
  username: 'compliance.night',
  display_name: 'Compliance Night',
  email: 'compliance.night@auriic.co',
  role: 'jpc_cs',
  profile_handling_access: 'Night Shift',
  created_at: new Date().toISOString()
};

const mockCandidateUser: User = {
  id: 'usr_cand_1',
  username: 'cand.user',
  candidate_id: 'cand_101',
  display_name: 'Chaitanya Krishna',
  email: 'chaitanya@example.com',
  role: 'candidate',
  created_at: new Date().toISOString()
};

const mockCandidates: Candidate[] = [
  {
    id: 'cand_101',
    full_name: 'Chaitanya Krishna Reddy Kukkala',
    phone: '+1 (555) 234-5678',
    email: 'chaitanya@example.com',
    whatsapp: '+15552345678',
    current_stage: 'sales',
    crm_brand: 'auriic',
    shift_preference: 'Day Shift',
    job_interest: 'Full Stack Engineer',
    domain_interested: 'React & Node.js',
    skills: 'React, TypeScript, AWS, Python',
    notes: 'Very communicative and strong candidate',
    lead_source: 'LinkedIn',
    assigned_sales: 'usr_admin_1',
    assigned_recruiter: 'usr_recruiter_1',
    assigned_cs: null,
    assigned_resume: null,
    assigned_marketing_leader: null,
    assigned_marketing: null,
    lead_generated_by: 'usr_admin_1',
    package_name: 'Premium',
    package_amount: 1000,
    domain_suggested: 'Software Development',
    location: 'New York, NY',
    education: 'Masters',
    degree: 'MS in CS',
    university: 'NYU',
    graduation_year: '2022',
    experience_years: '5',
    current_company: 'TechCorp',
    current_designation: 'Software Engineer',
    linkedin_url: 'https://linkedin.com/in/chaitanya',
    flags: {
      agreement_sent: true,
      agreement_signed: true,
      qc_checklist_done: false,
      resume_approved: false,
      candidate_resume_approved: false,
      marketing_email_created: false,
      two_step_verification: false,
      linkedin_optimized: false,
      marketing_started: false
    },
    deleted_at: null,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-15T12:00:00Z'
  },
  {
    id: 'cand_102',
    full_name: 'Samantha Miller',
    phone: '+1 (888) 987-6543',
    email: 'samantha.m@domain.com',
    whatsapp: '+18889876543',
    current_stage: 'interviewing',
    crm_brand: 'auriic',
    shift_preference: 'Night Shift',
    job_interest: 'Data Scientist',
    domain_interested: 'Machine Learning',
    skills: 'PyTorch, ML, Statistics, SQL',
    notes: 'Cleared initial screening call',
    lead_source: 'Referral',
    assigned_sales: 'usr_admin_1',
    assigned_recruiter: 'usr_recruiter_2',
    assigned_cs: null,
    assigned_resume: null,
    assigned_marketing_leader: null,
    assigned_marketing: null,
    lead_generated_by: 'usr_admin_1',
    package_name: 'Standard',
    package_amount: 800,
    domain_suggested: 'Data Science',
    location: 'Austin, TX',
    education: 'Bachelors',
    degree: 'BS Data Science',
    university: 'UT Austin',
    graduation_year: '2021',
    experience_years: '4',
    current_company: 'AI Analytics',
    current_designation: 'ML Engineer',
    linkedin_url: '',
    flags: {
      agreement_sent: true,
      agreement_signed: true,
      qc_checklist_done: true,
      resume_approved: true,
      candidate_resume_approved: true,
      marketing_email_created: true,
      two_step_verification: true,
      linkedin_optimized: true,
      marketing_started: true
    },
    deleted_at: null,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-05T12:00:00Z'
  },
  {
    id: 'cand_103_aurrum',
    full_name: 'Vikram Joshi',
    phone: '+91 98765 43210',
    email: 'vikram.j@aurrum.com',
    whatsapp: '+919876543210',
    current_stage: 'lead_generation',
    crm_brand: 'aurrum',
    shift_preference: 'Day Shift',
    job_interest: 'DevOps Engineer',
    domain_interested: 'Cloud Infrastructure',
    skills: 'Docker, Kubernetes, GCP',
    notes: 'Aurrum brand lead',
    lead_source: 'Walk-in',
    assigned_sales: null,
    assigned_recruiter: null,
    assigned_cs: null,
    assigned_resume: null,
    assigned_marketing_leader: null,
    assigned_marketing: null,
    lead_generated_by: null,
    package_name: '',
    package_amount: 0,
    domain_suggested: '',
    location: 'Bangalore, India',
    education: 'BTech',
    degree: 'CS',
    university: 'VTU',
    graduation_year: '2020',
    experience_years: '6',
    current_company: 'CloudWorks',
    current_designation: 'Lead DevOps',
    linkedin_url: '',
    flags: {
      agreement_sent: false,
      agreement_signed: false,
      qc_checklist_done: false,
      resume_approved: false,
      candidate_resume_approved: false,
      marketing_email_created: false,
      two_step_verification: false,
      linkedin_optimized: false,
      marketing_started: false
    },
    deleted_at: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z'
  },
  // Specific Test candidate that must be excluded
  {
    id: 'test_edit_cand_1795118728093',
    full_name: 'Test Edit Candidate',
    phone: '+1 (555) 019-2834',
    email: 'test_edit@example.com',
    whatsapp: '+1 (555) 019-2834',
    current_stage: 'lead_generation',
    crm_brand: 'auriic',
    shift_preference: 'Day Shift',
    job_interest: 'QA Tester',
    domain_interested: 'Testing',
    skills: 'Testing',
    notes: 'Temporary test record',
    lead_source: 'Self Lead',
    assigned_sales: null,
    assigned_recruiter: null,
    assigned_cs: null,
    assigned_resume: null,
    assigned_marketing_leader: null,
    assigned_marketing: null,
    lead_generated_by: null,
    package_name: '',
    package_amount: 0,
    domain_suggested: '',
    location: '',
    education: '',
    degree: '',
    university: '',
    graduation_year: '',
    experience_years: '',
    current_company: '',
    current_designation: '',
    linkedin_url: '',
    flags: {
      agreement_sent: false,
      agreement_signed: false,
      qc_checklist_done: false,
      resume_approved: false,
      candidate_resume_approved: false,
      marketing_email_created: false,
      two_step_verification: false,
      linkedin_optimized: false,
      marketing_started: false
    },
    deleted_at: null,
    created_at: '2026-11-19T10:00:00Z',
    updated_at: '2026-11-19T10:00:00Z'
  }
];

const mockApplications: Application[] = [
  {
    id: 'app_1',
    candidate_id: 'cand_101',
    recruiter_id: 'usr_recruiter_1',
    company_name: 'Stripe',
    job_title: 'Staff Frontend Engineer',
    job_link: 'https://stripe.com/jobs/12345',
    status: 'Interview',
    applied_at: '2026-02-10T10:00:00Z',
    created_at: '2026-02-10T10:00:00Z',
    crm_brand: 'auriic'
  }
];

const mockInterviews: InterviewSupportRequest[] = [
  {
    id: 'int_1',
    candidate_id: 'cand_101',
    recruiter_id: 'usr_recruiter_1',
    cs_id: null,
    company_name: 'Google LLC',
    interview_company_name: 'Google',
    job_title: 'Senior Systems Architect',
    interview_type: 'technical',
    timezone: 'America/New_York',
    notes: 'Round 2 Technical Interview on Distributed Systems',
    whatsapp_number: '+15552345678',
    job_link: 'https://careers.google.com/jobs/999',
    application_link: 'https://careers.google.com/app/1',
    latest_resume_id: 'res_1',
    proxy_required: false,
    overall_status: 'confirmed',
    created_by: 'usr_recruiter_1',
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-15T14:00:00Z'
  }
];

const mockLogbooks: ResumeChangeRequest[] = [
  {
    id: 'res_req_1',
    candidate_id: 'cand_101',
    recruiter_id: 'usr_recruiter_1',
    details: 'Add AWS Solutions Architect certificate to resume header',
    status: 'completed',
    created_at: '2026-02-05T09:00:00Z',
    updated_at: '2026-02-05T15:00:00Z'
  }
];

const mockFollowUps: FollowUp[] = [
  {
    id: 'fol_1',
    candidate_id: 'cand_101',
    stage: 'sales',
    followup_date: '2026-02-20',
    note: 'Follow up regarding agreement signature and payment plan',
    done: false,
    created_by: 'usr_admin_1',
    created_at: '2026-02-12T10:00:00Z',
    crm_brand: 'auriic'
  }
];

const mockTeam: User[] = [
  mockAdminUser,
  mockRecruiterUser,
  mockComplianceDayShift,
  mockComplianceNightShift
];

test('1. normalizePhoneDigits & matchesPhone: Flexible phone formatting', () => {
  assert.equal(normalizePhoneDigits('+1 (555) 234-5678'), '15552345678');
  assert.equal(normalizePhoneDigits('  (888) 987 - 6543 '), '8889876543');

  // Exact unformatted
  assert.equal(matchesPhone('+1 (555) 234-5678', '5552345678'), true);
  // Formatted
  assert.equal(matchesPhone('+1 (555) 234-5678', '(555) 234'), true);
  // Partial digits
  assert.equal(matchesPhone('+1 (555) 234-5678', '2345678'), true);
  // Non-matching
  assert.equal(matchesPhone('+1 (555) 234-5678', '9991112222'), false);
});

test('2. Candidate Search: Name, Email, Phone, Skills, and ID', () => {
  // Search by partial name
  const resName = performGlobalSearch({
    query: 'Chaitanya Krishna',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.ok(resName.results.some(r => r.id === 'cand_101'));

  // Search by email
  const resEmail = performGlobalSearch({
    query: 'chaitanya@example.com',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.ok(resEmail.results.some(r => r.id === 'cand_101'));

  // Search by unformatted phone
  const resPhone = performGlobalSearch({
    query: '5552345678',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.ok(resPhone.results.some(r => r.id === 'cand_101'));

  // Search by skills
  const resSkill = performGlobalSearch({
    query: 'PyTorch',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.ok(resSkill.results.some(r => r.id === 'cand_102'));

  // Search by ID
  const resId = performGlobalSearch({
    query: 'cand_101',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.ok(resId.results.some(r => r.id === 'cand_101'));
});

test('3. Test candidate test_edit_cand_1795118728093 is NEVER returned in results', () => {
  // Search by exact test candidate ID
  const resId = performGlobalSearch({
    query: 'test_edit_cand_1795118728093',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.equal(resId.results.length, 0);

  // Search by test candidate phone
  const resPhone = performGlobalSearch({
    query: '+1 (555) 019-2834',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.equal(resPhone.results.length, 0);

  // Search by unformatted test phone
  const resPhoneDigits = performGlobalSearch({
    query: '5550192834',
    user: mockAdminUser,
    candidates: mockCandidates
  });
  assert.equal(resPhoneDigits.results.length, 0);
});

test('4. Cross-Module Search: Applications, Interviews, Logbooks, Follow-ups, and Team', () => {
  // Applications by company name
  const resApp = performGlobalSearch({
    query: 'Stripe',
    user: mockAdminUser,
    candidates: mockCandidates,
    applications: mockApplications
  });
  assert.ok(resApp.results.some(r => r.category === 'applications' && r.title === 'Stripe'));

  // Interviews by company name
  const resInt = performGlobalSearch({
    query: 'Google',
    user: mockAdminUser,
    candidates: mockCandidates,
    interviews: mockInterviews
  });
  assert.ok(resInt.results.some(r => r.category === 'interviews' && r.title === 'Google'));

  // Logbooks by resume detail text
  const resLog = performGlobalSearch({
    query: 'Solutions Architect',
    user: mockAdminUser,
    candidates: mockCandidates,
    logbooks: mockLogbooks
  });
  assert.ok(resLog.results.some(r => r.category === 'logbooks' && r.subtitle.includes('Solutions Architect')));

  // Follow-ups by note text
  const resFol = performGlobalSearch({
    query: 'agreement signature',
    user: mockAdminUser,
    candidates: mockCandidates,
    followups: mockFollowUps
  });
  assert.ok(resFol.results.some(r => r.category === 'followups' && r.subtitle.includes('agreement signature')));

  // Team members by name
  const resTeam = performGlobalSearch({
    query: 'John Recruiter',
    user: mockAdminUser,
    candidates: mockCandidates,
    team: mockTeam
  });
  assert.ok(resTeam.results.some(r => r.category === 'team' && r.title === 'John Recruiter'));
});

test('5. RBAC & Shift Security: Compliance Head Day Shift vs Night Shift', () => {
  // Day Shift Compliance Head: Can see Day Shift candidates, CANNOT see Night Shift
  const resDay = performGlobalSearch({
    query: 'cand_',
    user: mockComplianceDayShift,
    candidates: mockCandidates
  });
  const dayIds = resDay.results.map(r => r.id);
  assert.ok(dayIds.includes('cand_101')); // Day Shift
  assert.equal(dayIds.includes('cand_102'), false); // Night Shift forbidden!

  // Night Shift Compliance Head: Can see Night Shift candidates, CANNOT see Day Shift
  const resNight = performGlobalSearch({
    query: 'cand_',
    user: mockComplianceNightShift,
    candidates: mockCandidates
  });
  const nightIds = resNight.results.map(r => r.id);
  assert.ok(nightIds.includes('cand_102')); // Night Shift
  assert.equal(nightIds.includes('cand_101'), false); // Day Shift forbidden!
});

test('6. RBAC Security: Candidate can ONLY search their own record', () => {
  const resCandidate = performGlobalSearch({
    query: 'cand_',
    user: mockCandidateUser,
    candidates: mockCandidates,
    team: mockTeam
  });

  // Candidate sees only cand_101
  assert.equal(resCandidate.results.length, 1);
  assert.equal(resCandidate.results[0].id, 'cand_101');

  // Candidate CANNOT search team members
  const resTeamForCand = performGlobalSearch({
    query: 'John Recruiter',
    user: mockCandidateUser,
    candidates: mockCandidates,
    team: mockTeam
  });
  assert.equal(resTeamForCand.results.filter(r => r.category === 'team').length, 0);
});

test('7. Brand Isolation: Auriic CRM route excludes Aurrum records by default', () => {
  const resAuriic = performGlobalSearch({
    query: 'Vikram',
    user: mockRecruiterUser,
    isAurrumRoute: false,
    candidates: mockCandidates
  });
  assert.equal(resAuriic.results.length, 0); // Aurrum candidate excluded on Auriic route

  const resAurrum = performGlobalSearch({
    query: 'Vikram',
    user: mockAdminUser,
    isAurrumRoute: true,
    candidates: mockCandidates
  });
  assert.ok(resAurrum.results.some(r => r.id === 'cand_103_aurrum'));
});

test('8. Category Filtering & Counts', () => {
  const res = performGlobalSearch({
    query: 'Chaitanya',
    user: mockAdminUser,
    candidates: mockCandidates,
    applications: mockApplications,
    interviews: mockInterviews,
    logbooks: mockLogbooks,
    followups: mockFollowUps
  });

  assert.ok(res.counts.all >= 4);
  assert.equal(res.counts.candidates, 1);
  assert.equal(res.counts.applications, 1);
  assert.equal(res.counts.interviews, 1);
  assert.equal(res.counts.logbooks, 1);
  assert.equal(res.counts.followups, 1);

  // Category specific filter
  const candOnly = performGlobalSearch({
    query: 'Chaitanya',
    category: 'candidates',
    user: mockAdminUser,
    candidates: mockCandidates,
    applications: mockApplications,
    interviews: mockInterviews,
    logbooks: mockLogbooks,
    followups: mockFollowUps
  });
  assert.equal(candOnly.results.every(r => r.category === 'candidates'), true);
});
