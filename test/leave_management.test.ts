import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLeaveRange,
  isUserOnLeaveDuring,
  isUserCurrentlyOnLeave,
  formatLeavePeriod
} from '../src/lib/utils';
import { findBestProxyForWindow, isProxyUser } from '../src/services/interviewService';

const NIHAL = { id: 'u_nihal', display_name: 'Nihal', role: 'jpc_proxy', google_calendar_connected: true };
const RUDRA = { id: 'u_rudra', display_name: 'Rudra', role: 'jpc_proxy', google_calendar_connected: true };

test('parseLeaveRange: correctly parses date range in EST', () => {
  const range = parseLeaveRange('2026-11-05', '2026-11-08');
  assert.ok(range);
  assert.equal(range.start.getFullYear(), 2026);
  assert.equal(range.start.getMonth(), 10); // Nov is 10
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDate(), 8);
  assert.ok(range.start < range.end);
});

test('parseLeaveRange: correctly parses single day leave', () => {
  const range = parseLeaveRange('2026-11-05', '2026-11-05');
  assert.ok(range);
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDate(), 5);
  assert.ok(range.start < range.end); // 00:00:00 < 23:59:59
});

test('formatLeavePeriod: formats date range cleanly', () => {
  const formatted = formatLeavePeriod('2026-11-05', '2026-11-08');
  assert.equal(formatted, 'Nov 05, 2026 - Nov 08, 2026 (EST)');

  const singleDay = formatLeavePeriod('2026-11-05', '2026-11-05');
  assert.equal(singleDay, 'Nov 05, 2026 (EST)');
});

test('isUserOnLeaveDuring: detects overlap with interview slot', () => {
  const user = {
    is_on_leave: true,
    leave_start_date: '2026-11-05',
    leave_end_date: '2026-11-08'
  };

  // During leave (Nov 6 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00', '2026-11-06T14:30:00'), true);

  // Before leave (Nov 4 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-04T14:00:00', '2026-11-04T14:30:00'), false);

  // After leave (Nov 9 at 14:00)
  assert.equal(isUserOnLeaveDuring(user, '2026-11-09T14:00:00', '2026-11-09T14:30:00'), false);
});

test('isUserOnLeaveDuring: handles manual indefinite override without dates', () => {
  const user = {
    is_on_leave: true
  };
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00'), true);
  assert.equal(isUserOnLeaveDuring(user, '2027-01-01T10:00:00'), true);
});

test('isUserOnLeaveDuring: handles legacy leave_return_date', () => {
  const user = {
    is_on_leave: true,
    leave_return_date: '2026-11-08T18:00:00'
  };
  // Before return date
  assert.equal(isUserOnLeaveDuring(user, '2026-11-06T14:00:00'), true);
  // After return date
  assert.equal(isUserOnLeaveDuring(user, '2026-11-09T10:00:00'), false);
});

test('findBestProxyForWindow: respects date-range leave in scheduling workflow', () => {
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
