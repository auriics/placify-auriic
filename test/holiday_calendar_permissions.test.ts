import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canViewHolidayCalendar,
  canManageHolidayCalendar,
  canOverrideWorkingDay,
  canClearAllHolidays
} from '../src/lib/permissions';
import { User, Role } from '../src/types';
import { checkDateOfficeClosure } from '../src/services/holidayService';

function makeUser(role: Role, extra: Partial<User> = {}): User {
  return {
    id: `user_${role}`,
    username: `user_${role}`,
    display_name: `Test ${role}`,
    role,
    created_at: new Date().toISOString(),
    ...extra
  };
}

// =========================================================================
// 1. HIGHER AUTHORITIES - FULL MANAGEMENT ACCESS RETAINED
// =========================================================================
test('1.1 Administrator has full view and management permissions', () => {
  const admin = makeUser('administrator');
  assert.equal(canViewHolidayCalendar(admin), true);
  assert.equal(canManageHolidayCalendar(admin), true);
  assert.equal(canOverrideWorkingDay(admin), true);
  assert.equal(canClearAllHolidays(admin), true);
});

test('1.2 System Administrator (jpc_sysadmin) has full view and management permissions', () => {
  const sysadmin = makeUser('jpc_sysadmin');
  assert.equal(canViewHolidayCalendar(sysadmin), true);
  assert.equal(canManageHolidayCalendar(sysadmin), true);
  assert.equal(canOverrideWorkingDay(sysadmin), true);
  assert.equal(canClearAllHolidays(sysadmin), true);
});

test('1.3 Operations Manager (jpc_manager) has full view and management permissions', () => {
  const manager = makeUser('jpc_manager');
  assert.equal(canViewHolidayCalendar(manager), true);
  assert.equal(canManageHolidayCalendar(manager), true);
  assert.equal(canOverrideWorkingDay(manager), true);
  assert.equal(canClearAllHolidays(manager), true);
});

test('1.4 Compliance Head / CS Head (jpc_cs) has view and management permissions', () => {
  const csHead = makeUser('jpc_cs');
  assert.equal(canViewHolidayCalendar(csHead), true);
  assert.equal(canManageHolidayCalendar(csHead), true);
  assert.equal(canOverrideWorkingDay(csHead), true);
  assert.equal(canClearAllHolidays(csHead), true);
});

test('1.5 Compliance Person (jpc_compliance_person) has view and management permissions', () => {
  const compliance = makeUser('jpc_compliance_person');
  assert.equal(canViewHolidayCalendar(compliance), true);
  assert.equal(canManageHolidayCalendar(compliance), true);
});

test('1.6 Aurrum Admin (aurrum_admin) has view and management permissions', () => {
  const aurrumAdmin = makeUser('aurrum_admin');
  assert.equal(canViewHolidayCalendar(aurrumAdmin), true);
  assert.equal(canManageHolidayCalendar(aurrumAdmin), true);
  assert.equal(canClearAllHolidays(aurrumAdmin), true);
});

test('1.7 Authorized Proxy with explicit can_manage_calendar has view and management permissions', () => {
  const authorizedProxy = makeUser('jpc_proxy', { can_manage_calendar: true });
  assert.equal(canViewHolidayCalendar(authorizedProxy), true);
  assert.equal(canManageHolidayCalendar(authorizedProxy), true);
});

// =========================================================================
// 2. ALL OTHER TEAM MEMBERS - VIEW-ONLY ACCESS GRANTED (NO MANAGEMENT)
// =========================================================================
test('2.1 Recruiter (jpc_recruiter) has view-only access (no management/editing)', () => {
  const recruiter = makeUser('jpc_recruiter');
  assert.equal(canViewHolidayCalendar(recruiter), true, 'Recruiter must be able to view calendar');
  assert.equal(canManageHolidayCalendar(recruiter), false, 'Recruiter cannot manage calendar');
  assert.equal(canOverrideWorkingDay(recruiter), false, 'Recruiter cannot override working days');
  assert.equal(canClearAllHolidays(recruiter), false, 'Recruiter cannot clear all holidays');
});

test('2.2 Sales Team (jpc_sales, aurrum_sales) has view-only access', () => {
  const sales = makeUser('jpc_sales');
  assert.equal(canViewHolidayCalendar(sales), true);
  assert.equal(canManageHolidayCalendar(sales), false);

  const aurrumSales = makeUser('aurrum_sales');
  assert.equal(canViewHolidayCalendar(aurrumSales), true);
  assert.equal(canManageHolidayCalendar(aurrumSales), false);
});

test('2.3 Lead Generation Team (jpc_lead_gen) has view-only access', () => {
  const leadGen = makeUser('jpc_lead_gen');
  assert.equal(canViewHolidayCalendar(leadGen), true);
  assert.equal(canManageHolidayCalendar(leadGen), false);
});

test('2.4 Marketing Team (jpc_marketing, jpc_marketing_support) has view-only access', () => {
  const marketing = makeUser('jpc_marketing');
  assert.equal(canViewHolidayCalendar(marketing), true);
  assert.equal(canManageHolidayCalendar(marketing), false);

  const mktgSupport = makeUser('jpc_marketing_support');
  assert.equal(canViewHolidayCalendar(mktgSupport), true);
  assert.equal(canManageHolidayCalendar(mktgSupport), false);
});

test('2.5 Resume Team (jpc_resume) has view-only access', () => {
  const resume = makeUser('jpc_resume');
  assert.equal(canViewHolidayCalendar(resume), true);
  assert.equal(canManageHolidayCalendar(resume), false);
});

test('2.6 Proxy Team (jpc_proxy without can_manage_calendar) has view-only access', () => {
  const defaultProxy = makeUser('jpc_proxy');
  assert.equal(canViewHolidayCalendar(defaultProxy), true);
  assert.equal(canManageHolidayCalendar(defaultProxy), false);
});

test('2.7 Candidates and Unauthenticated users are strictly BLOCKED', () => {
  const candidate = makeUser('candidate');
  assert.equal(canViewHolidayCalendar(candidate), false);

  const jpcCandidate = makeUser('jpc_candidate');
  assert.equal(canViewHolidayCalendar(jpcCandidate), false);

  assert.equal(canViewHolidayCalendar(null), false);
});

// =========================================================================
// 3. SIDEBAR VISIBILITY LOGIC FOR TEAM MEMBERS
// =========================================================================
test('3.1 Sidebar nav item visibility logic accurately shows calendar for all team members', () => {
  const isSidebarVisible = (user: User | null, isAurrumOnly: boolean = false) => {
    return !isAurrumOnly && canViewHolidayCalendar(user);
  };

  // Higher authorities -> Visible
  assert.equal(isSidebarVisible(makeUser('administrator')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_sysadmin')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_manager')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_cs')), true);

  // General team members -> Also Visible (View-Only)
  assert.equal(isSidebarVisible(makeUser('jpc_recruiter')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_sales')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_lead_gen')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_marketing')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_resume')), true);
  assert.equal(isSidebarVisible(makeUser('jpc_proxy')), true);

  // Non-team members -> Hidden
  assert.equal(isSidebarVisible(makeUser('candidate')), false);
  assert.equal(isSidebarVisible(makeUser('jpc_candidate')), false);
  assert.equal(isSidebarVisible(null), false);
});

// =========================================================================
// 4. PRESERVED FUNCTIONALITY: INTERVIEW BOOKINGS UNAFFECTED
// =========================================================================
test('4.1 Office closure evaluations continue functioning for bookings', () => {
  const closures = [
    {
      id: 'c1',
      title: 'Christmas',
      start_date: '2026-12-25',
      end_date: '2026-12-25',
      status: 'closed' as const,
      is_active: true,
      custom_message: 'Office closed for Christmas'
    }
  ];

  const evalDec25 = checkDateOfficeClosure('2026-12-25', closures as any);
  assert.equal(evalDec25.isClosed, true);
  assert.equal(evalDec25.title, 'Christmas');

  const evalDec24 = checkDateOfficeClosure('2026-12-24', closures as any);
  assert.equal(evalDec24.isClosed, false);
});

// =========================================================================
// 5. ACTION BUTTON VISIBILITY (SYNC CALENDAR & AUDIT HISTORY)
// =========================================================================
test('5.1 Sync Calendar & Audit History buttons strictly hidden from lower authorities', () => {
  const isSyncCalendarVisible = (user: User | null) => canManageHolidayCalendar(user);
  const isAuditHistoryVisible = (user: User | null) => canManageHolidayCalendar(user);

  const lowerRoles: Role[] = [
    'jpc_recruiter',
    'jpc_sales',
    'aurrum_sales',
    'jpc_lead_gen',
    'jpc_marketing',
    'jpc_marketing_support',
    'jpc_resume',
    'candidate',
    'jpc_candidate'
  ];

  for (const role of lowerRoles) {
    const user = makeUser(role);
    assert.equal(isSyncCalendarVisible(user), false, `Sync Calendar button must be hidden for ${role}`);
    assert.equal(isAuditHistoryVisible(user), false, `Audit History button must be hidden for ${role}`);
  }

  // Unauthorised proxy without explicit can_manage_calendar
  const unauthorizedProxy = makeUser('jpc_proxy');
  assert.equal(isSyncCalendarVisible(unauthorizedProxy), false);
  assert.equal(isAuditHistoryVisible(unauthorizedProxy), false);

  // Unauthenticated
  assert.equal(isSyncCalendarVisible(null), false);
  assert.equal(isAuditHistoryVisible(null), false);
});

test('5.2 Sync Calendar & Audit History buttons visible to Higher Authorities only', () => {
  const isSyncCalendarVisible = (user: User | null) => canManageHolidayCalendar(user);
  const isAuditHistoryVisible = (user: User | null) => canManageHolidayCalendar(user);

  const higherRoles: Role[] = [
    'administrator',
    'jpc_sysadmin',
    'jpc_manager',
    'jpc_cs',
    'jpc_compliance_person',
    'aurrum_admin'
  ];

  for (const role of higherRoles) {
    const user = makeUser(role);
    assert.equal(isSyncCalendarVisible(user), true, `Sync Calendar button must be visible for ${role}`);
    assert.equal(isAuditHistoryVisible(user), true, `Audit History button must be visible for ${role}`);
  }

  // Authorized proxy with can_manage_calendar
  const authProxy = makeUser('jpc_proxy', { can_manage_calendar: true });
  assert.equal(isSyncCalendarVisible(authProxy), true);
  assert.equal(isAuditHistoryVisible(authProxy), true);
});
