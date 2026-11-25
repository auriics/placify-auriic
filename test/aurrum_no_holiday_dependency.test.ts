import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { 
  findBestProxyForWindow, 
  assignProxiesForRounds,
  shouldHideProxyLeaveFromRole 
} from '../src/services/interviewService';
import { 
  setCachedOfficeClosuresForTesting,
  checkDateOfficeClosure,
  formatOfficeClosureMessage
} from '../src/services/holidayService';
import { OfficeClosure, User } from '../src/types';

describe('Aurrum Careers - Office Holiday Independence', () => {
  const holidayDate = '2026-12-25'; // Christmas closure test date
  const mockHolidayClosure: OfficeClosure = {
    id: 'test-holiday-1',
    start_date: holidayDate,
    end_date: holidayDate,
    title: 'Christmas Day',
    custom_message: 'Office closed for Christmas Day',
    is_active: true,
    status: 'closed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const testProxy: User = {
    id: 'proxy-1',
    username: 'proxy1',
    display_name: 'Test Proxy',
    email: 'proxy1@example.com',
    role: 'jpc_proxy',
    google_calendar_connected: true,
    created_at: '2026-01-01T00:00:00Z'
  };

  before(() => {
    setCachedOfficeClosuresForTesting([mockHolidayClosure]);
  });

  after(() => {
    setCachedOfficeClosuresForTesting([]);
  });

  it('verifies that the test date is indeed configured as an Auriic office holiday', () => {
    const evalResult = checkDateOfficeClosure(holidayDate, [mockHolidayClosure]);
    assert.strictEqual(evalResult.isClosed, true);
    assert.strictEqual(evalResult.title, 'Christmas Day');
  });

  it('blocks Auriic interview scheduling on an office holiday date', () => {
    const auriicResult = findBestProxyForWindow(
      holidayDate,
      '10:00',
      '11:00',
      [testProxy],
      [],
      [],
      [],
      undefined,
      undefined,
      [mockHolidayClosure],
      undefined,
      { brand: 'auriic' }
    );

    assert.strictEqual(auriicResult.bestProxy, null);
    assert.ok(auriicResult.errors.length > 0);
    assert.match(auriicResult.errors[0], /Christmas Day|office is closed/i);
  });

  it('allows Aurrum interview scheduling on an office holiday date without any holiday conflict', () => {
    const aurrumResult = findBestProxyForWindow(
      holidayDate,
      '10:00',
      '11:00',
      [testProxy],
      [],
      [],
      [],
      undefined,
      undefined,
      [mockHolidayClosure],
      undefined,
      { ignoreOfficeClosures: true, brand: 'aurrum' }
    );

    assert.strictEqual(aurrumResult.errors.length, 0);
    assert.strictEqual(aurrumResult.bestProxy?.id, testProxy.id);
  });

  it('allows multi-round Aurrum interview scheduling across office holiday dates', () => {
    const rounds = [
      {
        roundIndex: 0,
        interview_date: holidayDate,
        start_time: '10:00',
        end_time: '11:00'
      }
    ];

    const aurrumMultiResult = assignProxiesForRounds(
      rounds,
      [testProxy],
      [],
      [],
      [],
      [mockHolidayClosure],
      undefined,
      { ignoreOfficeClosures: true, brand: 'aurrum' }
    );

    assert.strictEqual(aurrumMultiResult.errors.length, 0);
    assert.strictEqual(aurrumMultiResult.roundAssignments.length, 1);
    assert.strictEqual(aurrumMultiResult.roundAssignments[0].bestProxy?.id, testProxy.id);
    assert.strictEqual(aurrumMultiResult.roundAssignments[0].errors.length, 0);
  });

  it('still enforces team member leave checks for Aurrum independently of holiday calendar', () => {
    const proxyOnLeave: User = {
      ...testProxy,
      id: 'proxy-on-leave',
      is_on_leave: true,
      leave_start_date: holidayDate,
      leave_end_date: holidayDate
    };

    const aurrumLeaveCheck = findBestProxyForWindow(
      holidayDate,
      '10:00',
      '11:00',
      [proxyOnLeave],
      [],
      [],
      [],
      undefined,
      undefined,
      [mockHolidayClosure],
      undefined,
      { ignoreOfficeClosures: true, brand: 'aurrum' }
    );

    assert.strictEqual(aurrumLeaveCheck.bestProxy, null);
    // Should fail due to no proxy available / leave, NOT due to office holiday closure!
    assert.ok(aurrumLeaveCheck.errors.length > 0);
    assert.doesNotMatch(aurrumLeaveCheck.errors[0], /Christmas Day/);
  });
});
