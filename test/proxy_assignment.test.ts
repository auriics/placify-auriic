import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import { findBestProxyForWindow } from '../src/services/interviewService';

const NIHAL = { id: 'u_nihal', display_name: 'Nihal', role: 'jpc_proxy', google_calendar_connected: true };
const RUDRA = { id: 'u_rudra', display_name: 'Rudra', role: 'jpc_proxy', google_calendar_connected: true };

const DATE = '2026-10-05';
const START = '10:00';
const END = '10:30';

test('Both proxies free with no history: either can be picked, no error', () => {
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], [], []);
  assert.ok(result.bestProxy);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.availableProxies.map(p => p.id).sort(), ['u_nihal', 'u_rudra']);
});

test('Proxy with an overlapping confirmed round is excluded from selection', () => {
  const rounds = [
    { id: 'r1', proxy_user_id: 'u_nihal', status: 'confirmed', booked_slot_time: `${DATE}T10:10:00`, booked_slot_end: `${DATE}T10:40:00` }
  ];
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], rounds, []);
  assert.equal(result.bestProxy?.id, 'u_rudra');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_rudra']);
});

test('Proxy with a manual "unavailable" block is excluded from selection', () => {
  const avails = [
    { id: 'a1', proxy_user_id: 'u_rudra', slot_status: 'unavailable', slot_start: `${DATE}T09:50:00`, slot_end: `${DATE}T10:20:00` }
  ];
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], [], avails);
  assert.equal(result.bestProxy?.id, 'u_nihal');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_nihal']);
});

test('Proxy with a synced Google Calendar conflict is excluded from selection', () => {
  const calEvents = [
    { proxy_user_id: 'u_nihal', start_time: `${DATE}T10:05:00`, end_time: `${DATE}T10:15:00` }
  ];
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], [], [], calEvents);
  assert.equal(result.bestProxy?.id, 'u_rudra');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_rudra']);
});

test('Proxy without a connected Google Calendar is a hard exclusion, never selectable', () => {
  const rudraDisconnected = { ...RUDRA, google_calendar_connected: false };
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, rudraDisconnected], [], []);
  assert.equal(result.bestProxy?.id, 'u_nihal');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_nihal']);
});

test('When both proxies are genuinely double-booked, no proxy is returned and an error is set', () => {
  const rounds = [
    { id: 'r1', proxy_user_id: 'u_nihal', status: 'confirmed', booked_slot_time: `${DATE}T10:00:00`, booked_slot_end: `${DATE}T10:30:00` },
    { id: 'r2', proxy_user_id: 'u_rudra', status: 'live', booked_slot_time: `${DATE}T10:00:00`, booked_slot_end: `${DATE}T10:30:00` }
  ];
  const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], rounds, []);
  assert.equal(result.bestProxy, null);
  assert.equal(result.availableProxies.length, 0);
  assert.ok(result.errors.length > 0);
});

test('A proxy on leave is excluded from selection', () => {
  const nihalOnLeave = { ...NIHAL, is_on_leave: true };
  const result = findBestProxyForWindow(DATE, START, END, [nihalOnLeave, RUDRA], [], []);
  assert.equal(result.bestProxy?.id, 'u_rudra');
  assert.deepEqual(result.availableProxies.map(p => p.id), ['u_rudra']);
});

test('Lower workload on the SAME date wins deterministically, not a coin flip', () => {
  const rounds = [
    { id: 'r1', proxy_user_id: 'u_nihal', status: 'booked', interview_date: DATE, booked_slot_time: `${DATE}T08:00:00`, booked_slot_end: `${DATE}T08:30:00` },
    { id: 'r2', proxy_user_id: 'u_nihal', status: 'confirmed', interview_date: DATE, booked_slot_time: `${DATE}T09:00:00`, booked_slot_end: `${DATE}T09:30:00` }
  ];
  // Run many times: Rudra (0 bookings that date) must ALWAYS beat Nihal (2 bookings that date).
  for (let i = 0; i < 50; i++) {
    const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], rounds, []);
    assert.equal(result.bestProxy?.id, 'u_rudra', 'Rudra should always win when genuinely less loaded that day');
  }
});

test('Workload from a DIFFERENT date does not affect selection for the target date (stays a genuine tie)', () => {
  const rounds = [
    { id: 'r1', proxy_user_id: 'u_nihal', status: 'confirmed', interview_date: '2026-10-01', booked_slot_time: `2026-10-01T08:00:00`, booked_slot_end: `2026-10-01T08:30:00` },
    { id: 'r2', proxy_user_id: 'u_nihal', status: 'confirmed', interview_date: '2026-10-01', booked_slot_time: `2026-10-01T09:00:00`, booked_slot_end: `2026-10-01T09:30:00` }
  ];
  const counts: Record<string, number> = { u_nihal: 0, u_rudra: 0 };
  for (let i = 0; i < 500; i++) {
    const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], rounds, []);
    if (result.bestProxy) counts[result.bestProxy.id]++;
  }
  // Both should win a meaningful share — history from an unrelated date must not create a fixed favorite.
  assert.ok(counts.u_nihal > 150, `expected Nihal to win a fair share, got ${counts.u_nihal}/500`);
  assert.ok(counts.u_rudra > 150, `expected Rudra to win a fair share, got ${counts.u_rudra}/500`);
});

test('Genuine ties are resolved close to 50/50 over many trials, not a fixed favorite', () => {
  const counts: Record<string, number> = { u_nihal: 0, u_rudra: 0 };
  for (let i = 0; i < 2000; i++) {
    const result = findBestProxyForWindow(DATE, START, END, [NIHAL, RUDRA], [], []);
    if (result.bestProxy) counts[result.bestProxy.id]++;
  }
  // Allow generous tolerance (35-65%) to avoid test flakiness while still catching a fixed-favorite bug.
  assert.ok(counts.u_nihal > 700 && counts.u_nihal < 1300, `Nihal win count out of expected random range: ${counts.u_nihal}/2000`);
  assert.ok(counts.u_rudra > 700 && counts.u_rudra < 1300, `Rudra win count out of expected random range: ${counts.u_rudra}/2000`);
});

test('proxy_priority field has no effect on selection, even when set to extreme opposite values', () => {
  const nihalHighPriority = { ...NIHAL, proxy_priority: 1 };
  const rudraLowPriority = { ...RUDRA, proxy_priority: 99 };
  const counts: Record<string, number> = { u_nihal: 0, u_rudra: 0 };
  for (let i = 0; i < 2000; i++) {
    const result = findBestProxyForWindow(DATE, START, END, [nihalHighPriority, rudraLowPriority], [], []);
    if (result.bestProxy) counts[result.bestProxy.id]++;
  }
  assert.ok(counts.u_nihal > 700 && counts.u_nihal < 1300, `proxy_priority appears to bias selection: ${counts.u_nihal}/2000 for Nihal (priority=1)`);
});


test('Proxy on date-range leave is excluded for dates inside the leave window', () => {
  const nihalLeaveRange = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-10-05',
    leave_end_date: '2026-10-08'
  };
  // Oct 5 (start of leave)
  const resultOct5 = findBestProxyForWindow('2026-10-05', START, END, [nihalLeaveRange, RUDRA], [], []);
  assert.equal(resultOct5.bestProxy?.id, 'u_rudra');
  assert.deepEqual(resultOct5.availableProxies.map(p => p.id), ['u_rudra']);

  // Oct 7 (middle of leave)
  const resultOct7 = findBestProxyForWindow('2026-10-07', START, END, [nihalLeaveRange, RUDRA], [], []);
  assert.equal(resultOct7.bestProxy?.id, 'u_rudra');
  assert.deepEqual(resultOct7.availableProxies.map(p => p.id), ['u_rudra']);

  // Oct 8 (end of leave)
  const resultOct8 = findBestProxyForWindow('2026-10-08', START, END, [nihalLeaveRange, RUDRA], [], []);
  assert.equal(resultOct8.bestProxy?.id, 'u_rudra');
  assert.deepEqual(resultOct8.availableProxies.map(p => p.id), ['u_rudra']);
});

test('Proxy on date-range leave remains AVAILABLE for dates outside the leave window', () => {
  const nihalLeaveRange = {
    ...NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-10-05',
    leave_end_date: '2026-10-08'
  };

  // Oct 4 (before leave starts) -> Nihal MUST be available
  const resultBefore = findBestProxyForWindow('2026-10-04', START, END, [nihalLeaveRange, RUDRA], [], []);
  assert.ok(resultBefore.availableProxies.some(p => p.id === 'u_nihal'), 'Nihal should be available before leave window');

  // Oct 9 (after leave ends) -> Nihal MUST be available
  const resultAfter = findBestProxyForWindow('2026-10-09', START, END, [nihalLeaveRange, RUDRA], [], []);
  assert.ok(resultAfter.availableProxies.some(p => p.id === 'u_nihal'), 'Nihal should be available after leave window');
});

test('Cancelling date-range leave restores availability immediately across all dates', () => {
  const nihalCancelledLeave = {
    ...NIHAL,
    is_on_leave: false,
    leave_start_date: null,
    leave_end_date: null,
    leave_return_date: null
  };

  const result = findBestProxyForWindow(DATE, START, END, [nihalCancelledLeave, RUDRA], [], []);
  assert.ok(result.availableProxies.some(p => p.id === 'u_nihal'), 'Nihal should be restored to available');
});

test('Live Scenario: Dishant Patel on 2026-11-30 with 14:45-15:00 buffer and UK Holiday is AVAILABLE and selected', () => {
  const DISHANT = {
    id: 'fUe2s8mo2ncBNQIshvdkVj4nYIE3',
    display_name: 'Dishant Patel',
    username: 'dishant.patel',
    email: 'dishant.patel@auriic.co',
    role: 'jpc_proxy',
    google_calendar_connected: true,
    google_calendar_email: 'auriicsservices@gmail.com'
  };

  const NIHAL_ON_LEAVE = {
    id: 'u_nihal',
    display_name: 'Nihal',
    username: 'nihalnx',
    role: 'jpc_proxy',
    google_calendar_connected: true,
    is_on_leave: true,
    leave_start_date: '2026-11-26',
    leave_end_date: '2026-11-30'
  };

  // Dishant has a confirmed round at 15:00 - 15:30 EST
  const existingRounds = [
    {
      id: 'rnd_existing',
      proxy_user_id: DISHANT.id,
      status: 'confirmed',
      interview_date: '2026-11-30',
      booked_slot_time: '2026-11-30T15:00:00',
      booked_slot_end: '2026-11-30T15:30:00'
    }
  ];

  // UK Holidays event on Dishant's calendar: "St. Andrew's Day (SCT)"
  const calEvents = [
    {
      proxy_user_id: DISHANT.id,
      summary: "St. Andrew's Day (SCT)",
      start_time: '2026-11-30T00:00:00',
      end_time: '2026-12-01T00:00:00',
      eventType: 'holiday',
      transparency: 'transparent',
      calendar_summary: 'UK Holidays'
    }
  ];

  // Requesting 14:30 - 14:45 EST (ends exactly 15 minutes before 15:00 round starts)
  const result = findBestProxyForWindow(
    '2026-11-30',
    '14:30',
    '14:45',
    [NIHAL_ON_LEAVE, DISHANT],
    existingRounds,
    [],
    calEvents
  );

  assert.equal(result.errors.length, 0, `Expected 0 errors, got: ${result.errors.join('; ')}`);
  assert.equal(result.bestProxy?.id, DISHANT.id, 'Dishant should be selected as the available proxy');
  assert.equal(result.availableProxies.length, 1);
  assert.equal(result.availableProxies[0].id, DISHANT.id);
});

test('15-minute buffer enforcement: exactly 15m gap is allowed, <15m gap is rejected', () => {
  const PROXY = {
    id: 'p1',
    display_name: 'Test Proxy',
    role: 'jpc_proxy',
    google_calendar_connected: true
  };

  // Existing round: 15:00 to 15:30
  const rounds = [
    {
      id: 'r_existing',
      proxy_user_id: 'p1',
      status: 'confirmed',
      booked_slot_time: '2026-11-30T15:00:00',
      booked_slot_end: '2026-11-30T15:30:00'
    }
  ];

  // Exactly 15 min gap before: 14:30 - 14:45 -> ALLOWED
  const res15 = findBestProxyForWindow('2026-11-30', '14:30', '14:45', [PROXY], rounds, []);
  assert.equal(res15.availableProxies.length, 1, '15 minute gap must be allowed');

  // Less than 15 min gap before: 14:30 - 14:46 (14 min gap) -> CONFLICT
  const res14 = findBestProxyForWindow('2026-11-30', '14:30', '14:46', [PROXY], rounds, []);
  assert.equal(res14.availableProxies.length, 0, '< 15 minute gap must conflict');

  // Exactly 15 min gap after: 15:45 - 16:00 -> ALLOWED
  const resAfter15 = findBestProxyForWindow('2026-11-30', '15:45', '16:00', [PROXY], rounds, []);
  assert.equal(resAfter15.availableProxies.length, 1, '15 minute gap after round must be allowed');

  // Less than 15 min gap after: 15:44 - 16:00 (14 min gap) -> CONFLICT
  const resAfter14 = findBestProxyForWindow('2026-11-30', '15:44', '16:00', [PROXY], rounds, []);
  assert.equal(resAfter14.availableProxies.length, 0, '< 15 minute gap after round must conflict');
});

test('Public holiday events and transparent calendar events do not block proxy availability', () => {
  const PROXY = {
    id: 'p_holiday',
    display_name: 'Holiday Proxy',
    role: 'jpc_proxy',
    google_calendar_connected: true
  };

  const holidayEvents = [
    {
      proxy_user_id: 'p_holiday',
      summary: 'Public Holiday',
      start_time: '2026-11-30T14:00:00',
      end_time: '2026-11-30T15:00:00',
      eventType: 'holiday'
    },
    {
      proxy_user_id: 'p_holiday',
      summary: 'Observance Day',
      start_time: '2026-11-30T14:00:00',
      end_time: '2026-11-30T15:00:00',
      transparency: 'transparent'
    }
  ];

  const res = findBestProxyForWindow('2026-11-30', '14:30', '14:45', [PROXY], [], [], holidayEvents);
  assert.equal(res.availableProxies.length, 1, 'Holiday/transparent events must not block proxy');
});
