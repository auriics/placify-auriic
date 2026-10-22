import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import {
  generateMonthlyPerformanceReportData,
  getNYDateString,
  isDirectInterviewSupportCandidate
} from '../server';

test('getNYDateString converts ISO strings and date values to YYYY-MM-DD in America/New_York', () => {
  assert.equal(getNYDateString('2026-10-15'), '2026-10-15');
  assert.equal(getNYDateString('2026-10-15T14:30:00.000Z'), '2026-10-15');
  // 2026-10-16 02:00 UTC is 2026-10-15 22:00 in America/New_York (EDT)
  assert.equal(getNYDateString('2026-10-16T02:00:00.000Z'), '2026-10-15');
  assert.equal(getNYDateString(null), null);
  assert.equal(getNYDateString(''), null);
});

test('Backout Candidate: marked backed out on Oct 15 is included Oct 1-14 and excluded from Oct 15 onward', () => {
  const users = [
    { id: 'u_rec1', full_name: 'Test Recruiter', role: 'jpc_recruiter' },
    { id: 'u_tl1', full_name: 'Test TL', role: 'jpc_marketing' }
  ];

  const candidates = [
    {
      id: 'c_backout_mid',
      full_name: 'Backout John',
      current_stage: 'backout',
      backed_out_at: '2026-10-15T12:00:00.000Z',
      assigned_recruiter: 'u_rec1',
      assigned_marketing_leader: 'u_tl1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    }
  ];

  // Applications filed on Oct 5 (before backout) and Oct 16 (after backout)
  const applications = [
    { id: 'app1', candidate_id: 'c_backout_mid', recruiter_id: 'u_rec1', applied_at: '2026-10-05' },
    { id: 'app2', candidate_id: 'c_backout_mid', recruiter_id: 'u_rec1', applied_at: '2026-10-05' },
    // Even if an application exists on or after Oct 15, it should not be included
    { id: 'app3', candidate_id: 'c_backout_mid', recruiter_id: 'u_rec1', applied_at: '2026-10-16' }
  ];

  // October 2026 (targetMonth = 9 in 0-indexed JS month)
  const report = generateMonthlyPerformanceReportData({
    targetMonth: 9,
    targetYear: 2026,
    users,
    candidates,
    applications,
    interviewRounds: [],
    interviewRequests: []
  });

  // Verify detailed data: only dates up to 2026-10-14 should be present
  const detailedRows = report.detailedData.filter(d => d.Candidate === 'Backout John');
  assert.ok(detailedRows.length > 0, 'Candidate should have detailed rows for active days');

  // Verify NO rows exist on or after Oct 15
  const rowsOnOrAfterOct15 = detailedRows.filter(d => d.Date >= '2026-10-15');
  assert.equal(rowsOnOrAfterOct15.length, 0, 'No rows should exist from backout date (Oct 15) onward');

  // Verify all rows are strictly before Oct 15
  assert.ok(detailedRows.every(d => d.Date < '2026-10-15'));
  assert.equal(detailedRows.length, 14, 'Days 1 to 14 of October should be included');

  // Oct 1 to 14 in 2026 has 10 weekdays (Oct 1 Thu, Oct 2 Fri, Oct 5-9 Mon-Fri, Oct 12-14 Mon-Wed)
  // Working days = 10 days * 40 target = 400 total target apps
  const summaryRow = report.summaryData.find(s => s.Candidate === 'Backout John');
  assert.ok(summaryRow, 'Candidate should have a summary row for active period');
  assert.equal(summaryRow['Total Target Apps'], 400, 'Target apps should only reflect working days prior to backout date');
  assert.equal(summaryRow['Total Actual Apps'], 2, 'Only applications prior to backout date should be counted');
});

test('Backout Candidate: marked backed out on or before the 1st of the month is completely excluded', () => {
  const users = [
    { id: 'u_rec1', full_name: 'Test Recruiter', role: 'jpc_recruiter' }
  ];

  const candidates = [
    {
      id: 'c_old_backout',
      full_name: 'Old Backout Candidate',
      current_stage: 'backout',
      backed_out_at: '2026-09-25T10:00:00.000Z',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    },
    {
      id: 'c_day1_backout',
      full_name: 'Day 1 Backout Candidate',
      current_stage: 'backout',
      backed_out_at: '2026-10-01T08:00:00.000Z',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    }
  ];

  const report = generateMonthlyPerformanceReportData({
    targetMonth: 9, // October 2026
    targetYear: 2026,
    users,
    candidates,
    applications: [],
    interviewRounds: [],
    interviewRequests: []
  });

  const detailedOld = report.detailedData.filter(d => d.Candidate === 'Old Backout Candidate');
  const summaryOld = report.summaryData.filter(s => s.Candidate === 'Old Backout Candidate');
  assert.equal(detailedOld.length, 0, 'Candidate backed out in previous month must have 0 detailed rows');
  assert.equal(summaryOld.length, 0, 'Candidate backed out in previous month must have 0 summary rows');

  const detailedDay1 = report.detailedData.filter(d => d.Candidate === 'Day 1 Backout Candidate');
  const summaryDay1 = report.summaryData.filter(s => s.Candidate === 'Day 1 Backout Candidate');
  assert.equal(detailedDay1.length, 0, 'Candidate backed out on 1st of the month must have 0 detailed rows');
  assert.equal(summaryDay1.length, 0, 'Candidate backed out on 1st of the month must have 0 summary rows');
});

test('Backout Candidate: backed out in next month is fully included for current month', () => {
  const users = [
    { id: 'u_rec1', full_name: 'Test Recruiter', role: 'jpc_recruiter' }
  ];

  const candidates = [
    {
      id: 'c_future_backout',
      full_name: 'Future Backout Candidate',
      current_stage: 'backout',
      backed_out_at: '2026-11-05T10:00:00.000Z',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    }
  ];

  const report = generateMonthlyPerformanceReportData({
    targetMonth: 9, // October 2026
    targetYear: 2026,
    users,
    candidates,
    applications: [],
    interviewRounds: [],
    interviewRequests: []
  });

  const detailed = report.detailedData.filter(d => d.Candidate === 'Future Backout Candidate');
  assert.equal(detailed.length, 31, 'Candidate backed out in November should have all 31 days in October report');

  const summary = report.summaryData.find(s => s.Candidate === 'Future Backout Candidate');
  assert.ok(summary);
  // October 2026 has 22 working weekdays: 22 * 40 = 880
  assert.equal(summary['Total Target Apps'], 880);
});

test('Backout date resolution falls back to activity log or updated_at if backed_out_at is not present', () => {
  const users = [
    { id: 'u_rec1', full_name: 'Test Recruiter', role: 'jpc_recruiter' }
  ];

  const candidates = [
    {
      id: 'c_log_fallback',
      full_name: 'Log Fallback Candidate',
      current_stage: 'backout',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    },
    {
      id: 'c_updated_fallback',
      full_name: 'Updated Fallback Candidate',
      current_stage: 'backout',
      updated_at: '2026-10-10T14:00:00.000Z',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    }
  ];

  const backoutLogs = [
    {
      candidate_id: 'c_log_fallback',
      action: 'Status: Backout',
      created_at: '2026-10-12T15:00:00.000Z'
    }
  ];

  const report = generateMonthlyPerformanceReportData({
    targetMonth: 9, // October 2026
    targetYear: 2026,
    users,
    candidates,
    applications: [],
    interviewRounds: [],
    interviewRequests: [],
    backoutLogs
  });

  const detailedLog = report.detailedData.filter(d => d.Candidate === 'Log Fallback Candidate');
  assert.equal(detailedLog.length, 11, 'Days 1 to 11 should be included before backout on Oct 12');
  assert.ok(detailedLog.every(d => d.Date < '2026-10-12'));

  const detailedUpdated = report.detailedData.filter(d => d.Candidate === 'Updated Fallback Candidate');
  assert.equal(detailedUpdated.length, 9, 'Days 1 to 9 should be included before backout on Oct 10');
  assert.ok(detailedUpdated.every(d => d.Date < '2026-10-10'));
});

test('isDirectInterviewSupportCandidate accurately identifies Direct Interview Support candidates', () => {
  assert.equal(isDirectInterviewSupportCandidate(null), false);
  assert.equal(isDirectInterviewSupportCandidate({}), false);

  // Flag set to true
  assert.equal(isDirectInterviewSupportCandidate({ is_direct_interview_support: true }), true);

  // Domain interested
  assert.equal(isDirectInterviewSupportCandidate({ domain_interested: 'Interview Support Only' }), true);
  assert.equal(isDirectInterviewSupportCandidate({ domain_interested: 'Direct Interview Support' }), true);

  // Lead source
  assert.equal(isDirectInterviewSupportCandidate({ lead_source: 'Interview Support Self-Service' }), true);
  assert.equal(isDirectInterviewSupportCandidate({ lead_source: 'Interview Support Landing Page' }), true);

  // Package name
  assert.equal(isDirectInterviewSupportCandidate({ package_name: 'Interview Support' }), true);
  assert.equal(isDirectInterviewSupportCandidate({ package_name: 'Direct Interview Support' }), true);

  // Notes signature
  assert.equal(isDirectInterviewSupportCandidate({ notes: 'Registered and self-booked via interview support direct landing form.' }), true);

  // Normal candidates must NOT be flagged
  assert.equal(isDirectInterviewSupportCandidate({
    full_name: 'Regular Candidate',
    domain_interested: 'Full Stack Java',
    package_name: 'Elite Placement',
    lead_source: 'LinkedIn Organic',
    notes: 'Standard candidate enrolled for marketing'
  }), false);
});

test('Direct Interview Support candidates are completely excluded from Monthly Performance Report', () => {
  const users = [
    { id: 'u_rec1', full_name: 'Test Recruiter', role: 'jpc_recruiter' }
  ];

  const candidates = [
    // 1. Direct Interview Support Candidate in 'interviewing' stage (from BookingPage)
    {
      id: 'c_direct_support_1',
      full_name: 'Direct Support Booking Candidate',
      current_stage: 'interviewing',
      is_direct_interview_support: true,
      domain_interested: 'Interview Support Only',
      lead_source: 'Interview Support Self-Service',
      package_name: 'Interview Support',
      notes: 'Registered and self-booked via interview support direct landing form.',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    },
    // 2. Direct Interview Support Candidate in 'marketing_active' stage
    {
      id: 'c_direct_support_2',
      full_name: 'Direct Support Marketing Candidate',
      current_stage: 'marketing_active',
      domain_interested: 'Interview Support Only',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    },
    // 3. Regular marketing candidate in 'interviewing' stage
    {
      id: 'c_regular_candidate',
      full_name: 'Regular Active Candidate',
      current_stage: 'interviewing',
      domain_interested: 'Full Stack Java',
      package_name: 'Elite Placement',
      assigned_recruiter: 'u_rec1',
      profiles_count: 1,
      custom_daily_target: 40,
      marketing_entity: ['recruiter']
    }
  ];

  const report = generateMonthlyPerformanceReportData({
    targetMonth: 9, // October 2026
    targetYear: 2026,
    users,
    candidates,
    applications: [],
    interviewRounds: [],
    interviewRequests: []
  });

  // Verify direct interview support candidates are completely excluded
  const detailedDirect1 = report.detailedData.filter(d => d.Candidate === 'Direct Support Booking Candidate');
  const summaryDirect1 = report.summaryData.filter(s => s.Candidate === 'Direct Support Booking Candidate');
  assert.equal(detailedDirect1.length, 0, 'Direct support candidate 1 must have 0 detailed rows');
  assert.equal(summaryDirect1.length, 0, 'Direct support candidate 1 must have 0 summary rows');

  const detailedDirect2 = report.detailedData.filter(d => d.Candidate === 'Direct Support Marketing Candidate');
  const summaryDirect2 = report.summaryData.filter(s => s.Candidate === 'Direct Support Marketing Candidate');
  assert.equal(detailedDirect2.length, 0, 'Direct support candidate 2 must have 0 detailed rows');
  assert.equal(summaryDirect2.length, 0, 'Direct support candidate 2 must have 0 summary rows');

  // Verify regular candidate is included as expected
  const detailedRegular = report.detailedData.filter(d => d.Candidate === 'Regular Active Candidate');
  const summaryRegular = report.summaryData.filter(s => s.Candidate === 'Regular Active Candidate');
  assert.equal(detailedRegular.length, 31, 'Regular candidate should have all days of October');
  assert.equal(summaryRegular.length, 1, 'Regular candidate should have a summary row');
});

