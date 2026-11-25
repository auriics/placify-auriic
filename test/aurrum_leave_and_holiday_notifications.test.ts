import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLeaveRange,
  isUserOnLeaveDuring,
  isUserCurrentlyOnLeave,
  formatLeavePeriod,
  getEasternDate
} from '../src/lib/utils';
import {
  findBestProxyForWindow,
  assignProxiesForRounds,
  getProxyConflictingRounds,
  isProxyUser,
  getProxyLeaveStatusForDate,
  shouldHideProxyLeaveFromRole,
  hasActiveOrFutureLeave,
  getActiveOrFutureProxyLeaves,
  checkAndExpireUserLeave
} from '../src/services/interviewService';
import {
  checkDateOfficeClosure,
  formatOfficeClosureMessage,
  isDateOfficeClosedSync
} from '../src/services/holidayService';
import { User, OfficeClosure, isAurrumRole } from '../src/types';

// =========================================================================
// MOCK AURRUM & PROXY TEAM DATA
// =========================================================================
const AURRUM_SPECIALIST_1: User = {
  id: 'u_aurrum_1',
  username: 'aurrum.specialist',
  display_name: 'Aurrum Proxy Specialist',
  email: 'specialist@aurrumcareers.com',
  role: 'aurrum_team',
  crm_brand: 'aurrum',
  google_calendar_connected: true
};

const AURRUM_SPECIALIST_2: User = {
  id: 'u_aurrum_2',
  username: 'aurrum.lead',
  display_name: 'Aurrum Team Lead',
  email: 'lead@aurrumcareers.com',
  role: 'aurrum_team',
  crm_brand: 'aurrum',
  google_calendar_connected: true
};

const PROXY_NIHAL: User = {
  id: 'u_nihal',
  username: 'nihalnx09',
  display_name: 'Nihal Proxy',
  email: 'nihalnx09@gmail.com',
  role: 'jpc_proxy',
  crm_brand: 'auriic',
  google_calendar_connected: true
};

const PROXY_RUDRA: User = {
  id: 'u_rudra',
  username: 'rudra',
  display_name: 'Rudraksh Rawal',
  email: 'rudra@example.com',
  role: 'jpc_proxy',
  crm_brand: 'auriic',
  google_calendar_connected: true
};

// =========================================================================
// 1. TEAM LEAVE STATUS & DATE-RANGE MANAGEMENT FOR AURRUM
// =========================================================================
test('1.1 isAurrumRole: correctly identifies all Aurrum roles', () => {
  assert.equal(isAurrumRole('aurrum_admin'), true);
  assert.equal(isAurrumRole('aurrum_team'), true);
  assert.equal(isAurrumRole('aurrum_sales'), true);
  assert.equal(isAurrumRole('jpc_proxy'), false);
  assert.equal(isAurrumRole('admin'), false);
  assert.equal(isAurrumRole('jpc_sales'), false);
});

test('1.2 formatLeavePeriod: formats From Date - To Date range with EST duration for Aurrum team', () => {
  const period = formatLeavePeriod('2026-12-01', '2026-12-05');
  assert.ok(period.includes('Dec 01, 2026'));
  assert.ok(period.includes('Dec 05, 2026'));
  assert.ok(period.includes('(EST)'));
});

test('1.3 formatLeavePeriod: handles single-day leave for Aurrum team', () => {
  const period = formatLeavePeriod('2026-12-10', '2026-12-10');
  assert.ok(period.includes('Dec 10, 2026'));
  assert.ok(period.includes('(EST)'));
});

test('1.4 isUserOnLeaveDuring: detects Aurrum team member active leave overlap during interview slot', () => {
  const onLeaveAurrumUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: '2026-12-01',
    leave_end_date: '2026-12-05',
    leave_return_date: '2026-12-05'
  };

  // During leave window (Dec 03) -> true
  assert.equal(isUserOnLeaveDuring(onLeaveAurrumUser, '2026-12-03T10:00:00', '2026-12-03T11:00:00'), true);
  // Before leave window (Nov 30) -> false
  assert.equal(isUserOnLeaveDuring(onLeaveAurrumUser, '2026-11-30T10:00:00', '2026-11-30T11:00:00'), false);
  // After leave window (Dec 06) -> false
  assert.equal(isUserOnLeaveDuring(onLeaveAurrumUser, '2026-12-06T10:00:00', '2026-12-06T11:00:00'), false);
});

test('1.5 isUserOnLeaveDuring: handles indefinite leave for Aurrum team member', () => {
  const indefiniteUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: null,
    leave_end_date: null,
    leave_return_date: null
  };
  assert.equal(isUserOnLeaveDuring(indefiniteUser, '2026-12-15T14:00:00', '2026-12-15T15:00:00'), true);
});

// =========================================================================
// 2. AUTOMATIC LEAVE EXPIRY FOR AURRUM TEAM MEMBERS
// =========================================================================
test('2.1 hasActiveOrFutureLeave: correctly identifies active or future leave for Aurrum team member', () => {
  const refDate = '2026-12-03';

  // Future leave starting Dec 10 -> active/future = true
  const futureUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: '2026-12-10',
    leave_end_date: '2026-12-15'
  };
  assert.equal(hasActiveOrFutureLeave(futureUser, refDate), true);

  // Past expired leave ended Nov 25 -> active/future = false
  const expiredUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: '2026-11-20',
    leave_end_date: '2026-11-25'
  };
  assert.equal(hasActiveOrFutureLeave(expiredUser, refDate), false);
});

test('2.2 checkAndExpireUserLeave: automatically expires Aurrum team member leave when end date has passed', async () => {
  const expiredAurrumUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: '2026-11-10',
    leave_end_date: '2026-11-15',
    leave_return_date: '2026-11-15'
  };

  const res = await checkAndExpireUserLeave(expiredAurrumUser, '2026-11-25');
  assert.equal(res.expired, true);
  assert.equal(res.user.is_on_leave, false);
  assert.equal(res.user.leave_start_date, null);
  assert.equal(res.user.leave_end_date, null);
  assert.ok(res.user.leave_history && res.user.leave_history.length > 0);
  assert.equal(res.user.leave_history[0].status, 'completed');
});

// =========================================================================
// 3. ROLE-BASED VISIBILITY FOR AURRUM LEAVE & NOTICES
// =========================================================================
test('3.1 shouldHideProxyLeaveFromRole: allows Aurrum roles to see leave & holiday notices in Aurrum context', () => {
  assert.equal(shouldHideProxyLeaveFromRole('aurrum_admin', 'aurrum'), false);
  assert.equal(shouldHideProxyLeaveFromRole('aurrum_team', 'aurrum'), false);
  assert.equal(shouldHideProxyLeaveFromRole('aurrum_sales', 'aurrum'), false);
  assert.equal(shouldHideProxyLeaveFromRole('candidate', 'aurrum'), true);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_candidate', 'aurrum'), true);
});

test('3.2 shouldHideProxyLeaveFromRole: preserves backward compatibility for Auriic context', () => {
  assert.equal(shouldHideProxyLeaveFromRole('jpc_lead_gen', 'auriic'), true);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_sales', 'auriic'), true);
  assert.equal(shouldHideProxyLeaveFromRole('aurrum_sales', 'auriic'), true);
  assert.equal(shouldHideProxyLeaveFromRole('admin', 'auriic'), false);
  assert.equal(shouldHideProxyLeaveFromRole('manager', 'auriic'), false);
  assert.equal(shouldHideProxyLeaveFromRole('jpc_proxy', 'auriic'), false);
});

test('3.3 getActiveOrFutureProxyLeaves: includes Aurrum team members with active leave in notice list', () => {
  const team = [
    {
      ...AURRUM_SPECIALIST_1,
      is_on_leave: true,
      leave_start_date: '2026-12-01',
      leave_end_date: '2026-12-05'
    },
    {
      ...PROXY_NIHAL,
      is_on_leave: true,
      leave_start_date: '2026-12-02',
      leave_end_date: '2026-12-04'
    },
    {
      ...AURRUM_SPECIALIST_2,
      is_on_leave: false
    }
  ];

  const activeLeaves = getActiveOrFutureProxyLeaves(team, '2026-12-01');
  assert.equal(activeLeaves.length, 2);
  const ids = activeLeaves.map(l => l.proxyId);
  assert.ok(ids.includes('u_aurrum_1'));
  assert.ok(ids.includes('u_nihal'));
});

// =========================================================================
// 4. INTERVIEW SCHEDULING LEAVE VALIDATION IN AURRUM
// =========================================================================
test('4.1 getProxyLeaveStatusForDate: returns clear warning and leave period when Aurrum proxy is on leave', () => {
  const onLeaveUser: User = {
    ...AURRUM_SPECIALIST_1,
    is_on_leave: true,
    leave_start_date: '2026-12-05',
    leave_end_date: '2026-12-08'
  };

  const status = getProxyLeaveStatusForDate(onLeaveUser, '2026-12-06', '10:00', '11:00');
  assert.equal(status.isOnLeave, true);
  assert.equal(status.leaveFrom, '2026-12-05');
  assert.equal(status.leaveTo, '2026-12-08');
  assert.ok(status.message.includes('THIS PROXY HAS ALREADY BOOKED LEAVE'));
});

test('4.2 assignProxiesForRounds: rejects scheduling when all available proxies/team members are on leave', () => {
  const team = [
    {
      ...AURRUM_SPECIALIST_1,
      is_on_leave: true,
      leave_start_date: '2026-12-08',
      leave_end_date: '2026-12-11'
    },
    {
      ...AURRUM_SPECIALIST_2,
      is_on_leave: true,
      leave_start_date: '2026-12-08',
      leave_end_date: '2026-12-11'
    }
  ];

  const rounds = [
    {
      label: 'Technical Round 1',
      duration: 60,
      interview_date: '2026-12-09',
      start_time: '10:00',
      end_time: '11:00'
    }
  ];

  const result = assignProxiesForRounds(rounds, team, [], [], []);
  assert.equal(result.roundAssignments[0].bestProxy, null);
  assert.ok(result.roundAssignments[0].errors.length > 0);
  assert.ok(result.roundAssignments[0].errors[0].includes('LEAVE') || result.roundAssignments[0].errors[0].includes('leave'));
});

test('4.3 assignProxiesForRounds: successfully assigns available proxy when one is on leave', () => {
  const team = [
    {
      ...AURRUM_SPECIALIST_1,
      is_on_leave: true,
      leave_start_date: '2026-12-08',
      leave_end_date: '2026-12-11'
    },
    {
      ...AURRUM_SPECIALIST_2,
      is_on_leave: false
    }
  ];

  const rounds = [
    {
      label: 'Technical Round 1',
      duration: 60,
      interview_date: '2026-12-09',
      start_time: '10:00',
      end_time: '11:00'
    }
  ];

  const result = assignProxiesForRounds(rounds, team, [], [], []);
  assert.ok(result.roundAssignments[0].bestProxy);
  assert.equal(result.roundAssignments[0].bestProxy.id, 'u_aurrum_2');
});

// =========================================================================
// 5. OFFICE HOLIDAY & CLOSURE NOTIFICATIONS FOR AURRUM
// =========================================================================
test('5.1 checkDateOfficeClosure: recognizes holiday closure and formats holiday message', () => {
  const closures: OfficeClosure[] = [
    {
      id: 'closure_christmas',
      title: 'Christmas Day',
      event_type: 'holiday',
      start_date: '2026-12-25',
      end_date: '2026-12-25',
      status: 'closed',
      custom_message: 'Our office is closed for Christmas celebrations.',
      is_active: true
    }
  ];

  const evalRes = checkDateOfficeClosure('2026-12-25', closures);
  assert.equal(evalRes.isClosed, true);
  assert.equal(evalRes.status, 'closed');
  assert.equal(evalRes.title, 'Christmas Day');
  assert.equal(evalRes.message, 'Our office is closed for Christmas celebrations.');
});

test('5.2 checkDateOfficeClosure: override working day opens office on weekend', () => {
  // 2026-12-06 is a Sunday (normally weekly off)
  const closures: OfficeClosure[] = [
    {
      id: 'special_sunday_open',
      title: 'Special Working Sunday',
      event_type: 'working_day_override',
      start_date: '2026-12-06',
      end_date: '2026-12-06',
      status: 'open',
      is_working_day_override: true,
      is_active: true
    }
  ];

  const evalRes = checkDateOfficeClosure('2026-12-06', closures);
  assert.equal(evalRes.isClosed, false);
  assert.equal(evalRes.status, 'open');
  assert.equal(evalRes.reason, 'override_working');
});
