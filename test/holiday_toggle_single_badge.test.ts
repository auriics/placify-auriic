import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDateOfficeClosure,
  toggleDateWorkingStatus,
  clearHolidayForDate,
  sanitizeHolidayBadgeTitle,
  isCrmHolidayEvent,
  doesEventCoverDate,
  setCachedOfficeClosuresForTesting,
  isDateOfficeClosedSync
} from '../src/services/holidayService';
import { OfficeClosure, User } from '../src/types';

const ADMIN_USER: User = {
  id: 'admin_test_1',
  full_name: 'Test Administrator',
  display_name: 'Admin',
  email: 'admin@auriic.co',
  role: 'administrator',
  google_calendar_connected: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

suite('Holiday Toggle & Single Badge Verification', () => {
  test('1. Title sanitization strips duplicate emojis and converts between Open and Closed without mangling', () => {
    // Scenario 1: Closed title switched to Open
    const openTitle = sanitizeHolidayBadgeTitle('Office Closed (2026-12-28)', true, '2026-12-28');
    assert.equal(openTitle, 'Office Open (2026-12-28)');

    // Scenario 2: Open title switched to Closed
    const closedTitle = sanitizeHolidayBadgeTitle('Office Open (2026-12-28)', false, '2026-12-28');
    assert.equal(closedTitle, 'Office Closed (2026-12-28)');

    // Scenario 3: Prefixed titles with emojis like "🔴 OFFICE CLOSED: Christmas"
    const cleanHoliday = sanitizeHolidayBadgeTitle('🔴 OFFICE CLOSED: Christmas Day', false);
    assert.equal(cleanHoliday, 'Christmas Day');

    // Scenario 4: "🟢 OFFICE OPEN: Office Closed (2026-12-28)" must clean up to "Office Open (2026-12-28)"
    const cleanMangled = sanitizeHolidayBadgeTitle('🟢 OFFICE OPEN: Office Closed (2026-12-28)', true, '2026-12-28');
    assert.equal(cleanMangled, 'Office Open (2026-12-28)');
  });

  test('2. isCrmHolidayEvent and doesEventCoverDate accurately identify CRM closure events', () => {
    const ev1 = {
      id: 'ev_1',
      summary: '🔴 OFFICE CLOSED: Office Closed (2026-12-25)',
      start: { date: '2026-12-25' },
      end: { date: '2026-12-26' }
    };
    assert.equal(isCrmHolidayEvent(ev1), true);
    assert.equal(doesEventCoverDate(ev1, '2026-12-25'), true);
    assert.equal(doesEventCoverDate(ev1, '2026-12-26'), false); // all day exclusive end

    const evMulti = {
      id: 'ev_multi',
      summary: 'Office Closed – Winter Break',
      description: 'Recruiter Notice: Synchronized from Placify CRM',
      start: { date: '2026-12-25' },
      end: { date: '2026-12-29' }
    };
    assert.equal(isCrmHolidayEvent(evMulti), true);
    assert.equal(doesEventCoverDate(evMulti, '2026-12-25'), true);
    assert.equal(doesEventCoverDate(evMulti, '2026-12-28'), true);
    assert.equal(doesEventCoverDate(evMulti, '2026-12-29'), false); // exclusive end

    const nonCrm = {
      id: 'ev_personal',
      summary: 'Doctor Appointment',
      start: { dateTime: '2026-12-28T10:00:00Z' },
      end: { dateTime: '2026-12-28T11:00:00Z' }
    };
    assert.equal(isCrmHolidayEvent(nonCrm), false);
  });

  test('3. Toggle between Open and Closed ensures mutually exclusive single status on a weekday', async () => {
    // Monday 2026-12-28
    const monday = '2026-12-28';
    setCachedOfficeClosuresForTesting([], { weekly_off_days: [0, 6] }); // Sat & Sun off

    // Initial: Weekday is open by default
    const initial = isDateOfficeClosedSync(monday);
    assert.equal(initial.isClosed, false);

    // Toggle 1: Mark as Closed
    const res1 = await toggleDateWorkingStatus(monday, 'closed', ADMIN_USER);
    assert.equal(res1.success, true);
    assert.equal(res1.newStatus, 'closed');

    const evalClosed = isDateOfficeClosedSync(monday);
    assert.equal(evalClosed.isClosed, true);
    assert.equal(evalClosed.status, 'closed');
    assert.equal(evalClosed.closure?.title, 'Office Closed (2026-12-28)');

    // Toggle 2: Mark as Open
    const res2 = await toggleDateWorkingStatus(monday, 'open', ADMIN_USER);
    assert.equal(res2.success, true);
    assert.equal(res2.newStatus, 'open');

    const evalOpen = isDateOfficeClosedSync(monday);
    assert.equal(evalOpen.isClosed, false);
    assert.equal(evalOpen.status, 'open');
    assert.equal(evalOpen.closure?.title, 'Office Open (2026-12-28)');

    // Toggle 3: Switch back to Closed
    const res3 = await toggleDateWorkingStatus(monday, 'closed', ADMIN_USER);
    assert.equal(res3.success, true);
    assert.equal(res3.newStatus, 'closed');

    const evalClosed2 = isDateOfficeClosedSync(monday);
    assert.equal(evalClosed2.isClosed, true);
    assert.equal(evalClosed2.status, 'closed');
    assert.equal(evalClosed2.closure?.title, 'Office Closed (2026-12-28)');

    // Reset for next test
    setCachedOfficeClosuresForTesting([]);
  });

  test('4. Resetting a closure with clearHolidayForDate removes all overrides and restores default schedule', async () => {
    const friday = '2026-12-25';
    const closedClosure: OfficeClosure = {
      id: 'closure_fri_1',
      title: 'Office Closed (2026-12-25)',
      status: 'closed',
      event_type: 'special_closure',
      start_date: friday,
      end_date: friday,
      is_active: true,
      created_at: '2026-11-24T00:00:00Z',
      updated_at: '2026-11-24T00:00:00Z'
    };

    setCachedOfficeClosuresForTesting([closedClosure], { weekly_off_days: [0, 6] });
    assert.equal(isDateOfficeClosedSync(friday).isClosed, true);

    // Clear/Reset Friday
    const clearRes = await clearHolidayForDate(friday, ADMIN_USER);
    assert.equal(clearRes.success, true);

    // Status should be restored to default working day
    const postReset = isDateOfficeClosedSync(friday);
    assert.equal(postReset.isClosed, false);
    assert.equal(postReset.reason, 'working_day');
    assert.equal(postReset.closure, undefined);

    // Reset
    setCachedOfficeClosuresForTesting([]);
  });

  test('5. Multi-closure date is cleanly reset without leaving stale open or closed records', async () => {
    const targetDate = '2026-12-28';
    // Simulate previous bug scenario where both a closed closure and an open closure existed
    const duplicateClosures: OfficeClosure[] = [
      {
        id: 'stale_closed',
        title: 'Office Closed (2026-12-28)',
        status: 'closed',
        event_type: 'special_closure',
        start_date: targetDate,
        end_date: targetDate,
        is_active: true,
        created_at: '2026-11-20T00:00:00Z',
        updated_at: '2026-11-20T00:00:00Z'
      },
      {
        id: 'stale_open',
        title: 'Office Open (2026-12-28)',
        status: 'open',
        event_type: 'special_closure',
        start_date: targetDate,
        end_date: targetDate,
        is_active: true,
        created_at: '2026-11-22T00:00:00Z',
        updated_at: '2026-11-22T00:00:00Z'
      }
    ];

    setCachedOfficeClosuresForTesting(duplicateClosures, { weekly_off_days: [0, 6] });

    // Reset must wipe ALL closures on that date
    const res = await clearHolidayForDate(targetDate, ADMIN_USER);
    assert.equal(res.success, true);

    const finalEval = isDateOfficeClosedSync(targetDate);
    assert.equal(finalEval.isClosed, false);
    assert.equal(finalEval.reason, 'working_day');
    assert.equal(finalEval.closure, undefined);

    // Reset
    setCachedOfficeClosuresForTesting([]);
  });
});

setTimeout(() => {
  process.exit(0);
}, 2500);


