import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isAurrumDisabledForRaj, 
  isAurrumRestrictedForUser 
} from '../src/lib/featureFlags';
import { 
  canUserAccessCandidate, 
  canDeleteInterviewRequest 
} from '../src/lib/permissions';
import { 
  performGlobalSearch 
} from '../src/lib/searchUtils';
import { Candidate, User, InterviewSupportRequest, Application, FollowUp } from '../src/types';

test('1. Feature Flag & Account Matching for Raj Lal', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  assert.equal(isAurrumDisabledForRaj(), true);

  // Exact email string
  assert.equal(isAurrumRestrictedForUser('raj.lal@auriic.co'), true);
  
  // Case insensitivity and whitespace trimming
  assert.equal(isAurrumRestrictedForUser('  RAJ.LAL@AURIIC.CO  '), true);
  
  // User object with email
  assert.equal(isAurrumRestrictedForUser({ email: 'raj.lal@auriic.co', role: 'administrator' } as User), true);

  // User object with username
  assert.equal(isAurrumRestrictedForUser({ username: 'raj.lal@auriic.co', role: 'jpc_manager' } as User), true);
});

test('2. Other user accounts are NOT restricted when flag is enabled', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  assert.equal(isAurrumRestrictedForUser('admin@auriic.co'), false);
  assert.equal(isAurrumRestrictedForUser('yash.pandya@auriic.co'), false);
  assert.equal(isAurrumRestrictedForUser('faiz.ahmed@auriic.co'), false);
  assert.equal(isAurrumRestrictedForUser({ email: 'aurrum.user@auriic.co', role: 'aurrum_admin' } as User), false);
  assert.equal(isAurrumRestrictedForUser(null), false);
  assert.equal(isAurrumRestrictedForUser(undefined), false);
});

test('3. Environment flag toggle: Disabled configuration restores normal access', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'false';

  assert.equal(isAurrumDisabledForRaj(), false);
  assert.equal(isAurrumRestrictedForUser('raj.lal@auriic.co'), false);
  assert.equal(isAurrumRestrictedForUser({ email: 'raj.lal@auriic.co', role: 'administrator' } as User), false);
});

test('4. Candidate Access Permissions: Aurrum candidates are strictly blocked for Raj Lal', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  const rajUser: User = {
    id: 'user_raj_1',
    username: 'raj.lal',
    email: 'raj.lal@auriic.co',
    display_name: 'Raj Lal',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const otherAdmin: User = {
    id: 'user_admin_2',
    username: 'other.admin',
    email: 'admin@auriic.co',
    display_name: 'Other Admin',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const auriicCandidate: Candidate = {
    id: 'cand_auriic_1',
    full_name: 'Auriic Candidate',
    email: 'cand1@example.com',
    phone: '+1-555-1111',
    current_stage: 'lead_generation',
    shift_preference: 'Day Shift',
    crm_brand: 'auriic',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  const aurrumCandidate: Candidate = {
    id: 'cand_aurrum_1',
    full_name: 'Aurrum Candidate',
    email: 'cand2@example.com',
    phone: '+1-555-2222',
    current_stage: 'lead_generation',
    shift_preference: 'Day Shift',
    crm_brand: 'aurrum',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  // Raj Lal CAN access Auriic candidate
  assert.equal(canUserAccessCandidate(auriicCandidate, rajUser), true);

  // Raj Lal CANNOT access Aurrum candidate even with administrator role
  assert.equal(canUserAccessCandidate(aurrumCandidate, rajUser), false);

  // Other administrator CAN access Aurrum candidate
  assert.equal(canUserAccessCandidate(aurrumCandidate, otherAdmin), true);
});

test('5. Interview Support Delete Permissions: Aurrum interviews blocked for Raj Lal', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  const rajUser: User = {
    id: 'user_raj_1',
    username: 'raj.lal',
    email: 'raj.lal@auriic.co',
    display_name: 'Raj Lal',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const otherAdmin: User = {
    id: 'user_admin_2',
    username: 'other.admin',
    email: 'admin@auriic.co',
    display_name: 'Other Admin',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const auriicCandidate: Candidate = {
    id: 'cand_auriic_1',
    full_name: 'Auriic Candidate',
    email: 'cand1@example.com',
    phone: '+1-555-1111',
    current_stage: 'technical_round',
    crm_brand: 'auriic',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  const aurrumCandidate: Candidate = {
    id: 'cand_aurrum_1',
    full_name: 'Aurrum Candidate',
    email: 'cand2@example.com',
    phone: '+1-555-2222',
    current_stage: 'technical_round',
    crm_brand: 'aurrum',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  const request = {
    recruiter_id: 'rec_1',
    created_by: 'creator_1',
    candidate_id: 'cand_1'
  };

  // Raj Lal CAN delete Auriic interview
  assert.equal(canDeleteInterviewRequest(rajUser, request, auriicCandidate), true);

  // Raj Lal CANNOT delete Aurrum interview
  assert.equal(canDeleteInterviewRequest(rajUser, request, aurrumCandidate), false);

  // Other admin CAN delete Aurrum interview
  assert.equal(canDeleteInterviewRequest(otherAdmin, request, aurrumCandidate), true);
});

test('6. Global Search: Aurrum records are excluded for Raj Lal', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  const rajUser: User = {
    id: 'user_raj_1',
    username: 'raj.lal',
    email: 'raj.lal@auriic.co',
    display_name: 'Raj Lal',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const otherAdmin: User = {
    id: 'user_admin_2',
    username: 'other.admin',
    email: 'admin@auriic.co',
    display_name: 'Other Admin',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const candidates: Candidate[] = [
    {
      id: 'cand_1',
      full_name: 'John Developer',
      email: 'john@example.com',
      phone: '+1-555-1111',
      current_stage: 'lead_generation',
      crm_brand: 'auriic',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    },
    {
      id: 'cand_2',
      full_name: 'Alice Developer',
      email: 'alice@example.com',
      phone: '+1-555-2222',
      current_stage: 'lead_generation',
      crm_brand: 'aurrum',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
  ];

  const applications: Application[] = [
    {
      id: 'app_1',
      candidate_id: 'cand_1',
      company_name: 'Google',
      job_title: 'Developer',
      status: 'applied',
      crm_brand: 'auriic',
      created_at: '2026-01-01'
    },
    {
      id: 'app_2',
      candidate_id: 'cand_2',
      company_name: 'Aurrum Tech',
      job_title: 'Developer',
      status: 'applied',
      crm_brand: 'aurrum',
      created_at: '2026-01-01'
    }
  ];

  const interviews: InterviewSupportRequest[] = [
    {
      id: 'int_1',
      candidate_id: 'cand_1',
      recruiter_id: 'rec_1',
      cs_id: null,
      company_name: 'Meta',
      interview_company_name: 'Meta',
      job_title: 'Developer',
      interview_type: 'technical',
      timezone: 'EST',
      notes: 'Developer interview',
      whatsapp_number: '+1-555-1111',
      job_link: '',
      application_link: '',
      latest_resume_id: '',
      proxy_required: false,
      overall_status: 'confirmed',
      created_by: 'rec_1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    },
    {
      id: 'int_2',
      candidate_id: 'cand_2',
      recruiter_id: 'rec_2',
      cs_id: null,
      company_name: 'Aurrum Client',
      interview_company_name: 'Aurrum Client',
      job_title: 'Developer',
      interview_type: 'technical',
      timezone: 'EST',
      notes: 'Developer interview',
      whatsapp_number: '+1-555-2222',
      job_link: '',
      application_link: '',
      latest_resume_id: '',
      proxy_required: false,
      overall_status: 'confirmed',
      created_by: 'rec_2',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
  ];

  const team: User[] = [
    {
      id: 'u_auriic',
      username: 'auriic_dev',
      display_name: 'Auriic Staff Developer',
      email: 'staff@auriic.co',
      role: 'jpc_recruiter',
      is_active: true,
      created_at: '2026-01-01'
    },
    {
      id: 'u_aurrum',
      username: 'aurrum_dev',
      display_name: 'Aurrum Staff Developer',
      email: 'aurrum_staff@auriic.co',
      role: 'aurrum_sales',
      is_active: true,
      created_at: '2026-01-01'
    }
  ];

  // Search as Raj Lal for "Developer"
  const rajSearch = performGlobalSearch({
    query: 'Developer',
    category: 'all',
    user: rajUser,
    allUsers: team,
    candidates,
    applications,
    interviews,
    team
  });

  // Raj Lal should ONLY see Auriic items, never Aurrum
  assert.equal(rajSearch.counts.candidates, 1);
  assert.equal(rajSearch.results.some(r => r.id === 'cand_2'), false);
  assert.equal(rajSearch.results.some(r => r.id === 'app_2'), false);
  assert.equal(rajSearch.results.some(r => r.id === 'int_2'), false);
  assert.equal(rajSearch.results.some(r => r.id === 'u_aurrum'), false);

  // Search as other admin for "Developer"
  const adminSearch = performGlobalSearch({
    query: 'Developer',
    category: 'all',
    user: otherAdmin,
    allUsers: team,
    candidates,
    applications,
    interviews,
    team
  });

  // Other admin CAN see both Auriic and Aurrum
  assert.equal(adminSearch.counts.candidates, 2);
  assert.equal(adminSearch.results.some(r => r.id === 'cand_2'), true);
  assert.equal(adminSearch.results.some(r => r.id === 'app_2'), true);
});

test('7. Sidebar Navigation Permissions: Aurrum is hidden for Raj Lal and visible for others', () => {
  process.env.DISABLE_AURRUM_CAREERS_FOR_RAJ = 'true';

  const rajUser: User = {
    id: 'user_raj_1',
    username: 'raj.lal',
    email: 'raj.lal@auriic.co',
    display_name: 'Raj Lal',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const otherAdmin: User = {
    id: 'user_admin_2',
    username: 'other.admin',
    email: 'admin@auriic.co',
    display_name: 'Other Admin',
    role: 'administrator',
    is_active: true,
    created_at: '2026-01-01'
  };

  const checkCanAccessAurrum = (user: User) => {
    return (
      !isAurrumRestrictedForUser(user) &&
      (user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs')
    );
  };

  const checkCanManageAurrumTeam = (user: User) => {
    return (
      !isAurrumRestrictedForUser(user) &&
      (user.role === 'aurrum_admin' ||
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager')
    );
  };

  // Raj Lal has Aurrum access hidden
  assert.equal(checkCanAccessAurrum(rajUser), false);
  assert.equal(checkCanManageAurrumTeam(rajUser), false);

  // Other Admin has Aurrum access visible
  assert.equal(checkCanAccessAurrum(otherAdmin), true);
  assert.equal(checkCanManageAurrumTeam(otherAdmin), true);
});
