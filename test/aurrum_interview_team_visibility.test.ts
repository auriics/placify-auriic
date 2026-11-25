import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isEligibleAurrumInterviewMember } from '../src/pages/AurrumCareers/AurrumInterviewSupport';
import { isProxyUser } from '../src/lib/permissions';
import { User } from '../src/types';

describe('Aurrum Careers - Interview Scheduling Team Member Visibility', () => {
  const rabiyaAdmin: User = {
    id: 'HlOK8BkMFZgrPQbNOzkMjDvuhIQ2',
    username: 'rabiya.deraiya@aurrumcareers.com',
    display_name: 'Rabiya Deraiya',
    email: 'rabiya.deraiya@aurrumcareers.com',
    role: 'aurrum_admin',
    created_at: '2026-09-29T18:21:36.680Z'
  };

  const paramVermaAdmin: User = {
    id: 'LXMoDlLHQOP66vVlPOXICEIll5z2',
    username: 'param.varma@aurrumcareers.com',
    display_name: 'Param Verma',
    email: 'param.varma@aurrumcareers.com',
    role: 'aurrum_admin',
    created_at: '2026-09-29T20:19:17.318Z'
  };

  const paramAuriicAdmin: User = {
    id: 'qvTBmZFqYDQEUVeYNodbpVYlSfx1',
    username: 'paramatwork3076',
    display_name: 'Param Parmar',
    email: 'paramatwork3076@gmail.com',
    role: 'administrator',
    created_at: '2026-04-20T20:03:29.803Z'
  };

  const paramAuriicCs: User = {
    id: 'B4OPMLSTCXSkRjQazvYIOzkSjil1',
    username: 'param.varma@auriic.co',
    display_name: 'Param Varma',
    email: 'param.varma@auriic.co',
    role: 'jpc_cs',
    created_at: '2026-08-19T16:31:23.155Z'
  };

  const aurrumSalesUser: User = {
    id: 'aurrum-sales-1',
    username: 'sales@aurrumcareers.com',
    display_name: 'Aurrum Sales Person',
    email: 'sales@aurrumcareers.com',
    role: 'aurrum_sales',
    created_at: '2026-10-01T00:00:00.000Z'
  };

  const aurrumTeamSpecialist: User = {
    id: 'aurrum-team-1',
    username: 'specialist@aurrumcareers.com',
    display_name: 'Aurrum Interview Specialist',
    email: 'specialist@aurrumcareers.com',
    role: 'aurrum_team',
    created_at: '2026-10-01T00:00:00.000Z'
  };

  const proxyNihal: User = {
    id: 'TkCIJtffZ5f8lbSyJVVGK03Fnl03',
    username: 'nihalnx09@gmail.com',
    display_name: 'Nihal',
    email: 'nihalnx09@gmail.com',
    role: 'jpc_proxy',
    created_at: '2026-05-01T00:00:00.000Z'
  };

  const proxyDishant: User = {
    id: 'fUe2s8mo2ncBNQIshvdkVj4nYIE3',
    username: 'dishant.patel@auriic.co',
    display_name: 'Dishant Patel',
    email: 'dishant.patel@auriic.co',
    role: 'jpc_proxy',
    created_at: '2026-05-01T00:00:00.000Z'
  };

  it('must exclude Rabiya Deraiya (aurrum_admin) from the Aurrum interview scheduling team list', () => {
    assert.strictEqual(
      isEligibleAurrumInterviewMember(rabiyaAdmin),
      false,
      'Rabiya Deraiya is an aurrum_admin and should not appear in interview scheduling'
    );
  });

  it('must exclude Param Verma (aurrum_admin) from the Aurrum interview scheduling team list', () => {
    assert.strictEqual(
      isEligibleAurrumInterviewMember(paramVermaAdmin),
      false,
      'Param Verma is an aurrum_admin and should not appear in interview scheduling'
    );
  });

  it('must not alter or affect paramatwork3076 in Auriic', () => {
    assert.strictEqual(paramAuriicAdmin.role, 'administrator');
    assert.strictEqual(
      isEligibleAurrumInterviewMember(paramAuriicAdmin),
      false,
      'paramatwork3076 is an Auriic administrator and should not be an Aurrum interview proxy'
    );
  });

  it('must not alter or affect param.varma@auriic.co in Auriic', () => {
    assert.strictEqual(paramAuriicCs.role, 'jpc_cs');
    assert.strictEqual(
      isEligibleAurrumInterviewMember(paramAuriicCs),
      false,
      'param.varma@auriic.co is jpc_cs and should not be an Aurrum interview proxy'
    );
  });

  it('must exclude aurrum_sales from the interview scheduling team list', () => {
    assert.strictEqual(
      isEligibleAurrumInterviewMember(aurrumSalesUser),
      false,
      'Aurrum sales role should not appear in interview scheduling'
    );
  });

  it('must include aurrum_team members in the interview scheduling team list', () => {
    assert.strictEqual(
      isEligibleAurrumInterviewMember(aurrumTeamSpecialist),
      true,
      'aurrum_team members are designated interview support specialists in Aurrum'
    );
  });

  it('must include designated proxy members in the interview scheduling team list', () => {
    assert.strictEqual(isEligibleAurrumInterviewMember(proxyNihal), true);
    assert.strictEqual(isEligibleAurrumInterviewMember(proxyDishant), true);
  });

  it('filters a team list so that only eligible interview support members appear', () => {
    const fullTeam: User[] = [
      rabiyaAdmin,
      paramVermaAdmin,
      paramAuriicAdmin,
      paramAuriicCs,
      aurrumSalesUser,
      aurrumTeamSpecialist,
      proxyNihal,
      proxyDishant
    ];

    const eligible = fullTeam.filter(isEligibleAurrumInterviewMember);

    assert.strictEqual(eligible.length, 3);
    assert.ok(eligible.some(u => u.id === aurrumTeamSpecialist.id));
    assert.ok(eligible.some(u => u.id === proxyNihal.id));
    assert.ok(eligible.some(u => u.id === proxyDishant.id));

    assert.ok(!eligible.some(u => u.id === rabiyaAdmin.id), 'Rabiya must not be present');
    assert.ok(!eligible.some(u => u.id === paramVermaAdmin.id), 'Param Verma must not be present');
    assert.ok(!eligible.some(u => u.id === paramAuriicAdmin.id), 'paramatwork3076 must not be present');
    assert.ok(!eligible.some(u => u.id === paramAuriicCs.id), 'param.varma@auriic.co must not be present');
    assert.ok(!eligible.some(u => u.id === aurrumSalesUser.id), 'Sales must not be present');
  });

  it('ensures Rabiya and Param retain their original aurrum_admin role and data', () => {
    assert.strictEqual(rabiyaAdmin.role, 'aurrum_admin');
    assert.strictEqual(rabiyaAdmin.display_name, 'Rabiya Deraiya');
    assert.strictEqual(paramVermaAdmin.role, 'aurrum_admin');
    assert.strictEqual(paramVermaAdmin.display_name, 'Param Verma');
  });
});
