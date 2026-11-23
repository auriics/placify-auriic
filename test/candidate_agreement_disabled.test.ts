import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPaymentsRevenueDisabled } from '../src/lib/featureFlags';
import { Candidate, User } from '../src/types';

// Helper simulating permission check in CandidateDetail.tsx
function getCanManageAgreement(user: User | null): boolean {
  if (isPaymentsRevenueDisabled()) return false;
  return (
    user?.role === 'jpc_cs' ||
    user?.role === 'jpc_compliance_person' ||
    user?.role === 'administrator' ||
    user?.role === 'jpc_sysadmin' ||
    user?.role === 'jpc_manager'
  );
}

// Helper simulating candidate agreement update validation in storage.ts / server.ts
function validateCandidateAgreementUpdate(
  updates: Partial<Candidate>,
  existingData: Partial<Candidate> | null
): { allowed: boolean; error?: string } {
  if (isPaymentsRevenueDisabled()) {
    const isNewAgreement =
      (updates.agreement_url && updates.agreement_url !== existingData?.agreement_url) ||
      (updates.agreement_filename && updates.agreement_filename !== existingData?.agreement_filename) ||
      (updates.agreement_base64 && updates.agreement_base64 !== existingData?.agreement_base64);

    if (isNewAgreement) {
      return { allowed: false, error: 'Candidate Agreement upload is disabled in system configuration' };
    }
  }

  return { allowed: true };
}

test('1. When DISABLE_PAYMENTS_REVENUE=true: canManageAgreement is false for all roles', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';
  assert.equal(isPaymentsRevenueDisabled(), true);

  const csUser = { role: 'jpc_cs' } as User;
  const complianceUser = { role: 'jpc_compliance_person' } as User;
  const adminUser = { role: 'administrator' } as User;
  const sysadminUser = { role: 'jpc_sysadmin' } as User;
  const managerUser = { role: 'jpc_manager' } as User;

  assert.equal(getCanManageAgreement(csUser), false);
  assert.equal(getCanManageAgreement(complianceUser), false);
  assert.equal(getCanManageAgreement(adminUser), false);
  assert.equal(getCanManageAgreement(sysadminUser), false);
  assert.equal(getCanManageAgreement(managerUser), false);
});

test('2. When DISABLE_PAYMENTS_REVENUE=true: New or changed agreement upload is strictly rejected', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';

  const existingCandidate: Partial<Candidate> = {
    id: 'cand_123',
    full_name: 'John Doe',
    agreement_url: null,
    agreement_filename: null
  };

  // Attempt to upload new agreement
  const uploadResult = validateCandidateAgreementUpdate(
    {
      agreement_url: 'https://storage.googleapis.com/agreements/new_agreement.pdf',
      agreement_filename: 'new_agreement.pdf'
    },
    existingCandidate
  );

  assert.equal(uploadResult.allowed, false);
  assert.equal(uploadResult.error, 'Candidate Agreement upload is disabled in system configuration');
});

test('3. When DISABLE_PAYMENTS_REVENUE=true: Existing agreements remain safely stored and unaffected during profile edits', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';

  const existingWithAgreement: Partial<Candidate> = {
    id: 'cand_123',
    full_name: 'John Doe',
    agreement_url: 'https://storage.googleapis.com/agreements/historical_agreement.pdf',
    agreement_filename: 'historical_agreement.pdf',
    assigned_recruiter: 'rec_1'
  };

  // Profile update that changes recruiter and phone, keeping existing agreement_url intact
  const profileUpdateResult = validateCandidateAgreementUpdate(
    {
      assigned_recruiter: 'rec_2',
      phone: '+1-555-9999',
      agreement_url: 'https://storage.googleapis.com/agreements/historical_agreement.pdf',
      agreement_filename: 'historical_agreement.pdf'
    },
    existingWithAgreement
  );

  assert.equal(profileUpdateResult.allowed, true);
  assert.equal(profileUpdateResult.error, undefined);
});

test('4. When DISABLE_PAYMENTS_REVENUE=true: Other document uploads (resumes) remain functional and unaffected', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'true';

  const existingCandidate: Partial<Candidate> = {
    id: 'cand_123',
    resume_url: null
  };

  // Updating resume_url without touching agreement
  const resumeUpdateResult = validateCandidateAgreementUpdate(
    {
      resume_url: 'https://storage.googleapis.com/resumes/john_doe_resume.pdf',
      resume_filename: 'john_doe_resume.pdf'
    },
    existingCandidate
  );

  assert.equal(resumeUpdateResult.allowed, true);
});

test('5. When DISABLE_PAYMENTS_REVENUE=false: canManageAgreement and upload functionality are fully restored', () => {
  process.env.DISABLE_PAYMENTS_REVENUE = 'false';
  assert.equal(isPaymentsRevenueDisabled(), false);

  const csUser = { role: 'jpc_cs' } as User;
  const complianceUser = { role: 'jpc_compliance_person' } as User;
  const adminUser = { role: 'administrator' } as User;
  const recruiterUser = { role: 'jpc_recruiter' } as User;

  assert.equal(getCanManageAgreement(csUser), true);
  assert.equal(getCanManageAgreement(complianceUser), true);
  assert.equal(getCanManageAgreement(adminUser), true);
  assert.equal(getCanManageAgreement(recruiterUser), false);

  const existingCandidate: Partial<Candidate> = {
    id: 'cand_123',
    agreement_url: null
  };

  // Allowed when flag is false
  const uploadResult = validateCandidateAgreementUpdate(
    {
      agreement_url: 'https://storage.googleapis.com/agreements/agreement.pdf',
      agreement_filename: 'agreement.pdf'
    },
    existingCandidate
  );

  assert.equal(uploadResult.allowed, true);
});
