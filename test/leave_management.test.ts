import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLeaveRange,
  isUserOnLeaveDuring,
  isUserCurrentlyOnLeave,
  formatLeavePeriod
} from '../src/lib/utils';
import {
  findBestProxyForWindow,
  assignProxiesForRounds,
  resolveBestSlotForBooking,
  getProxyConflictingRounds,
  isProxyUser,
  getProxyLeaveStatusForDate,
  shouldHideProxyLeaveFromRole,
  hasActiveOrFutureLeave,
  getActiveOrFutureProxyLeaves
} from '../src/services/interviewService';
import {
  getNextDayDateString,
  buildProxyLeaveCalendarPayload
} from '../src/services/calendarService';
import { ProxyAvailability, InterviewRound } from '../src/types';

// =========================================================================
// MOCK DATA SETUP
// =========================================================================
const NIHAL = {
  id: 'u_nihal',
  display_name: 'Nihal Proxy',
  email: 'nihalnx09@gmail.com',
  role: 'jpc_proxy',
  google_calendar_connected: true
};

const RUDRA = {
  id: 'u_rudra',
  display_name: 'Rudraksh Rawal',
  email: 'rudra@example.com',
  role: 'jpc_proxy',
  google_calendar_connected: true
};

const YASH = {
  id: 'u_yash',
  display_name: 'Yash Proxy',
  email: 'yash.proxy@auriic.co',
  role: 'jpc_proxy',
  google_calendar_connected: true
};

// =========================================================================
// 1. DATE-RANGE PARSING & BOUNDARY TESTS
// =========================================================================
test('1.1 parseLeaveRange: correctly parses date range in EST', () => {
  const range = parseLeaveRange('2026-11-05', '2026-11-08');
  assert.ok(range);
  assert.equal(range.start.getFullYear(), 2026);
  assert.equal(range.start.getMonth(), 10); // Nov is 10 (0-indexed)
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDate(), 8);
  assert.ok(range.start < range.end);
});

test('1.2 parseLeaveRange: correctly parses single day leave', () => {
  const range = parseLeaveRange('2026-11-05', '2026-11-05');
  assert.ok(range);
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDate(), 5);
  assert.ok(range.start < range.end); // 00:00:00 < 23:59:59
});

test('1.3 parseLeaveRange: auto-normalizes inverted dates (start > end)', () => {
  const range = parseLeaveRange('2026-11-10', '2026-11-05');
  assert.ok(range);
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDate(), 10);
  assert.ok(range.start < range.end);
});

test('1.4 parseLeaveRange: handles empty or invalid dates cleanly', () => {
  assert.equal(parseLeaveRange(null, null), null);
  assert.equal(parseLeaveRange(undefined, undefined), null);
  assert.equal(parseLeaveRange('', ''), null);
  assert.equal(parseLeaveRange('invalid', 'dates'), null);
});

// =========================================================================
// 2. DISPLAY & DURATION FORMATTING TESTS
// =========================================================================
test('2.1 formatLeavePeriod: formats date range cleanly with duration', () => {
  const formatted = formatLeavePeriod('2026-11-05', '2026-11-08');
  assert.equal(formatted, 'Nov 05, 2026 - Nov 08, 2026 (EST)');

  const singleDay = formatLeavePeriod('2026-11-05', '2026-11-05');
  assert.equal(singleDay, 'Nov 05, 2026 (EST)');
});

test('2.2 formatLeavePeriod: handles open-ended or legacy return date', () => {
  const returnOnly = formatLeavePeriod(null, null, '2026-11-12T18:00:00');
  assert.equal(returnOnly, 'Until Nov 12, 2026 (EST)');

  const startOnly = formatLeavePeriod('2026-11-05', null);
  assert.equal(startOnly, 'From Nov 05, 2026 (EST)');
});

// =========================================================================
// 3. OVERLAP & AVAILABILITY STATUS TESTS
// =========================================================================
test('3.1 isUserOnLeaveDuring: detects overlap with interview slot', () => {
  const user = {
    is_on_leave: true,
    leave_start_date: '2026-11-05',
    leave_end_date: '2026-11-08'
  };

  // During leave (Nov 6 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00', '2026-11-06T14:30:00'), true);

  // Boundary check: On start date at 00:00:01
  assert.equal(isUserOnLeaveDuring(user, '2026-11-05T00:00:01', '2026-11-05T00:30:00'), true);

  // Boundary check: On end date at 23:58:00
  assert.equal(isUserOnLeaveDuring(user, '2026-11-08T23:30:00', '2026-11-08T23:59:00'), true);

  // Before leave (Nov 4 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-04T14:00:00', '2026-11-04T14:30:00'), false);

  // After leave (Nov 9 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-09T14:00:00', '2026-11-09T14:30:00'), false);
});

test('3.2 isUserOnLeaveDuring: handles manual indefinite override without dates', () => {
  const user = { is_on_leave: true };
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00'), true);
  assert.equal(isUserOnLeaveDuring(user, '2027-01-01T10:00:00'), true);
});

test('3.3 isUserOnLeaveDuring: handles legacy leave_return_date', () => {
  const user = {
    is_on_leave: true,
    leave_return_date: '2026-11-08T18:00:00'
  };
  // Before return date
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00'), true);
  // After return date
  assert.equal(isUserOnLeaveDuring(user, '2026-11-09T10:00:00'), false);
});

// =========================================================================
// 4. GOOGLE CALENDAR PAYLOAD & FORMATTING TESTS
// =========================================================================
test('4.1 getNextDayDateString: handles month, year rollovers and leap years for exclusive Google end date', () => {
  assert.equal(getNextDayDateString('2026-11-05'), '2026-11-06');
  assert.equal(getNextDayDateString('2026-11-30'), '2026-12-01');
  assert.equal(getNextDayDateString('2026-12-31'), '2027-01-01');
  assert.equal(getNextDayDateString('2028-02-28'), '2028-02-29'); // Leap year
  assert.equal(getNextDayDateString('2028-02-29'), '2028-03-01'); // Leap day to next month
});

test('4.2 buildProxyLeaveCalendarPayload: generates red ON LEAVE label, opaque busy status, and duration', () => {
  const payload = buildProxyLeaveCalendarPayload(
    'Nihal Proxy',
    '2026-11-05',
    '2026-11-08',
    'nihalnx09@gmail.com'
  );

  // 1. Summary has prominent red ON LEAVE indicator and member name and duration
  assert.ok(payload.summary.startsWith('🔴 ON LEAVE: Nihal Proxy'));
  assert.ok(payload.summary.includes('Nov 05, 2026 - Nov 08, 2026 (EST)'));

  // 2. Google Calendar Tomato (Red) colorId
  assert.equal(payload.colorId, '11');

  // 3. Busy status to block scheduling in Google Calendar FreeBusy queries
  assert.equal(payload.transparency, 'opaque');

  // 4. All-day date range with exclusive end date
  assert.equal(payload.isAllDay, true);
  assert.equal(payload.startTime, '2026-11-05');
  assert.equal(payload.endTime, '2026-11-09'); // Next day after Nov 08

  // 5. Description contains full context
  assert.ok(payload.description.includes('Team Member: Nihal Proxy'));
  assert.ok(payload.description.includes('Status: Unavailable'));
  assert.ok(payload.description.includes('Placify CRM Interview Support System'));

  // 6. Attendee contains proxy email with accepted status
  assert.equal(payload.attendees?.[0]?.email, 'nihalnx09@gmail.com');
  assert.equal(payload.attendees?.[0]?.responseStatus, 'accepted');
});

test('4.3 buildProxyLeaveCalendarPayload: handles single-day leave properly', () => {
  const payload = buildProxyLeaveCalendarPayload('Rudraksh Rawal', '2026-11-15', '2026-11-15');
  assert.equal(payload.summary, '🔴 ON LEAVE: Rudraksh Rawal (Nov 15, 2026 (EST))');
  assert.equal(payload.startTime, '2026-11-15');
  assert.equal(payload.endTime, '2026-11-16');
  assert.equal(payload.colorId, '11');
  assert.equal(payload.transparency, 'opaque');
});

// =========================================================================
// 5. INTERVIEW SCHEDULING & ASSIGNMENT BLOCKING TESTS
// =========================================================================
test('5.1 findBestProxyForWindow: respects date-range leave in scheduling workflow', () => {
  const nihalOnLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-05',
    leave_end_date: '2026-11-08'
  };

  // On Nov 6: Nihal is blocked, Rudra is picked
  const resultNov6 = findBestProxyForWindow('2026-11-06', '10:00', '10:30', [nihalOnLeave, RUDRA], [], []);
  assert.equal(resultNov6.bestProxy?.id, 'u_rudra');
  assert.deepEqual(resultNov6.availableProxies.map(p => p.id), ['u_rudra']);

  // On Nov 4: Both are available
  const resultNov4 = findBestProxyForWindow('2026-11-04', '10:00', '10:30', [nihalOnLeave, RUDRA], [], []);
  assert.equal(resultNov4.availableProxies.length, 2);

  // On Nov 9: Both are available
  const resultNov9 = findBestProxyForWindow('2026-11-09', '10:00', '10:30', [nihalOnLeave, RUDRA], [], []);
  assert.equal(resultNov9.availableProxies.length, 2);
});

test('5.2 findBestProxyForWindow: returns error when all eligible proxies are on leave', () => {
  const nihalOnLeave = { ...NIHAL, is_on_leave: true, leave_start_date: '2026-11-05', leave_end_date: '2026-11-08' };
  const rudraOnLeave = { ...RUDRA, is_on_leave: true, leave_start_date: '2026-11-06', leave_end_date: '2026-11-07' };

  const result = findBestProxyForWindow('2026-11-06', '14:00', '14:30', [nihalOnLeave, rudraOnLeave], [], []);
  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].includes('BOTH PROXY MEMBERS HAVE LEAVE BOOKED FOR THE SELECTED DATE. NO PROXY IS AVAILABLE FOR THIS INTERVIEW.'));
});

test('5.3 findBestProxyForWindow: blocks proxy based on synchronized calendarEvents', () => {
  const calEvents = [
    {
      event_type: 'proxy_leave',
      proxy_user_id: 'u_nihal',
      start_time: '2026-11-05T00:00:00',
      end_time: '2026-11-08T23:59:59',
      summary: '🔴 ON LEAVE: Nihal (Nov 05, 2026 - Nov 08, 2026 (EST))'
    }
  ];

  // Even if user doc itself didn't have leave flag set, calendar event blocks them
  const plainNihal = { ...NIHAL, is_on_leave: false };
  const result = findBestProxyForWindow(
    '2026-11-06',
    '14:00',
    '14:30',
    [plainNihal, RUDRA],
    [],
    [],
    calEvents
  );

  assert.equal(result.bestProxy?.id, 'u_rudra');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_rudra']);
});

test('5.4 assignProxiesForRounds: handles sequential multi-round scheduling with proxy on leave', () => {
  const nihalOnLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-05',
    leave_end_date: '2026-11-06'
  };

  // Round 1 on Nov 5 (Nihal on leave -> Rudra must take it)
  // Round 2 on Nov 7 (Nihal returned -> both free, Nihal has 0 workload vs Rudra 1 workload, Nihal takes it!)
  const roundsInput = [
    { interview_date: '2026-11-05', start_time: '10:00', end_time: '10:30', duration: 30 },
    { interview_date: '2026-11-07', start_time: '10:00', end_time: '10:30', duration: 30 },
  ];

  const result = assignProxiesForRounds(roundsInput, [nihalOnLeave, RUDRA], [], []);
  assert.equal(result.roundAssignments[0].bestProxy?.id, 'u_rudra');
  assert.equal(result.roundAssignments[1].bestProxy?.id, 'u_nihal');
});

test('5.5 resolveBestSlotForBooking: excludes proxy on leave from winning public slot', () => {
  const nihalOnLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-05',
    leave_end_date: '2026-11-08'
  };

  const sameTimeSlots: ProxyAvailability[] = [
    {
      id: 'slot_1',
      proxy_user_id: 'u_nihal',
      slot_start: '2026-11-06T14:00:00',
      slot_end: '2026-11-06T15:00:00',
      slot_status: 'available',
      created_at: ''
    },
    {
      id: 'slot_2',
      proxy_user_id: 'u_rudra',
      slot_start: '2026-11-06T14:00:00',
      slot_end: '2026-11-06T15:00:00',
      slot_status: 'available',
      created_at: ''
    }
  ];

  const winningSlot = resolveBestSlotForBooking(
    '2026-11-06T14:00:00',
    '2026-11-06T15:00:00',
    sameTimeSlots,
    [nihalOnLeave, RUDRA],
    [],
    []
  );

  assert.ok(winningSlot);
  assert.equal(winningSlot.id, 'slot_2'); // Rudra's slot wins, Nihal is on leave
});

// =========================================================================
// 6. PRESERVATION OF EXISTING BOOKED ROUNDS
// =========================================================================
test('6.1 getProxyConflictingRounds: detects only conflicting rounds within leave window and ignores other proxies or cancelled rounds', () => {
  const allRounds: InterviewRound[] = [
    // Overlapping round for Nihal (should be detected)
    {
      id: 'rnd_1',
      request_id: 'req_1',
      round_number: 1,
      round_label: 'Tech Round',
      proxy_user_id: 'u_nihal',
      status: 'confirmed',
      interview_date: '2026-11-06',
      booked_slot_time: '2026-11-06T14:00:00',
      booked_slot_end: '2026-11-06T14:30:00',
      created_at: '',
      updated_at: ''
    },
    // Non-overlapping round for Nihal (Nov 10, outside leave)
    {
      id: 'rnd_2',
      request_id: 'req_2',
      round_number: 1,
      round_label: 'Tech Round 2',
      proxy_user_id: 'u_nihal',
      status: 'confirmed',
      interview_date: '2026-11-10',
      booked_slot_time: '2026-11-10T14:00:00',
      booked_slot_end: '2026-11-10T14:30:00',
      created_at: '',
      updated_at: ''
    },
    // Overlapping round for Rudra (different proxy, must not be flagged)
    {
      id: 'rnd_3',
      request_id: 'req_3',
      round_number: 1,
      round_label: 'Tech Round 3',
      proxy_user_id: 'u_rudra',
      status: 'confirmed',
      interview_date: '2026-11-06',
      booked_slot_time: '2026-11-06T14:00:00',
      booked_slot_end: '2026-11-06T14:30:00',
      created_at: '',
      updated_at: ''
    },
    // Cancelled round for Nihal (cancelled, must not be flagged)
    {
      id: 'rnd_4',
      request_id: 'req_4',
      round_number: 1,
      round_label: 'Tech Round 4',
      proxy_user_id: 'u_nihal',
      status: 'cancelled',
      interview_date: '2026-11-06',
      booked_slot_time: '2026-11-06T15:00:00',
      booked_slot_end: '2026-11-06T15:30:00',
      created_at: '',
      updated_at: ''
    }
  ];

  const conflicts = getProxyConflictingRounds('u_nihal', '2026-11-05', '2026-11-08', allRounds);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].id, 'rnd_1');
});

// =========================================================================
// 7. PROXY LEAVE STATUS VISIBILITY & VALIDATION (CREATE SUPPORT REQUEST & PROXY CENTRAL)
// =========================================================================
test('7.1 getProxyLeaveStatusForDate: correctly identifies on-leave proxy with leave dates and warning message', () => {
  const proxyOnLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const status = getProxyLeaveStatusForDate(proxyOnLeave, '2026-11-10');
  assert.equal(status.isOnLeave, true);
  assert.equal(status.proxyName, 'Nihal Proxy');
  assert.equal(status.leaveFrom, '2026-11-09');
  assert.equal(status.leaveTo, '2026-11-15');
  assert.equal(status.leavePeriodText, 'Nov 09, 2026 - Nov 15, 2026 (EST)');
  assert.equal(status.message, 'THIS PROXY HAS ALREADY BOOKED LEAVE FOR THE SELECTED DATE. PLEASE CHECK AVAILABILITY BEFORE SCHEDULING THE INTERVIEW.');
});

test('7.2 getProxyLeaveStatusForDate: correctly identifies active proxy outside leave window', () => {
  const proxyWithLeaveNextWeek = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  // Target date is before leave window
  const statusBefore = getProxyLeaveStatusForDate(proxyWithLeaveNextWeek, '2026-11-04');
  assert.equal(statusBefore.isOnLeave, false);
  assert.equal(statusBefore.message, 'Available');

  // Target date is after leave window
  const statusAfter = getProxyLeaveStatusForDate(proxyWithLeaveNextWeek, '2026-11-16');
  assert.equal(statusAfter.isOnLeave, false);
  assert.equal(statusAfter.message, 'Available');
});

test('7.3 findBestProxyForWindow: returns prominent warning when both proxy members are on leave', () => {
  const nihalLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const rudraLeave = {
    ...RUDRA,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const result = findBestProxyForWindow(
    '2026-11-10',
    '10:30',
    '11:00',
    [nihalLeave, rudraLeave],
    [],
    []
  );

  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0], 'BOTH PROXY MEMBERS HAVE LEAVE BOOKED FOR THE SELECTED DATE. NO PROXY IS AVAILABLE FOR THIS INTERVIEW.');
});

test('7.4 findBestProxyForWindow: selects available proxy when only one proxy is on leave', () => {
  const nihalLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const rudraActive = {
    ...RUDRA,
    is_on_leave: false,
    leave_start_date: null,
    leave_end_date: null
  };

  const result = findBestProxyForWindow(
    '2026-11-10',
    '10:30',
    '11:00',
    [nihalLeave, rudraActive],
    [],
    []
  );

  assert.ok(result.bestProxy);
  assert.equal(result.bestProxy.id, 'u_rudra');
  assert.equal(result.availableProxies.length, 1);
  assert.equal(result.availableProxies[0].id, 'u_rudra');
});

test('7.5 assignProxiesForRounds: rejects multi-round assignment when both proxies are on leave for any round', () => {
  const nihalLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const rudraLeave = {
    ...RUDRA,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  const rounds = [
    { label: 'Round 1: Screening', interview_date: '2026-11-10', start_time: '10:30', end_time: '11:00' },
    { label: 'Round 2: Technical', interview_date: '2026-11-10', start_time: '14:00', end_time: '15:00' }
  ];

  const result = assignProxiesForRounds(
    rounds,
    [nihalLeave, rudraLeave],
    [],
    []
  );

  assert.equal(result.roundAssignments[0].bestProxy, null);
  assert.equal(result.roundAssignments[0].errors[0], 'BOTH PROXY MEMBERS HAVE LEAVE BOOKED FOR THE SELECTED DATE. NO PROXY IS AVAILABLE FOR THIS INTERVIEW.');
  assert.equal(result.roundAssignments[1].bestProxy, null);
  assert.equal(result.roundAssignments[1].errors[0], 'BOTH PROXY MEMBERS HAVE LEAVE BOOKED FOR THE SELECTED DATE. NO PROXY IS AVAILABLE FOR THIS INTERVIEW.');
});

// =========================================================================
// 8. ROLE-BASED PRIVACY & REAL-TIME FUTURE LEAVE ALERTS
// =========================================================================
test('8.1 shouldHideProxyLeaveFromRole: hides proxy leave status from lead and sales teams only', () => {
  // Restricted roles
  assert.equal(shouldHideProxyLeaveFromRole('jpc_lead_gen'), true);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_sales'), true);
  assert.equal(shouldHideProxyLeaveFromRole('aurrum_sales'), true);
  assert.equal(shouldHideProxyLeaveFromRole('candidate'), true);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_candidate'), true);

  // Authorized roles that MUST see proxy leave alerts
  assert.equal(shouldHideProxyLeaveFromRole('administrator'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_sysadmin'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_manager'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_recruiter'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_cs'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_proxy'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_compliance_person'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_marketing'), false);
  assert.equal(shouldHideProxyLeaveFromRole(undefined), false);
});

test('8.2 hasActiveOrFutureLeave: immediately flags saved leave even if start date is in future', () => {
  // Proxy has leave scheduled in the future (Nov 09 to Nov 15, 2026)
  const proxyFutureLeave = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-09',
    leave_end_date: '2026-11-15'
  };

  // Immediate detection on Nov 04 (today)
  assert.equal(hasActiveOrFutureLeave(proxyFutureLeave, '2026-11-04'), true);

  // Detection during the leave window
  assert.equal(hasActiveOrFutureLeave(proxyFutureLeave, '2026-11-10'), true);

  // Expired leave in the past
  assert.equal(hasActiveOrFutureLeave(proxyFutureLeave, '2026-11-16'), false);

  // Indefinite manual override
  const proxyIndefinite = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: null,
    leave_end_date: null
  };
  assert.equal(hasActiveOrFutureLeave(proxyIndefinite, '2026-11-04'), true);

  // Not on leave
  const proxyAvailable = {
    ...NIHAL,
    is_on_leave: false
  };
  assert.equal(hasActiveOrFutureLeave(proxyAvailable, '2026-11-04'), false);
});

test('8.3 getActiveOrFutureProxyLeaves: aggregates proxy leaves with full date ranges for global alerts', () => {
  const team = [
    {
      ...NIHAL,
      is_on_leave: true,
      leave_start_date: '2026-11-09',
      leave_end_date: '2026-11-15'
    },
    {
      ...RUDRA,
      is_on_leave: true,
      leave_start_date: '2026-11-12',
      leave_end_date: '2026-11-20'
    },
    {
      id: 'u_recruiter',
      display_name: 'Param Recruiter',
      role: 'jpc_recruiter',
      is_on_leave: true // Not a proxy
    }
  ];

  const leaves = getActiveOrFutureProxyLeaves(team, '2026-11-04');
  assert.equal(leaves.length, 2);
  assert.equal(leaves[0].proxy.id, 'u_nihal');
  assert.equal(leaves[0].leavePeriodText, 'Nov 09, 2026 - Nov 15, 2026 (EST)');
  assert.equal(leaves[1].proxy.id, 'u_rudra');
  assert.equal(leaves[1].leavePeriodText, 'Nov 12, 2026 - Nov 20, 2026 (EST)');
});
