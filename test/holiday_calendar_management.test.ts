import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDateOfficeClosure,
  getDayOfWeekEST,
  formatOfficeClosureMessage,
  DEFAULT_WEEKLY_OFF_DAYS,
  DEFAULT_WEEKLY_OFF_MESSAGE,
  DEFAULT_HOLIDAY_CLOSURE_MESSAGE,
  isDateOfficeClosedSync,
  setCachedOfficeClosuresForTesting,
  subscribeToOfficeClosures,
  toggleDateWorkingStatus,
  clearHolidayForDate,
  clearAllOfficeClosures,
  clearOfficeClosure,
  cleanupAllDuplicateClosures,
  shiftDateString
} from '../src/services/holidayService';
import {
  canManageHolidayCalendar,
  canViewHolidayCalendar,
  canOverrideWorkingDay,
  canClearAllHolidays
} from '../src/lib/permissions';
import { OfficeClosure, WeeklyOffConfig, User } from '../src/types';
import { findBestProxyForWindow } from '../src/services/interviewService';
import { addInterviewRound, updateInterviewRound } from '../src/services/storage';

const MOCK_PROXY: User = {
  id: 'proxy_test_1',
  full_name: 'Test Proxy',
  display_name: 'Test Proxy',
  email: 'testproxy@example.com',
  role: 'jpc_proxy',
  google_calendar_connected: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const ADMIN_USER: User = {
  id: 'user_admin',
  full_name: 'System Admin',
  display_name: 'Admin',
  email: 'admin@example.com',
  role: 'administrator',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const MANAGER_USER: User = {
  id: 'user_manager',
  full_name: 'Operations Manager',
  display_name: 'Manager',
  email: 'manager@example.com',
  role: 'jpc_manager',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const RECRUITER_USER: User = {
  id: 'user_recruiter',
  full_name: 'Recruiter User',
  display_name: 'Recruiter',
  email: 'recruiter@example.com',
  role: 'jpc_recruiter',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const PROXY_WITH_CALENDAR_MANAGEMENT: User = {
  ...MOCK_PROXY,
  id: 'proxy_authorized',
  can_manage_calendar: true
};

const PROXY_WITHOUT_CALENDAR_MANAGEMENT: User = {
  ...MOCK_PROXY,
  id: 'proxy_regular',
  can_manage_calendar: false
};

const CANDIDATE_USER: User = {
  id: 'user_cand',
  full_name: 'Candidate User',
  display_name: 'Candidate',
  email: 'candidate@example.com',
  role: 'candidate',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

test('1. Day of Week in EST (getDayOfWeekEST) correctly calculates Sunday=0 through Saturday=6', () => {
  // 2026-10-04 is Sunday (0)
  assert.equal(getDayOfWeekEST('2026-10-04'), 0);
  // 2026-10-05 is Monday (1)
  assert.equal(getDayOfWeekEST('2026-10-05'), 1);
  // 2026-10-06 is Tuesday (2)
  assert.equal(getDayOfWeekEST('2026-10-06'), 2);
  // 2026-10-07 is Wednesday (3)
  assert.equal(getDayOfWeekEST('2026-10-07'), 3);
  // 2026-10-08 is Thursday (4)
  assert.equal(getDayOfWeekEST('2026-10-08'), 4);
  // 2026-10-09 is Friday (5)
  assert.equal(getDayOfWeekEST('2026-10-09'), 5);
  // 2026-10-10 is Saturday (6)
  assert.equal(getDayOfWeekEST('2026-10-10'), 6);
});

test('2. Default Saturday and Sunday are recognized as weekly off closures', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [...DEFAULT_WEEKLY_OFF_DAYS],
    custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
  };

  const sunEval = checkDateOfficeClosure('2026-10-04', [], config);
  assert.equal(sunEval.isClosed, true);
  assert.equal(sunEval.reason, 'weekly_off');
  assert.equal(sunEval.message, DEFAULT_WEEKLY_OFF_MESSAGE);

  const satEval = checkDateOfficeClosure('2026-10-10', [], config);
  assert.equal(satEval.isClosed, true);
  assert.equal(satEval.reason, 'weekly_off');

  const monEval = checkDateOfficeClosure('2026-10-05', [], config);
  assert.equal(monEval.isClosed, false);
});

test('3. Disabling Saturday weekly closure makes Saturday available', () => {
  // Only Sunday (0) is off
  const config: WeeklyOffConfig = {
    weekly_off_days: [0],
    custom_message: 'Sundays are closed'
  };

  // Saturday 2026-10-10 is now OPEN
  const satEval = checkDateOfficeClosure('2026-10-10', [], config);
  assert.equal(satEval.isClosed, false);

  // Sunday 2026-10-04 remains CLOSED
  const sunEval = checkDateOfficeClosure('2026-10-04', [], config);
  assert.equal(sunEval.isClosed, true);
});

test('4. Disabling Sunday weekly closure makes Sunday available', () => {
  // Only Saturday (6) is off
  const config: WeeklyOffConfig = {
    weekly_off_days: [6],
    custom_message: 'Saturdays are closed'
  };

  // Sunday 2026-10-04 is now OPEN
  const sunEval = checkDateOfficeClosure('2026-10-04', [], config);
  assert.equal(sunEval.isClosed, false);

  // Saturday 2026-10-10 remains CLOSED
  const satEval = checkDateOfficeClosure('2026-10-10', [], config);
  assert.equal(satEval.isClosed, true);
});

test('5. Custom weekly off-day configuration (e.g. Friday and Saturday off, Sunday working)', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [5, 6], // Fri, Sat
    custom_message: 'Weekend observed on Friday and Saturday'
  };

  // Friday 2026-10-09 is CLOSED
  const friEval = checkDateOfficeClosure('2026-10-09', [], config);
  assert.equal(friEval.isClosed, true);

  // Saturday 2026-10-10 is CLOSED
  const satEval = checkDateOfficeClosure('2026-10-10', [], config);
  assert.equal(satEval.isClosed, true);

  // Sunday 2026-10-04 is OPEN
  const sunEval = checkDateOfficeClosure('2026-10-04', [], config);
  assert.equal(sunEval.isClosed, false);
});

test('6. Higher Authority working day override on a Saturday opens that specific date', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [0, 6],
    custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
  };

  const overrideSaturday: OfficeClosure = {
    id: 'override_sat_1',
    title: 'Special Working Saturday',
    event_type: 'other',
    start_date: '2026-10-10',
    end_date: '2026-10-10',
    is_active: true,
    is_override: true,
    is_working_day_override: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  };

  // Saturday 2026-10-10 has override -> OPEN
  const satEval = checkDateOfficeClosure('2026-10-10', [overrideSaturday], config);
  assert.equal(satEval.isClosed, false);
  assert.equal(satEval.reason, 'override_working');

  // Next Saturday 2026-10-17 does not have override -> CLOSED
  const nextSatEval = checkDateOfficeClosure('2026-10-17', [overrideSaturday], config);
  assert.equal(nextSatEval.isClosed, true);
  assert.equal(nextSatEval.reason, 'weekly_off');
});

test('7. Higher Authority special closure on a weekday blocks that date', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [0, 6]
  };

  const specialClosure: OfficeClosure = {
    id: 'closure_wed',
    title: 'Emergency Office Renovation',
    event_type: 'special_closure',
    start_date: '2026-10-07', // Wednesday
    end_date: '2026-10-07',
    is_active: true,
    is_override: true,
    is_working_day_override: false,
    custom_message: 'Office closed for renovation. Please select another day.',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  };

  const wedEval = checkDateOfficeClosure('2026-10-07', [specialClosure], config);
  assert.equal(wedEval.isClosed, true);
  assert.equal(wedEval.reason, 'override_closure');
  assert.equal(wedEval.message, 'Office closed for renovation. Please select another day.');

  // Tuesday 2026-10-06 remains OPEN
  const tueEval = checkDateOfficeClosure('2026-10-06', [specialClosure], config);
  assert.equal(tueEval.isClosed, false);
});

test('8. Multi-day custom holiday (Dec 24 - Dec 26) automatically blocks all dates in range', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [0, 6]
  };

  const christmasBreak: OfficeClosure = {
    id: 'xmas_break',
    title: 'Christmas & Winter Holiday',
    event_type: 'public_holiday',
    start_date: '2026-12-24',
    end_date: '2026-12-26',
    is_active: true,
    custom_message: 'Office closed for Christmas Holiday. Resuming Dec 27.',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  };

  // Dec 24, 25, 26 must all be closed
  for (const d of ['2026-12-24', '2026-12-25', '2026-12-26']) {
    const ev = checkDateOfficeClosure(d, [christmasBreak], config);
    assert.equal(ev.isClosed, true, `${d} should be closed`);
    assert.equal(ev.reason, 'holiday');
    assert.equal(ev.message, 'Office closed for Christmas Holiday. Resuming Dec 27.');
  }

  // Dec 23 and Dec 27 outside holiday range (if weekday)
  const dec23Eval = checkDateOfficeClosure('2026-12-23', [christmasBreak], config);
  assert.equal(dec23Eval.isClosed, false);
});

test('9. Hierarchy Precedence: Working Day Override beats Holiday and beats Weekly Off', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [0, 6]
  };

  // Holiday declared on Saturday Dec 26
  const holidaySat: OfficeClosure = {
    id: 'holiday_sat',
    title: 'Boxing Day',
    event_type: 'public_holiday',
    start_date: '2026-12-26',
    end_date: '2026-12-26',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  };

  // Explicit Higher Authority override forcing Dec 26 to be OPEN
  const overrideOpen: OfficeClosure = {
    id: 'override_dec26',
    title: 'Management Approved Urgent Interview Session',
    event_type: 'other',
    start_date: '2026-12-26',
    end_date: '2026-12-26',
    is_active: true,
    is_override: true,
    is_working_day_override: true,
    created_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z'
  };

  const evalResult = checkDateOfficeClosure('2026-12-26', [holidaySat, overrideOpen], config);
  assert.equal(evalResult.isClosed, false);
  assert.equal(evalResult.reason, 'override_working');
});

test('10. Inactive closures (is_active: false) are ignored and do not block bookings', () => {
  const config: WeeklyOffConfig = {
    weekly_off_days: [0, 6]
  };

  const cancelledHoliday: OfficeClosure = {
    id: 'cancelled_hol',
    title: 'Cancelled Office Day',
    event_type: 'public_holiday',
    start_date: '2026-10-06', // Tuesday
    end_date: '2026-10-06',
    is_active: false, // Inactive / Deleted
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  };

  const evalResult = checkDateOfficeClosure('2026-10-06', [cancelledHoliday], config);
  assert.equal(evalResult.isClosed, false);
});

test('11. formatOfficeClosureMessage returns customized messages with fallback hierarchy', () => {
  const msg1 = formatOfficeClosureMessage('Thanksgiving', 'Happy Thanksgiving! We are closed.');
  assert.equal(msg1, 'Happy Thanksgiving! We are closed.');

  const msg2 = formatOfficeClosureMessage('Memorial Day');
  assert.equal(msg2, 'Interview booking is unavailable on this date because the office is closed for Memorial Day. Please select another working day.');

  const msg3 = formatOfficeClosureMessage();
  assert.equal(msg3, DEFAULT_HOLIDAY_CLOSURE_MESSAGE);
});

test('12. findBestProxyForWindow rejects closed dates and returns closure message', () => {
  const holidayClosure: OfficeClosure = {
    id: 'thanksgiving_hol',
    title: 'Thanksgiving Day',
    event_type: 'public_holiday',
    start_date: '2026-11-26',
    end_date: '2026-11-26',
    is_active: true,
    custom_message: 'Our office is closed for Thanksgiving. Please select another date.'
  };

  const result = findBestProxyForWindow(
    '2026-11-26',
    '10:00',
    '10:30',
    [MOCK_PROXY],
    [],
    [],
    [],
    undefined,
    undefined,
    [holidayClosure],
    { weekly_off_days: [0, 6] }
  );

  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0], 'Our office is closed for Thanksgiving. Please select another date.');
});

test('13. findBestProxyForWindow allows booking on a Saturday when overridden by Higher Authority', () => {
  const satOverride: OfficeClosure = {
    id: 'sat_open',
    title: 'Working Saturday',
    event_type: 'other',
    start_date: '2026-10-10',
    end_date: '2026-10-10',
    is_active: true,
    is_override: true,
    is_working_day_override: true
  };

  const result = findBestProxyForWindow(
    '2026-10-10',
    '10:00',
    '10:30',
    [MOCK_PROXY],
    [],
    [],
    [],
    undefined,
    undefined,
    [satOverride],
    { weekly_off_days: [0, 6] }
  );

  assert.ok(result.bestProxy);
  assert.equal(result.bestProxy.id, 'proxy_test_1');
  assert.equal(result.errors.length, 0);
});

test('14. addInterviewRound rejects scheduling on an office closure date', async () => {
  const holidayClosure: OfficeClosure = {
    id: 'labor_day',
    title: 'Labor Day',
    event_type: 'public_holiday',
    start_date: '2026-09-07',
    end_date: '2026-09-07',
    is_active: true,
    custom_message: 'Office closed for Labor Day.'
  };

  setCachedOfficeClosuresForTesting([holidayClosure], { weekly_off_days: [0, 6] });

  await assert.rejects(
    async () => {
      await addInterviewRound({
        request_id: 'req_1',
        round_number: 1,
        round_label: 'Round 1',
        interview_date: '2026-09-07',
        booked_slot_time: '2026-09-07T10:00:00',
        booked_slot_end: '2026-09-07T10:30:00',
        status: 'booked'
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Office closed for Labor Day'));
      return true;
    }
  );

  // Reset cache
  setCachedOfficeClosuresForTesting([], { weekly_off_days: [] });
});

test('15. updateInterviewRound rejects rescheduling to a closed date', async () => {
  const holidayClosure: OfficeClosure = {
    id: 'new_year',
    title: 'New Year Day',
    event_type: 'public_holiday',
    start_date: '2027-01-01',
    end_date: '2027-01-01',
    is_active: true,
    custom_message: 'Happy New Year! Office closed.'
  };

  setCachedOfficeClosuresForTesting([holidayClosure], { weekly_off_days: [0, 6] });

  await assert.rejects(
    async () => {
      await updateInterviewRound('round_mock', {
        interview_date: '2027-01-01',
        booked_slot_time: '2027-01-01T11:00:00',
        booked_slot_end: '2027-01-01T11:30:00'
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Happy New Year! Office closed.'));
      return true;
    }
  );

  // Reset cache
  setCachedOfficeClosuresForTesting([], { weekly_off_days: [] });
});

test('16. RBAC: canManageHolidayCalendar correctly permits Admins, Managers, and Authorized Proxies', () => {
  assert.equal(canManageHolidayCalendar(ADMIN_USER), true);
  assert.equal(canManageHolidayCalendar(MANAGER_USER), true);
  assert.equal(canManageHolidayCalendar(PROXY_WITH_CALENDAR_MANAGEMENT), true);

  // Unauthorized users cannot manage
  assert.equal(canManageHolidayCalendar(PROXY_WITHOUT_CALENDAR_MANAGEMENT), false);
  assert.equal(canManageHolidayCalendar(RECRUITER_USER), false);
  assert.equal(canManageHolidayCalendar(CANDIDATE_USER), false);
  assert.equal(canManageHolidayCalendar(null), false);
});

test('17. RBAC: canOverrideWorkingDay restricted strictly to Higher Authorities and Admins', () => {
  assert.equal(canOverrideWorkingDay(ADMIN_USER), true);
  assert.equal(canOverrideWorkingDay(MANAGER_USER), true);

  // Even authorized proxy cannot override working schedule
  assert.equal(canOverrideWorkingDay(PROXY_WITH_CALENDAR_MANAGEMENT), false);
  assert.equal(canOverrideWorkingDay(RECRUITER_USER), false);
  assert.equal(canOverrideWorkingDay(CANDIDATE_USER), false);
});

test('18. RBAC: canViewHolidayCalendar allows staff and recruiters but excludes candidates', () => {
  assert.equal(canViewHolidayCalendar(ADMIN_USER), true);
  assert.equal(canViewHolidayCalendar(MANAGER_USER), true);
  assert.equal(canViewHolidayCalendar(RECRUITER_USER), true);
  assert.equal(canViewHolidayCalendar(MOCK_PROXY), true);

  // Candidate is excluded from internal holiday calendar view
  assert.equal(canViewHolidayCalendar(CANDIDATE_USER), false);
  assert.equal(canViewHolidayCalendar(null), false);
});

test('19. Real-time updates: subscribeToOfficeClosures triggers synchronously and receives instant notifications without refresh', () => {
  let receivedClosures: OfficeClosure[] = [];
  const unsub = subscribeToOfficeClosures((closures) => {
    receivedClosures = closures;
  });

  const testClosure: OfficeClosure = {
    id: 'realtime_test',
    title: 'Real-Time Update Office Holiday',
    event_type: 'company_holiday',
    start_date: '2026-11-27',
    end_date: '2026-11-27',
    is_active: true,
    created_at: '2026-11-24T12:00:00Z',
    updated_at: '2026-11-24T12:00:00Z'
  };

  setCachedOfficeClosuresForTesting([testClosure]);
  assert.equal(receivedClosures.length, 1);
  assert.equal(receivedClosures[0].title, 'Real-Time Update Office Holiday');

  // Verify sync evaluation immediately reflects update without page reload
  const evalResult = isDateOfficeClosedSync('2026-11-27');
  assert.equal(evalResult.isClosed, true);
  assert.equal(evalResult.title, 'Real-Time Update Office Holiday');

  unsub();
  setCachedOfficeClosuresForTesting([]);
});

test('20. Robust date parsing: checkDateOfficeClosure handles null, empty, or malformed closure objects safely without crashing', () => {
  // Empty date
  assert.equal(checkDateOfficeClosure('').isClosed, false);
  // Malformed date
  assert.equal(checkDateOfficeClosure('invalid-date').isClosed, false);
  // Malformed closure list with nulls or missing fields
  const malformedClosures = [
    null as any,
    undefined as any,
    { id: 'broken1' } as any,
    { id: 'broken2', start_date: undefined } as any,
    { id: 'valid', title: 'Safe Holiday', start_date: '2026-12-25', end_date: '2026-12-25', is_active: true } as OfficeClosure
  ];

  const evalResult = checkDateOfficeClosure('2026-12-25', malformedClosures, { weekly_off_days: [] });
  assert.equal(evalResult.isClosed, true);
  assert.equal(evalResult.title, 'Safe Holiday');
});

test('21. Working Day Toggle: Switching Office Closed to Office Open restores booking availability immediately', async () => {
  // Saturday date (default closed)
  const satDate = '2026-11-28';
  setCachedOfficeClosuresForTesting([], { weekly_off_days: [0, 6] });
  assert.equal(checkDateOfficeClosure(satDate, undefined, { weekly_off_days: [0, 6] }).isClosed, true);

  // Toggle to Office Open
  const res = await toggleDateWorkingStatus(satDate, 'open', ADMIN_USER);
  assert.equal(res.success, true);
  assert.equal(res.newStatus, 'open');

  // Verify sync evaluation is now OPEN and bookings are restored
  const postEval = isDateOfficeClosedSync(satDate);
  assert.equal(postEval.isClosed, false);
  assert.equal(postEval.status, 'open');

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('22. Working Day Toggle: Switching Office Open to Office Closed immediately blocks bookings', async () => {
  // Wednesday date (default working day)
  const wedDate = '2026-12-02';
  setCachedOfficeClosuresForTesting([], { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync(wedDate).isClosed, false);

  // Toggle to Office Closed
  const res = await toggleDateWorkingStatus(wedDate, 'closed', ADMIN_USER);
  assert.equal(res.success, true);
  assert.equal(res.newStatus, 'closed');

  // Verify sync evaluation is now CLOSED and bookings are blocked
  const postEval = isDateOfficeClosedSync(wedDate);
  assert.equal(postEval.isClosed, true);
  assert.equal(postEval.status, 'closed');

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('23. Clear Holiday: Clearing a specific single-date holiday removes restriction and restores default weekly schedule', async () => {
  // Wednesday holiday
  const holDate = '2026-12-09';
  const closure: OfficeClosure = {
    id: 'hol_single_1',
    title: 'Special Closure Day',
    event_type: 'special_closure',
    status: 'closed',
    start_date: holDate,
    end_date: holDate,
    is_active: true,
    created_at: '2026-11-24T00:00:00Z',
    updated_at: '2026-11-24T00:00:00Z'
  };

  setCachedOfficeClosuresForTesting([closure], { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync(holDate).isClosed, true);

  // Clear the holiday
  const clearRes = await clearHolidayForDate(holDate, ADMIN_USER);
  assert.equal(clearRes.success, true);

  // Wednesday returns to default schedule (working day = open)
  const postEval = isDateOfficeClosedSync(holDate);
  assert.equal(postEval.isClosed, false);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('24. Clear Holiday: Clearing one date from a multi-day holiday splits/shifts range and restores availability for that date', async () => {
  // 3-day closure: 2026-12-15 to 2026-12-17
  const multiClosure: OfficeClosure = {
    id: 'multi_closure_1',
    title: 'Winter Maintenance Period',
    event_type: 'company_holiday',
    status: 'closed',
    start_date: '2026-12-15',
    end_date: '2026-12-17',
    is_active: true,
    created_at: '2026-11-24T00:00:00Z',
    updated_at: '2026-11-24T00:00:00Z'
  };

  setCachedOfficeClosuresForTesting([multiClosure], { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync('2026-12-15').isClosed, true);
  assert.equal(isDateOfficeClosedSync('2026-12-16').isClosed, true);
  assert.equal(isDateOfficeClosedSync('2026-12-17').isClosed, true);

  // Clear middle date: 2026-12-16
  const clearRes = await clearHolidayForDate('2026-12-16', ADMIN_USER, false);
  assert.equal(clearRes.success, true);

  // 2026-12-16 should now be OPEN (normal Wednesday working day)
  assert.equal(isDateOfficeClosedSync('2026-12-16').isClosed, false);
  // 2026-12-15 and 2026-12-17 must remain CLOSED
  assert.equal(isDateOfficeClosedSync('2026-12-15').isClosed, true);
  assert.equal(isDateOfficeClosedSync('2026-12-17').isClosed, true);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('25. Clear Holiday: Clearing entire holiday range removes all dates in the range', async () => {
  const multiClosure: OfficeClosure = {
    id: 'multi_closure_2',
    title: 'Long Holiday',
    event_type: 'public_holiday',
    status: 'closed',
    start_date: '2026-12-22',
    end_date: '2026-12-24',
    is_active: true,
    created_at: '2026-11-24T00:00:00Z',
    updated_at: '2026-11-24T00:00:00Z'
  };

  setCachedOfficeClosuresForTesting([multiClosure], { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync('2026-12-23').isClosed, true);

  // Clear entire range
  const clearRes = await clearHolidayForDate('2026-12-23', ADMIN_USER, true);
  assert.equal(clearRes.success, true);
  assert.equal(clearRes.clearedRange, true);

  // All 3 days now return to default weekday schedule (open)
  assert.equal(isDateOfficeClosedSync('2026-12-22').isClosed, false);
  assert.equal(isDateOfficeClosedSync('2026-12-23').isClosed, false);
  assert.equal(isDateOfficeClosedSync('2026-12-24').isClosed, false);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('26. Clear All Holidays: Removes all manual entries while preserving default Saturday & Sunday weekly offs', async () => {
  const manualClosures: OfficeClosure[] = [
    {
      id: 'c1',
      title: 'Manual Closure 1',
      event_type: 'public_holiday',
      start_date: '2026-12-01',
      end_date: '2026-12-01',
      is_active: true,
      created_at: '2026-11-24T00:00:00Z',
      updated_at: '2026-11-24T00:00:00Z'
    },
    {
      id: 'c2',
      title: 'Manual Closure 2',
      event_type: 'company_holiday',
      start_date: '2026-12-08',
      end_date: '2026-12-08',
      is_active: true,
      created_at: '2026-11-24T00:00:00Z',
      updated_at: '2026-11-24T00:00:00Z'
    }
  ];

  setCachedOfficeClosuresForTesting(manualClosures, { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync('2026-12-01').isClosed, true);
  assert.equal(isDateOfficeClosedSync('2026-12-08').isClosed, true);

  // Clear All
  const clearAllRes = await clearAllOfficeClosures(ADMIN_USER);
  assert.equal(clearAllRes.success, true);

  // Manual closures are cleared
  assert.equal(isDateOfficeClosedSync('2026-12-01').isClosed, false);
  assert.equal(isDateOfficeClosedSync('2026-12-08').isClosed, false);

  // CRITICAL: Default Saturday and Sunday weekly off schedule remains 100% active!
  assert.equal(isDateOfficeClosedSync('2026-12-05').isClosed, true); // Saturday
  assert.equal(isDateOfficeClosedSync('2026-12-06').isClosed, true); // Sunday

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('27. RBAC: canClearAllHolidays permits only Higher Authorities and Admins', () => {
  assert.equal(canClearAllHolidays(ADMIN_USER), true);
  assert.equal(canClearAllHolidays(MANAGER_USER), true);

  // Unauthorized users cannot clear all holidays
  assert.equal(canClearAllHolidays(PROXY_WITH_CALENDAR_MANAGEMENT), false);
  assert.equal(canClearAllHolidays(PROXY_WITHOUT_CALENDAR_MANAGEMENT), false);
  assert.equal(canClearAllHolidays(RECRUITER_USER), false);
  assert.equal(canClearAllHolidays(CANDIDATE_USER), false);
  assert.equal(canClearAllHolidays(null), false);
});

test('28. Single-Badge Guarantee: Toggling a date multiple times never creates duplicate entries', async () => {
  const targetDate = '2026-12-16'; // Wednesday
  setCachedOfficeClosuresForTesting([], { weekly_off_days: [0, 6] });
  assert.equal(isDateOfficeClosedSync(targetDate).isClosed, false);

  // 1st Toggle: Make closed
  await toggleDateWorkingStatus(targetDate, 'closed', ADMIN_USER);
  assert.equal(isDateOfficeClosedSync(targetDate).isClosed, true);

  // 2nd Toggle: Switch to open
  await toggleDateWorkingStatus(targetDate, 'open', ADMIN_USER);
  assert.equal(isDateOfficeClosedSync(targetDate).isClosed, false);

  // 3rd Toggle: Switch back to closed
  await toggleDateWorkingStatus(targetDate, 'closed', ADMIN_USER);
  assert.equal(isDateOfficeClosedSync(targetDate).isClosed, true);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('29. Multi-Closure Reset: Clearing a date with duplicate/redundant closures removes ALL of them and restores default', async () => {
  const targetDate = '2026-12-28';
  // Simulate duplicate closures created previously
  const dupClosures: OfficeClosure[] = [
    {
      id: 'dup_closed_1',
      title: 'Office Closed',
      status: 'closed',
      event_type: 'special_closure',
      start_date: targetDate,
      end_date: targetDate,
      is_active: true,
      created_at: '2026-11-24T00:00:00Z',
      updated_at: '2026-11-24T00:00:00Z'
    },
    {
      id: 'dup_closed_2',
      title: 'Office Closed',
      status: 'closed',
      event_type: 'special_closure',
      start_date: targetDate,
      end_date: targetDate,
      is_active: true,
      created_at: '2026-11-24T00:01:00Z',
      updated_at: '2026-11-24T00:01:00Z'
    },
    {
      id: 'dup_open_1',
      title: 'Office Open (2026-12-28)',
      status: 'open',
      event_type: 'special_closure',
      start_date: targetDate,
      end_date: targetDate,
      is_active: true,
      is_working_day_override: true,
      created_at: '2026-11-24T00:02:00Z',
      updated_at: '2026-11-24T00:02:00Z'
    }
  ];

  setCachedOfficeClosuresForTesting(dupClosures, { weekly_off_days: [0, 6] });

  // Clear this date
  const clearRes = await clearHolidayForDate(targetDate, ADMIN_USER);
  assert.equal(clearRes.success, true);

  // Must cleanly return to default schedule (Monday is open, no closures remaining)
  const evalPost = isDateOfficeClosedSync(targetDate);
  assert.equal(evalPost.isClosed, false);
  assert.equal(evalPost.closure, undefined);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});

test('30. Deduplication: cleanupAllDuplicateClosures removes duplicate records on same date while preserving unique closures', async () => {
  const closuresWithDuplicates: OfficeClosure[] = [
    {
      id: 'dup_a1',
      title: 'Office Closed (2026-12-25)',
      status: 'closed',
      event_type: 'public_holiday',
      start_date: '2026-12-25',
      end_date: '2026-12-25',
      is_active: true,
      created_at: '2026-11-20T00:00:00Z',
      updated_at: '2026-11-20T00:00:00Z'
    },
    {
      id: 'dup_a2',
      title: 'Office Closed (2026-12-25)',
      status: 'closed',
      event_type: 'public_holiday',
      start_date: '2026-12-25',
      end_date: '2026-12-25',
      is_active: true,
      created_at: '2026-11-24T00:00:00Z',
      updated_at: '2026-11-24T00:00:00Z'
    },
    {
      id: 'unique_b',
      title: 'New Year Day',
      status: 'closed',
      event_type: 'public_holiday',
      start_date: '2027-01-01',
      end_date: '2027-01-01',
      is_active: true,
      created_at: '2026-11-20T00:00:00Z',
      updated_at: '2026-11-20T00:00:00Z'
    }
  ];

  setCachedOfficeClosuresForTesting(closuresWithDuplicates, { weekly_off_days: [0, 6] });

  const cleanRes = await cleanupAllDuplicateClosures(ADMIN_USER);
  assert.equal(cleanRes.cleanedClosuresCount, 1); // 1 duplicate removed

  // Both dates still evaluate properly without crash
  assert.equal(isDateOfficeClosedSync('2026-12-25').isClosed, true);
  assert.equal(isDateOfficeClosedSync('2027-01-01').isClosed, true);

  // Reset
  setCachedOfficeClosuresForTesting([]);
});


