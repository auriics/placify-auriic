import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditCandidateBasicInfo } from '../src/lib/permissions';
import { updateCandidateBasicDetails } from '../src/services/storage';

test('1. canEditCandidateBasicInfo: allows only authorized roles', () => {
  // Authorized roles:
  // - Lead Generation
  // - Sales Representative
  // - Administrator and Top-Level Management and cs and system admin
  assert.equal(canEditCandidateBasicInfo('jpc_lead_gen'), true, 'Lead Generation must have edit access');
  assert.equal(canEditCandidateBasicInfo('jpc_sales'), true, 'Sales Representative must have edit access');
  assert.equal(canEditCandidateBasicInfo('administrator'), true, 'Administrator must have edit access');
  assert.equal(canEditCandidateBasicInfo('jpc_manager'), true, 'Top-Level Management must have edit access');
  assert.equal(canEditCandidateBasicInfo('jpc_sysadmin'), true, 'System Admin must have edit access');
  assert.equal(canEditCandidateBasicInfo('jpc_cs'), true, 'CS / Compliance Head must have edit access');
  assert.equal(canEditCandidateBasicInfo('jpc_compliance_person'), true, 'Compliance Person must have edit access');
});

test('2. canEditCandidateBasicInfo: rejects all unauthorized roles', () => {
  // All other roles must NOT have access:
  const unauthorizedRoles = [
    'jpc_recruiter',
    'jpc_marketing',
    'jpc_marketing_support',
    'jpc_resume',
    'jpc_proxy',
    'jpc_candidate',
    'candidate',
    'aurrum_recruiter',
    'aurrum_sales',
    '',
    null,
    undefined,
    'unknown_role'
  ];

  for (const role of unauthorizedRoles) {
    assert.equal(
      canEditCandidateBasicInfo(role as any),
      false,
      `Role ${role} must not be allowed to edit candidate contact information`
    );
  }
});

test('3. updateCandidateBasicDetails: throws unauthorized error for forbidden roles', async () => {
  await assert.rejects(
    async () => {
      await updateCandidateBasicDetails(
        'test-cand-1',
        {
          full_name: 'Test Name',
          email: 'test@example.com',
          phone: '+15551234567'
        },
        { id: 'user-rec-1', role: 'jpc_recruiter' }
      );
    },
    {
      name: 'Error',
      message: /Unauthorized: You do not have permission to edit candidate contact information/
    }
  );

  await assert.rejects(
    async () => {
      await updateCandidateBasicDetails(
        'test-cand-1',
        {
          full_name: 'Test Name',
          email: 'test@example.com',
          phone: '+15551234567'
        },
        { id: 'user-cand-1', role: 'candidate' }
      );
    },
    {
      name: 'Error',
      message: /Unauthorized: You do not have permission to edit candidate contact information/
    }
  );
});

test('4. updateCandidateBasicDetails: validates mandatory fields (name, email, phone)', async () => {
  // Empty name
  await assert.rejects(
    async () => {
      await updateCandidateBasicDetails(
        'test-cand-1',
        { full_name: '   ', email: 'test@example.com', phone: '123' },
        { id: 'admin-1', role: 'administrator' }
      );
    },
    { name: 'Error', message: /Candidate Name is required/ }
  );

  // Empty email
  await assert.rejects(
    async () => {
      await updateCandidateBasicDetails(
        'test-cand-1',
        { full_name: 'Chaitanya Krishna', email: '', phone: '123' },
        { id: 'leadgen-1', role: 'jpc_lead_gen' }
      );
    },
    { name: 'Error', message: /Email Address is required/ }
  );

  // Empty phone
  await assert.rejects(
    async () => {
      await updateCandidateBasicDetails(
        'test-cand-1',
        { full_name: 'Chaitanya Krishna', email: 'test@example.com', phone: '   ' },
        { id: 'sales-1', role: 'jpc_sales' }
      );
    },
    { name: 'Error', message: /Phone Number is required/ }
  );
});

test('5. updateCandidateBasicDetails: whitelist enforcement preserves payload to only 4 fields and dispatches properly', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';
  let interceptedPayload: any = null;

  globalThis.fetch = (async (url: any, init: any) => {
    interceptedUrl = String(url);
    interceptedPayload = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: interceptedPayload })
    };
  }) as any;

  try {
    const result = await updateCandidateBasicDetails(
      'cand_999',
      {
        full_name: '  Chaitanya Krishna Reddy Kukkala  ',
        email: '  Chaitanya.K@EXAMPLE.COM  ',
        phone: '  +1 (555) 019-2834  ',
        whatsapp: '  +1 (555) 019-2834  ',
        // Arbitrary fields that must be excluded from basic details update:
        current_stage: 'offer',
        assigned_sales: 'unauthorized_sales_user',
        package_amount: 5000,
        interview_offer_status: 'approved'
      } as any,
      { id: 'leadgen-1', role: 'jpc_lead_gen', display_name: 'Lead Gen User' }
    );

    // Verify sanitized result
    assert.equal(result.full_name, 'Chaitanya Krishna Reddy Kukkala');
    assert.equal(result.email, 'chaitanya.k@example.com');
    assert.equal(result.phone, '+1 (555) 019-2834');
    assert.equal(result.whatsapp, '+1 (555) 019-2834');
    assert.equal((result as any).current_stage, undefined);
    assert.equal((result as any).assigned_sales, undefined);
    assert.equal((result as any).package_amount, undefined);

    // Verify intercepted endpoint and payload only contained the 4 whitelist fields + updated_at
    assert.equal(interceptedUrl, '/api/candidates/cand_999/basic-info');
    assert.equal(interceptedPayload.full_name, 'Chaitanya Krishna Reddy Kukkala');
    assert.equal(interceptedPayload.email, 'chaitanya.k@example.com');
    assert.equal(interceptedPayload.phone, '+1 (555) 019-2834');
    assert.equal(interceptedPayload.whatsapp, '+1 (555) 019-2834');
    assert.ok(interceptedPayload.updated_at);
    assert.equal(interceptedPayload.current_stage, undefined);
    assert.equal(interceptedPayload.assigned_sales, undefined);
    assert.equal(interceptedPayload.package_amount, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
