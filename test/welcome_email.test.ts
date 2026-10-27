import test from 'node:test';
import assert from 'node:assert/strict';

// Set NODE_ENV to test to prevent server.ts from starting listening sockets and crons
process.env.NODE_ENV = 'test';

import {
  formatRoleName,
  generateWelcomeEmailHtml,
  generateWelcomeEmailText
} from '../server';

test('formatRoleName maps CRM roles to friendly titles', () => {
  assert.equal(formatRoleName('jpc_recruiter'), 'Recruiter');
  assert.equal(formatRoleName('jpc_marketing'), 'Team Leader');
  assert.equal(formatRoleName('jpc_cs'), 'Compliance Head');
  assert.equal(formatRoleName('jpc_proxy'), 'Proxy Interviewer');
  assert.equal(formatRoleName('jpc_sales'), 'Sales Specialist');
  assert.equal(formatRoleName('administrator'), 'System Administrator');
  assert.equal(formatRoleName('jpc_candidate'), 'Candidate Portal');
  assert.equal(formatRoleName('candidate'), 'Candidate Portal');
  assert.equal(formatRoleName('aurrum_sales'), 'Aurrum Sales Specialist');
  assert.equal(formatRoleName(undefined), 'Team Member');
});

test('generateWelcomeEmailHtml produces properly branded Auriic Placify email with credentials', () => {
  const html = generateWelcomeEmailHtml({
    displayName: 'Aarav Patel',
    username: 'aarav.patel',
    email: 'aarav.patel@gmail.com',
    password: 'SecurePass@123',
    role: 'jpc_recruiter',
    loginUrl: 'https://auriic.co',
    recipientEmail: 'aarav.patel@gmail.com'
  });

  // Verify Auriic Placify branding
  assert.ok(html.includes('Auriic Placify'), 'Must contain Auriic Placify branding');
  assert.ok(html.includes('Welcome to Auriic Placify'), 'Must have Welcome to Auriic Placify heading');

  // Verify Recipient & Credentials
  assert.ok(html.includes('Aarav Patel'), 'Must contain user display name');
  assert.ok(html.includes('aarav.patel@gmail.com'), 'Must contain user Gmail ID / login email');
  assert.ok(html.includes('SecurePass@123'), 'Must contain user password');
  assert.ok(html.includes('Recruiter'), 'Must contain formatted role title');
  assert.ok(html.includes('https://auriic.co'), 'Must contain platform portal link');

  // Verify Security Notice & Action Button
  assert.ok(html.includes('Sign In to Auriic Placify'), 'Must contain call-to-action button');
  assert.ok(html.includes('Important Security Instructions'), 'Must contain security guidance');
});

test('generateWelcomeEmailText produces clean plain text fallback with credentials', () => {
  const text = generateWelcomeEmailText({
    displayName: 'Priya Sharma',
    username: 'priya.sharma',
    email: 'priya.sharma@auriic.co',
    password: 'TempPassword456!',
    role: 'jpc_sales',
    loginUrl: 'https://auriic.co'
  });

  assert.ok(text.includes('Welcome to Auriic Placify!'), 'Must contain greeting');
  assert.ok(text.includes('Priya Sharma'), 'Must contain recipient name');
  assert.ok(text.includes('priya.sharma@auriic.co'), 'Must contain login email');
  assert.ok(text.includes('TempPassword456!'), 'Must contain password');
  assert.ok(text.includes('Sales Specialist'), 'Must contain role');
  assert.ok(text.includes('https://auriic.co'), 'Must contain portal link');
});
