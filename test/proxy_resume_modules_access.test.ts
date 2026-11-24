import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isProxyUser } from '../src/services/interviewService';
import { canViewHolidayCalendar } from '../src/lib/permissions';
import { User } from '../src/types';

// Helper to simulate route permission logic from App.tsx
function canAccessRoute(hash: string, user: User | null): boolean {
  switch (hash) {
    case '#applications':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_marketing'
      );
    case '#resume-log':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_resume' ||
        user.role === 'jpc_marketing' ||
        isProxyUser(user)
      );
    case '#resume-prep-log':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_resume' ||
        user.role === 'jpc_marketing' ||
        isProxyUser(user)
      );
    case '#rtr-log':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_resume' ||
        user.role === 'jpc_marketing' ||
        isProxyUser(user)
      );
    case '#target-dashboard':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person'
      );
    case '#cv-repository':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_resume' ||
        user.role === 'jpc_marketing' ||
        isProxyUser(user)
      );
    case '#domain-resumes':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person' ||
        user.role === 'jpc_recruiter' ||
        user.role === 'jpc_resume' ||
        user.role === 'jpc_marketing' ||
        isProxyUser(user)
      );
    case '#office-holidays':
      return canViewHolidayCalendar(user);
    case '#team':
      return !!user && (
        user.role === 'administrator' ||
        user.role === 'jpc_sysadmin' ||
        user.role === 'jpc_manager' ||
        user.role === 'jpc_marketing' ||
        user.role === 'jpc_cs' ||
        user.role === 'jpc_compliance_person'
      );
    default:
      return true;
  }
}

// Helper simulating Sidebar nav items visibility
function getVisibleSidebarHashes(user: User | null): string[] {
  const isAurrumOnlyUser = false;
  const items = [
    {
      hash: '#applications',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_marketing')
    },
    {
      hash: '#resume-log',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_resume' || user?.role === 'jpc_marketing' || isProxyUser(user))
    },
    {
      hash: '#resume-prep-log',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_resume' || user?.role === 'jpc_marketing' || isProxyUser(user))
    },
    {
      hash: '#rtr-log',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_resume' || user?.role === 'jpc_marketing' || isProxyUser(user))
    },
    {
      hash: '#target-dashboard',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person')
    },
    {
      hash: '#cv-repository',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_resume' || user?.role === 'jpc_marketing' || isProxyUser(user))
    },
    {
      hash: '#domain-resumes',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || user?.role === 'jpc_resume' || user?.role === 'jpc_marketing' || isProxyUser(user))
    },
    {
      hash: '#interviews',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person' || user?.role === 'jpc_recruiter' || isProxyUser(user) || user?.role === 'jpc_marketing')
    },
    {
      hash: '#interviews-proxy',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || isProxyUser(user))
    },
    {
      hash: '#office-holidays',
      visible: !isAurrumOnlyUser && canViewHolidayCalendar(user)
    },
    {
      hash: '#team',
      visible: !isAurrumOnlyUser && (user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_marketing' || user?.role === 'jpc_cs' || user?.role === 'jpc_compliance_person')
    }
  ];

  return items.filter(i => i.visible).map(i => i.hash);
}

describe('Proxy Person - Specific Resume Modules Access', () => {
  const proxyUser: User = {
    id: 'proxy-user-1',
    username: 'proxy_nihal',
    email: 'proxy.nihal@auriic.co',
    role: 'jpc_proxy',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Nihal Proxy'
  };

  const designatedProxyUserByEmail: User = {
    id: 'proxy-user-2',
    username: 'nihal_designated',
    email: 'nihalnx09@gmail.com',
    role: 'candidate', // Role is candidate but designated proxy
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Nihal Designated'
  };

  const salesUser: User = {
    id: 'sales-user-1',
    username: 'sales_rep',
    email: 'sales@auriic.co',
    role: 'jpc_sales',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Sales Rep'
  };

  const recruiterUser: User = {
    id: 'recruiter-user-1',
    username: 'recruiter_1',
    email: 'recruiter@auriic.co',
    role: 'jpc_recruiter',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    display_name: 'Recruiter One'
  };

  it('correctly identifies proxy users using isProxyUser', () => {
    assert.strictEqual(isProxyUser(proxyUser), true);
    assert.strictEqual(isProxyUser(designatedProxyUserByEmail), true);
    assert.strictEqual(isProxyUser(salesUser), false);
    assert.strictEqual(isProxyUser(recruiterUser), false);
  });

  it('allows Proxy Person to access all 5 resume modules', () => {
    const resumeModules = [
      '#resume-log',
      '#resume-prep-log',
      '#rtr-log',
      '#cv-repository',
      '#domain-resumes'
    ];

    for (const moduleHash of resumeModules) {
      assert.strictEqual(
        canAccessRoute(moduleHash, proxyUser),
        true,
        `Proxy user should be able to access ${moduleHash}`
      );
      assert.strictEqual(
        canAccessRoute(moduleHash, designatedProxyUserByEmail),
        true,
        `Designated proxy user should be able to access ${moduleHash}`
      );
    }
  });

  it('displays all 5 resume modules in the sidebar for Proxy Person', () => {
    const visibleHashes = getVisibleSidebarHashes(proxyUser);

    assert.ok(visibleHashes.includes('#resume-log'), 'Resume Log should be visible in sidebar for proxy');
    assert.ok(visibleHashes.includes('#resume-prep-log'), 'Resume Prep Log should be visible in sidebar for proxy');
    assert.ok(visibleHashes.includes('#rtr-log'), 'RTR Log should be visible in sidebar for proxy');
    assert.ok(visibleHashes.includes('#cv-repository'), 'CV Repository should be visible in sidebar for proxy');
    assert.ok(visibleHashes.includes('#domain-resumes'), 'Domain Resumes should be visible in sidebar for proxy');
  });

  it('strictly blocks Proxy Person from restricted modules', () => {
    const restrictedModules = [
      '#applications', // App Tracker
      '#target-dashboard', // Target Compliance
      '#office-holidays', // Office Holiday Calendar
      '#team' // Team management
    ];

    for (const moduleHash of restrictedModules) {
      assert.strictEqual(
        canAccessRoute(moduleHash, proxyUser),
        false,
        `Proxy user should NOT be able to access ${moduleHash}`
      );
    }

    const visibleHashes = getVisibleSidebarHashes(proxyUser);
    assert.strictEqual(visibleHashes.includes('#applications'), false, 'App Tracker should not be in sidebar');
    assert.strictEqual(visibleHashes.includes('#target-dashboard'), false, 'Target Compliance should not be in sidebar');
    assert.strictEqual(visibleHashes.includes('#office-holidays'), false, 'Office Holidays should not be in sidebar');
    assert.strictEqual(visibleHashes.includes('#team'), false, 'Team should not be in sidebar');
  });

  it('preserves existing permissions for other roles (e.g. Sales, Recruiter)', () => {
    // Sales should NOT have access to resume log or office holidays
    assert.strictEqual(canAccessRoute('#resume-log', salesUser), false);
    assert.strictEqual(canAccessRoute('#office-holidays', salesUser), false);

    // Recruiter SHOULD have access to resume log and domain resumes, but NOT office holidays or team
    assert.strictEqual(canAccessRoute('#resume-log', recruiterUser), true);
    assert.strictEqual(canAccessRoute('#domain-resumes', recruiterUser), true);
    assert.strictEqual(canAccessRoute('#office-holidays', recruiterUser), false);
    assert.strictEqual(canAccessRoute('#team', recruiterUser), false);
  });
});
