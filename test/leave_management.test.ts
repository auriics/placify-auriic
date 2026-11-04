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
  isProxyUser
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
  assert.ok(result.errors[0].includes('Currently no proxy is available'));
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
