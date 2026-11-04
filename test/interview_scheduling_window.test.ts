import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERVIEW_WINDOW_START_MINUTES,
  INTERVIEW_WINDOW_END_MINUTES,
  INTERVIEW_WINDOW_START_TIME,
  INTERVIEW_WINDOW_END_TIME,
  INTERVIEW_SCHEDULING_WINDOW_MESSAGE,
  getEasternTimeMinutes,
  validateInterviewTimeWindow
} from '../src/lib/utils';

import {
  findBestProxyForWindow,
  assignProxiesForRounds
} from '../src/services/interviewService';

import { syncInterviewRoundToGoogleCalendar } from '../src/services/calendarService';
import { addInterviewRound, updateInterviewRound } from '../src/services/storage';

const MOCK_PROXY = {
  id: 'u_proxy_1',
  display_name: 'Nihal Proxy',
  email: 'nihalnx09@gmail.com',
  role: 'jpc_proxy',
  google_calendar_connected: true,
  is_on_leave: false
};

// =========================================================================
// 1. EXACT BOUNDARY TESTS: 4:15 AM – 5:15 PM EST
// =========================================================================

test('1.1 validateInterviewTimeWindow: interview starting exactly at 4:15 AM EST is valid', () => {
  const result = validateInterviewTimeWindow('04:15', '04:45');
  assert.equal(result.isValid, true);
  assert.equal(result.startMinutes, 255);
  assert.equal(result.endMinutes, 285);
  assert.equal(result.error, undefined);
});

test('1.2 validateInterviewTimeWindow: interview ending exactly at 5:15 PM EST is valid', () => {
  const result = validateInterviewTimeWindow('16:45', '17:15');
  assert.equal(result.isValid, true);
  assert.equal(result.startMinutes, 1005);
  assert.equal(result.endMinutes, 1035);
  assert.equal(result.error, undefined);
});

test('1.3 validateInterviewTimeWindow: full window span from 4:15 AM to 5:15 PM EST is valid', () => {
  const result = validateInterviewTimeWindow('04:15', '17:15');
  assert.equal(result.isValid, true);
  assert.equal(result.startMinutes, 255);
  assert.equal(result.endMinutes, 1035);
});

test('1.4 validateInterviewTimeWindow: starting with duration exactly landing on 5:15 PM EST is valid', () => {
  const result = validateInterviewTimeWindow('16:15', undefined, 60);
  assert.equal(result.isValid, true);
  assert.equal(result.startMinutes, 975);
  assert.equal(result.endMinutes, 1035);
});

// =========================================================================
// 2. OUTSIDE WINDOW VIOLATION TESTS
// =========================================================================

test('2.1 validateInterviewTimeWindow: interview starting 1 minute before 4:15 AM (04:14) is rejected', () => {
  const result = validateInterviewTimeWindow('04:14', '04:45');
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('Interview start time cannot be earlier than 4:15 AM EST'));
});

test('2.2 validateInterviewTimeWindow: interview starting in early morning (02:00, 03:30, 00:00) is rejected', () => {
  const early1 = validateInterviewTimeWindow('02:00', '02:30');
  assert.equal(early1.isValid, false);
  assert.ok(early1.error?.includes('4:15 AM EST'));

  const early2 = validateInterviewTimeWindow('03:30', '04:00');
  assert.equal(early2.isValid, false);
  assert.ok(early2.error?.includes('4:15 AM EST'));

  const midnight = validateInterviewTimeWindow('00:00', '00:30');
  assert.equal(midnight.isValid, false);
  assert.ok(midnight.error?.includes('4:15 AM EST'));
});

test('2.3 validateInterviewTimeWindow: interview ending 1 minute after 5:15 PM (17:16) is rejected', () => {
  const result = validateInterviewTimeWindow('16:46', '17:16');
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('Interview end time cannot be later than 5:15 PM EST'));
});

test('2.4 validateInterviewTimeWindow: interview ending late evening (17:30, 18:00, 21:00) is rejected', () => {
  const evening1 = validateInterviewTimeWindow('17:00', '17:30');
  assert.equal(evening1.isValid, false);
  assert.ok(evening1.error?.includes('Interview end time cannot be later than 5:15 PM EST'));

  const evening2 = validateInterviewTimeWindow('16:00', '18:00');
  assert.equal(evening2.isValid, false);
  assert.ok(evening2.error?.includes('Interview end time cannot be later than 5:15 PM EST'));
});

test('2.5 validateInterviewTimeWindow: interview starting at or after 5:15 PM (17:15, 18:00) is rejected', () => {
  const startAtEnd = validateInterviewTimeWindow('17:15', '17:45');
  assert.equal(startAtEnd.isValid, false);
  assert.ok(startAtEnd.error?.includes('Interview start time cannot be at or after 5:15 PM EST'));

  const lateStart = validateInterviewTimeWindow('18:00', '18:30');
  assert.equal(lateStart.isValid, false);
  assert.ok(lateStart.error?.includes('Interview start time cannot be at or after 5:15 PM EST'));
});

// =========================================================================
// 3. BOUNDARY CROSSING TESTS (DURATION CROSSING PERMITTED WINDOW)
// =========================================================================

test('3.1 validateInterviewTimeWindow: start before 4:15 AM ending after 4:15 AM crosses lower boundary and is rejected', () => {
  // Starts at 04:00, ends at 04:30
  const result = validateInterviewTimeWindow('04:00', '04:30');
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('Interview start time cannot be earlier than 4:15 AM EST'));
});

test('3.2 validateInterviewTimeWindow: start before 5:15 PM ending after 5:15 PM crosses upper boundary and is rejected', () => {
  // Starts at 17:00, ends at 17:30 (crosses 17:15)
  const result = validateInterviewTimeWindow('17:00', '17:30');
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('Interview end time cannot be later than 5:15 PM EST'));
});

test('3.3 validateInterviewTimeWindow: duration calculation crossing upper boundary is rejected', () => {
  // Starts at 16:50 with 30 min duration -> ends at 17:20 (> 17:15)
  const result = validateInterviewTimeWindow('16:50', undefined, 30);
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('Interview end time cannot be later than 5:15 PM EST'));
});

test('3.4 validateInterviewTimeWindow: inverted times (end before or equal to start) is rejected', () => {
  const inverted = validateInterviewTimeWindow('10:00', '09:00');
  assert.equal(inverted.isValid, false);
  assert.ok(inverted.error?.includes('Interview end time must be after start time'));

  const sameTime = validateInterviewTimeWindow('10:00', '10:00');
  assert.equal(sameTime.isValid, false);
  assert.ok(sameTime.error?.includes('Interview end time must be after start time'));
});

// =========================================================================
// 4. EST/EDT TIMEZONE TRANSITIONS & ISO STRINGS
// =========================================================================

test('4.1 getEasternTimeMinutes: extracts Eastern time from local HH:mm string', () => {
  assert.equal(getEasternTimeMinutes('04:15'), 255);
  assert.equal(getEasternTimeMinutes('17:15'), 1035);
  assert.equal(getEasternTimeMinutes('12:00'), 720);
});

test('4.2 getEasternTimeMinutes: extracts Eastern time from local ISO strings without offset', () => {
  assert.equal(getEasternTimeMinutes('2026-11-04T04:15:00'), 255);
  assert.equal(getEasternTimeMinutes('2026-11-04T17:15:00'), 1035);
});

test('4.3 getEasternTimeMinutes: correctly handles daylight saving time (EDT in July UTC-4)', () => {
  // 08:15 UTC in July (EDT) is 04:15 EDT (UTC-4)
  const minutesJuly = getEasternTimeMinutes('2026-07-15T08:15:00Z');
  assert.equal(minutesJuly, 255); // 4:15 AM EDT

  // 21:15 UTC in July (EDT) is 17:15 EDT (UTC-4)
  const eveningJuly = getEasternTimeMinutes('2026-07-15T21:15:00Z');
  assert.equal(eveningJuly, 1035); // 5:15 PM EDT
});

test('4.4 getEasternTimeMinutes: correctly handles standard time (EST in December UTC-5)', () => {
  // 09:15 UTC in December (EST) is 04:15 EST (UTC-5)
  const minutesDec = getEasternTimeMinutes('2026-12-15T09:15:00Z');
  assert.equal(minutesDec, 255); // 4:15 AM EST

  // 22:15 UTC in December (EST) is 17:15 EST (UTC-5)
  const eveningDec = getEasternTimeMinutes('2026-12-15T22:15:00Z');
  assert.equal(eveningDec, 1035); // 5:15 PM EST
});

// =========================================================================
// 5. PROXY MATCHING & MULTI-ROUND SCHEDULING ENFORCEMENT
// =========================================================================

test('5.1 findBestProxyForWindow: rejects request before 4:15 AM EST', () => {
  const result = findBestProxyForWindow('2026-11-10', '03:30', '04:00', [MOCK_PROXY], [], []);
  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].includes('4:15 AM EST'));
});

test('5.2 findBestProxyForWindow: rejects request ending after 5:15 PM EST', () => {
  const result = findBestProxyForWindow('2026-11-10', '17:00', '17:30', [MOCK_PROXY], [], []);
  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].includes('5:15 PM EST'));
});

test('5.3 findBestProxyForWindow: succeeds when time is within 4:15 AM – 5:15 PM EST', () => {
  const result = findBestProxyForWindow('2026-11-10', '10:00', '10:30', [MOCK_PROXY], [], []);
  assert.ok(result.bestProxy);
  assert.equal(result.bestProxy.id, 'u_proxy_1');
  assert.equal(result.errors.length, 0);
});

test('5.4 assignProxiesForRounds: rejects any round scheduled outside the window', () => {
  const rounds = [
    { label: 'Round 1: Valid', interview_date: '2026-11-10', start_time: '10:00', end_time: '10:30', duration: 30 },
    { label: 'Round 2: Too Late', interview_date: '2026-11-10', start_time: '17:00', end_time: '17:30', duration: 30 }
  ];

  const result = assignProxiesForRounds(rounds, [MOCK_PROXY], [], []);
  assert.ok(result.roundAssignments[0].bestProxy);
  assert.equal(result.roundAssignments[1].bestProxy, null);
  assert.ok(result.roundAssignments[1].errors[0].includes('5:15 PM EST'));
});

// =========================================================================
// 6. STORAGE & CALENDAR INTEGRATION SAFEGUARDS
// =========================================================================

test('6.1 addInterviewRound: rejects round with booked_slot_time outside 4:15 AM – 5:15 PM EST', async () => {
  await assert.rejects(async () => {
    await addInterviewRound({
      request_id: 'req_test',
      round_label: 'Early Screening',
      round_type: 'screening',
      interview_date: '2026-11-10',
      duration_minutes: 30,
      status: 'confirmed',
      proxy_user_id: 'u_proxy_1',
      booking_link_token: null,
      booked_slot_time: '2026-11-10T03:30:00',
      booked_slot_end: '2026-11-10T04:00:00',
      live_started_at: null,
      completed_at: null,
      feedback_submitted_at: null,
      result: null,
      created_by: 'test'
    });
  }, (err: any) => {
    return err.message.includes('4:15 AM – 5:15 PM EST') || err.message.includes('Interview start time cannot be earlier than 4:15 AM EST');
  });
});

test('6.2 updateInterviewRound: rejects reschedule update outside 4:15 AM – 5:15 PM EST', async () => {
  await assert.rejects(async () => {
    await updateInterviewRound('rnd_test', {
      booked_slot_time: '2026-11-10T17:30:00',
      booked_slot_end: '2026-11-10T18:00:00'
    });
  }, (err: any) => {
    return err.message.includes('4:15 AM – 5:15 PM EST') || err.message.includes('Interview start time cannot be at or after 5:15 PM EST');
  });
});

test('6.3 INTERVIEW_SCHEDULING_WINDOW_MESSAGE: matches the required exact badge text', () => {
  assert.equal(
    INTERVIEW_SCHEDULING_WINDOW_MESSAGE,
    'INTERVIEW SCHEDULING WINDOW: 4:15 AM – 5:15 PM EST. ALL INTERVIEWS MUST BE SCHEDULED WITHIN THIS TIME.'
  );
});
