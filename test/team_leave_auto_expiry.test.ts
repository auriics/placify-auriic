import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isUserEffectivelyOnLeave,
  isUserCurrentlyOnLeave,
  isUserOnLeaveDuring,
  parseLeaveRange,
  formatLeavePeriod
} from '../src/lib/utils';
import {
  hasActiveOrFutureLeave,
  getActiveOrFutureProxyLeaves,
  findBestProxyForWindow,
  isProxyUser
} from '../src/services/interviewService';
import { User, ProxyAvailability, InterviewRound } from '../src/types';

// =========================================================================
// MOCK PROXIES
// =========================================================================
const PROXY_NIHAL: User = {
  id: 'u_nihal',
  username: 'nihal',
  display_name: 'Nihal Proxy',
  email: 'nihal@example.com',
  role: 'jpc_proxy',
  created_at: '2026-01-01T00:00:00.000Z',
  google_calendar_connected: true
};

const PROXY_RUDRA: User = {
  id: 'u_rudra',
  username: 'rudra',
  display_name: 'Rudra Proxy',
  email: 'rudra@example.com',
  role: 'jpc_proxy',
  created_at: '2026-01-01T00:00:00.000Z',
  google_calendar_connected: true
};

// =========================================================================
// 1. AUTOMATIC LEAVE EXPIRY LOGIC (America/New_York EST)
// =========================================================================
test('1.1 Single-day leave: 20 Nov 2026 expires on 21 Nov 2026', () => {
  const userWithSingleDayLeave: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-20'
  };

  // Active during leave date
  assert.equal(isUserEffectivelyOnLeave(userWithSingleDayLeave, '2026-11-20'), true);

  // Automatically expired on the next day
  assert.equal(isUserEffectivelyOnLeave(userWithSingleDayLeave, '2026-11-21'), false);
  assert.equal(isUserEffectivelyOnLeave(userWithSingleDayLeave, '2026-11-22'), false);
});

test('1.2 Multi-day leave: 20 Nov - 21 Nov 2026 expires on 22 Nov 2026, restored on 23 Nov working day', () => {
  const userWithMultiDayLeave: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-21'
  };

  // Day 1 of leave: Active
  assert.equal(isUserEffectivelyOnLeave(userWithMultiDayLeave, '2026-11-20'), true);

  // Day 2 of leave: Active
  assert.equal(isUserEffectivelyOnLeave(userWithMultiDayLeave, '2026-11-21'), true);

  // Day 3 (22 Nov): Automatically expired
  assert.equal(isUserEffectivelyOnLeave(userWithMultiDayLeave, '2026-11-22'), false);

  // Day 4 (23 Nov - Monday working day): Automatically restored to normal availability
  assert.equal(isUserEffectivelyOnLeave(userWithMultiDayLeave, '2026-11-23'), false);
});

test('1.3 Future approved leave is NOT expired early', () => {
  const userWithFutureLeave: User = {
    ...PROXY_RUDRA,
    is_on_leave: true,
    leave_start_date: '2026-11-25',
    leave_end_date: '2026-11-28'
  };

  // Today is 22 Nov: User is NOT on leave yet today
  assert.equal(isUserEffectivelyOnLeave(userWithFutureLeave, '2026-11-22'), false);

  // But hasActiveOrFutureLeave is TRUE so banner and schedule are preserved
  assert.equal(hasActiveOrFutureLeave(userWithFutureLeave, '2026-11-22'), true);

  // On 25 Nov: Active
  assert.equal(isUserEffectivelyOnLeave(userWithFutureLeave, '2026-11-25'), true);

  // On 28 Nov: Active
  assert.equal(isUserEffectivelyOnLeave(userWithFutureLeave, '2026-11-28'), true);

  // On 29 Nov: Expired
  assert.equal(isUserEffectivelyOnLeave(userWithFutureLeave, '2026-11-29'), false);
  assert.equal(hasActiveOrFutureLeave(userWithFutureLeave, '2026-11-29'), false);
});

test('1.4 Indefinite leave without end date does NOT auto-expire', () => {
  const userWithIndefiniteLeave: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-10',
    leave_end_date: null
  };

  // Evaluated far in future: remains on leave until manually cleared
  assert.equal(isUserEffectivelyOnLeave(userWithIndefiniteLeave, '2026-11-22'), true);
  assert.equal(isUserEffectivelyOnLeave(userWithIndefiniteLeave, '2026-12-31'), true);
});

// =========================================================================
// 2. IS_USER_ON_LEAVE_DURING & BOOKING RESTRICTION REMOVAL
// =========================================================================
test('2.1 isUserOnLeaveDuring: allows bookings once leave end date has passed', () => {
  const proxyLeaveEnded: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-21'
  };

  // Interview slot on 2026-11-20: BLOCKED
  const slotDuringLeave = isUserOnLeaveDuring(
    proxyLeaveEnded,
    '2026-11-20T10:00:00',
    '2026-11-20T10:30:00'
  );
  assert.equal(slotDuringLeave, true);

  // Interview slot on 2026-11-22: NOT BLOCKED (AVAILABLE)
  const slotAfterLeave1 = isUserOnLeaveDuring(
    proxyLeaveEnded,
    '2026-11-22T10:00:00',
    '2026-11-22T10:30:00'
  );
  assert.equal(slotAfterLeave1, false);

  // Interview slot on 2026-11-23 (Working Day): NOT BLOCKED (AVAILABLE)
  const slotAfterLeave2 = isUserOnLeaveDuring(
    proxyLeaveEnded,
    '2026-11-23T14:00:00',
    '2026-11-23T14:30:00'
  );
  assert.equal(slotAfterLeave2, false);
});

// =========================================================================
// 3. PROXY SELECTION & SCHEDULING (findBestProxyForWindow)
// =========================================================================
test('3.1 findBestProxyForWindow selects proxy after their leave has ended', () => {
  // Nihal's leave was 20-21 Nov 2026
  const nihal: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-21'
  };

  // Rudra has active leave on 23 Nov 2026
  const rudra: User = {
    ...PROXY_RUDRA,
    is_on_leave: true,
    leave_start_date: '2026-11-23',
    leave_end_date: '2026-11-23'
  };

  const proxies = [nihal, rudra];

  // Try booking on 23 Nov 2026 (Monday):
  // Nihal's leave has expired -> Nihal MUST be available!
  // Rudra's leave is active on 23 Nov -> Rudra is blocked.
  const result = findBestProxyForWindow(
    '2026-11-23',
    '10:00',
    '10:30',
    proxies,
    [], // no existing rounds
    [], // no availability blocks
    [], // no calendar events
    undefined,
    undefined,
    [], // closures
    { weekly_off_days: [0, 6], custom_message: 'Weekend' }
  );

  assert.ok(result.bestProxy, 'A proxy should be selected');
  assert.equal(result.bestProxy.id, 'u_nihal', 'Nihal whose leave ended should be selected');
  assert.equal(result.availableProxies.length, 1);
  assert.equal(result.availableProxies[0].id, 'u_nihal');
});

test('3.2 findBestProxyForWindow blocks booking when proxy is currently on active leave', () => {
  const nihal: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-21'
  };

  const proxies = [nihal];

  // Try booking on 20 Nov 2026 during leave
  const result = findBestProxyForWindow(
    '2026-11-20',
    '10:00',
    '10:30',
    proxies,
    [],
    [],
    [],
    undefined,
    undefined,
    [],
    { weekly_off_days: [0, 6], custom_message: 'Weekend' }
  );

  assert.equal(result.bestProxy, null, 'No proxy should be selected during leave');
  assert.equal(result.availableProxies.length, 0);
});

// =========================================================================
// 4. NOTICE BANNER DEDUPLICATION & EXPIRY
// =========================================================================
test('4.1 getActiveOrFutureProxyLeaves excludes proxies whose leave has already ended', () => {
  const team = [
    {
      ...PROXY_NIHAL,
      is_on_leave: true,
      leave_start_date: '2026-11-20',
      leave_end_date: '2026-11-21'
    },
    {
      ...PROXY_RUDRA,
      is_on_leave: true,
      leave_start_date: '2026-11-25',
      leave_end_date: '2026-11-28'
    }
  ];

  // Evaluated on 22 Nov 2026:
  // Nihal's leave ended on 21 Nov -> Excluded!
  // Rudra's leave is 25-28 Nov -> Included!
  const activeLeaves = getActiveOrFutureProxyLeaves(team, '2026-11-22');
  assert.equal(activeLeaves.length, 1);
  assert.equal(activeLeaves[0].proxyId, 'u_rudra');
  assert.equal(activeLeaves[0].leavePeriodText, 'Nov 25, 2026 - Nov 28, 2026 (EST)');
});

// =========================================================================
// 5. HISTORICAL AUDIT RECORD ARCHIVAL
// =========================================================================
test('5.1 Leave history preservation structure', () => {
  const user: User = {
    ...PROXY_NIHAL,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-21',
    leave_history: [
      {
        id: 'lh_prior_1',
        start_date: '2026-10-01',
        end_date: '2026-10-03',
        status: 'completed',
        expired_at: '2026-10-04T00:00:00.000Z'
      }
    ]
  };

  // Verify leave history structure
  assert.equal(user.leave_history?.length, 1);
  assert.equal(user.leave_history?.[0].status, 'completed');
  assert.equal(user.leave_history?.[0].end_date, '2026-10-03');
});
