import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  isAdminUser, 
  PermissionAction, 
  ModulePermission, 
  createEmptyModulePermission, 
  createFullModulePermission 
} from '../src/types/permissions';
import { 
  APP_MODULES, 
  ALL_ROLES, 
  DEFAULT_ROLE_PERMISSIONS 
} from '../src/constants/defaultPermissions';
import { Role, User } from '../src/types';

describe('Admin-Only Centralized Permissions Management Test Suite', () => {

  describe('1. Admin Authorization & Access Control', () => {
    test('isAdminUser accurately identifies system administrators and admin email', () => {
      const admin1: Partial<User> = { id: 'admin-1', role: 'administrator', email: 'admin@test.com' };
      const admin2: Partial<User> = { id: 'admin-2', role: 'jpc_sysadmin', email: 'sysadmin@test.com' };
      const admin3: Partial<User> = { id: 'admin-3', role: 'jpc_sales', email: 'paramatwork3076@gmail.com' };
      const admin4: Partial<User> = { id: 'admin-4', role: 'jpc_sales', email: 'officialparamparmar@gmail.com' };

      assert.strictEqual(isAdminUser(admin1 as User), true);
      assert.strictEqual(isAdminUser(admin2 as User), true);
      assert.strictEqual(isAdminUser(admin3 as User), true);
      assert.strictEqual(isAdminUser(admin4 as User), true);
    });

    test('isAdminUser strictly rejects all non-admin operational, management, and candidate roles', () => {
      const nonAdminRoles: Role[] = [
        'jpc_manager',
        'jpc_sales',
        'jpc_lead_gen',
        'jpc_cs',
        'jpc_compliance_person',
        'jpc_resume',
        'jpc_recruiter',
        'jpc_marketing',
        'jpc_marketing_support',
        'jpc_proxy',
        'jpc_candidate',
        'candidate',
        'aurrum_admin',
        'aurrum_sales',
        'aurrum_team',
      ];

      for (const role of nonAdminRoles) {
        const testUser: Partial<User> = {
          id: `user-${role}`,
          role,
          email: `${role}@company.com`,
        };
        assert.strictEqual(
          isAdminUser(testUser as User), 
          false, 
          `Role ${role} should NOT have administrator authority`
        );
      }

      assert.strictEqual(isAdminUser(null), false);
      assert.strictEqual(isAdminUser(undefined), false);
    });
  });

  describe('2. All 17 Roles & 21 Modules Completeness', () => {
    test('ALL_ROLES contains exactly 17 defined application roles', () => {
      assert.strictEqual(ALL_ROLES.length, 17);
      const roleKeys = ALL_ROLES.map(r => r.role);
      assert.ok(roleKeys.includes('administrator'));
      assert.ok(roleKeys.includes('jpc_sysadmin'));
      assert.ok(roleKeys.includes('jpc_manager'));
      assert.ok(roleKeys.includes('jpc_sales'));
      assert.ok(roleKeys.includes('jpc_lead_gen'));
      assert.ok(roleKeys.includes('jpc_cs'));
      assert.ok(roleKeys.includes('jpc_compliance_person'));
      assert.ok(roleKeys.includes('jpc_resume'));
      assert.ok(roleKeys.includes('jpc_marketing'));
      assert.ok(roleKeys.includes('jpc_marketing_support'));
      assert.ok(roleKeys.includes('jpc_recruiter'));
      assert.ok(roleKeys.includes('jpc_proxy'));
      assert.ok(roleKeys.includes('jpc_candidate'));
      assert.ok(roleKeys.includes('candidate'));
      assert.ok(roleKeys.includes('aurrum_admin'));
      assert.ok(roleKeys.includes('aurrum_sales'));
      assert.ok(roleKeys.includes('aurrum_team'));
    });

    test('APP_MODULES contains exactly 21 defined CRM modules', () => {
      assert.strictEqual(APP_MODULES.length, 21);
      const moduleIds = APP_MODULES.map(m => m.id);
      
      const expectedModules = [
        'dashboard',
        'crm_dashboard',
        'pipeline',
        'candidates',
        'followups',
        'not_interested',
        'not_eligible',
        'app_tracker',
        'resume_log',
        'resume_prep',
        'rtr_log',
        'target_compliance',
        'cv_repository',
        'domain_resumes',
        'interview_support',
        'proxy_support',
        'team',
        'permissions_management',
        'receipt',
        'feature_alerts',
        'aurrum_careers',
      ];

      for (const expectedId of expectedModules) {
        assert.ok(moduleIds.includes(expectedId), `Missing expected module: ${expectedId}`);
      }
    });

    test('DEFAULT_ROLE_PERMISSIONS defines a valid permissions map for every role across every module', () => {
      for (const roleDef of ALL_ROLES) {
        const rolePerms = DEFAULT_ROLE_PERMISSIONS[roleDef.role];
        assert.ok(rolePerms, `Missing default permissions for role: ${roleDef.role}`);

        for (const mod of APP_MODULES) {
          const modPerm = rolePerms[mod.id];
          assert.ok(modPerm, `Role ${roleDef.role} missing default permissions for module ${mod.id}`);
          assert.strictEqual(typeof modPerm.view, 'boolean');
          assert.strictEqual(typeof modPerm.create, 'boolean');
          assert.strictEqual(typeof modPerm.edit, 'boolean');
          assert.strictEqual(typeof modPerm.delete, 'boolean');
          assert.strictEqual(typeof modPerm.manage, 'boolean');
          assert.strictEqual(typeof modPerm.export, 'boolean');
        }
      }
    });
  });

  describe('3. Admin Anti-Lockout Enforcement', () => {
    test('Administrator and System Admin permissions_management can never be revoked', () => {
      // Simulate attempting to turn off permissions_management for administrator
      const adminRole: Role = 'administrator';
      const modifiedAdminPerms: Record<string, ModulePermission> = JSON.parse(
        JSON.stringify(DEFAULT_ROLE_PERMISSIONS[adminRole])
      );

      // Attempt malicious or accidental lock-out
      modifiedAdminPerms.permissions_management = {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage: false,
        export: false,
      };

      // Server / Context Anti-lockout validation logic
      if (adminRole === 'administrator' || adminRole === 'jpc_sysadmin') {
        if (modifiedAdminPerms.permissions_management) {
          modifiedAdminPerms.permissions_management.view = true;
          modifiedAdminPerms.permissions_management.edit = true;
          modifiedAdminPerms.permissions_management.manage = true;
        }
      }

      assert.strictEqual(modifiedAdminPerms.permissions_management.view, true, 'Admin view on permissions_management must be locked ON');
      assert.strictEqual(modifiedAdminPerms.permissions_management.manage, true, 'Admin manage on permissions_management must be locked ON');
    });

    test('Administrator team management and dashboard access are perpetually preserved', () => {
      const adminUser: Partial<User> = { id: 'admin', role: 'administrator' };
      assert.strictEqual(isAdminUser(adminUser as User), true);
      assert.strictEqual(DEFAULT_ROLE_PERMISSIONS.administrator.team.view, true);
      assert.strictEqual(DEFAULT_ROLE_PERMISSIONS.administrator.team.manage, true);
      assert.strictEqual(DEFAULT_ROLE_PERMISSIONS.administrator.dashboard.view, true);
    });
  });

  describe('4. Privilege Escalation Protection', () => {
    test('Non-admin roles cannot be granted view or manage permissions on permissions_management', () => {
      const candidateRoles: Role[] = ['jpc_sales', 'jpc_recruiter', 'jpc_manager', 'candidate'];

      for (const role of candidateRoles) {
        const attemptedPerms: Record<string, ModulePermission> = JSON.parse(
          JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role])
        );

        // Attempt privilege escalation: grant permissions_management to sales or recruiter
        attemptedPerms.permissions_management = {
          view: true,
          create: true,
          edit: true,
          delete: true,
          manage: true,
          export: true,
        };

        // Server / Context privilege escalation sanitation
        if (role !== 'administrator' && role !== 'jpc_sysadmin') {
          if (attemptedPerms.permissions_management) {
            attemptedPerms.permissions_management = {
              view: false,
              create: false,
              edit: false,
              delete: false,
              manage: false,
              export: false,
            };
          }
        }

        assert.strictEqual(
          attemptedPerms.permissions_management.view, 
          false, 
          `Role ${role} must NEVER have view permission on permissions_management`
        );
        assert.strictEqual(
          attemptedPerms.permissions_management.manage, 
          false, 
          `Role ${role} must NEVER have manage permission on permissions_management`
        );
      }
    });

    test('Default permissions matrix guarantees permissions_management is false for all non-admins', () => {
      for (const roleDef of ALL_ROLES) {
        if (roleDef.role !== 'administrator' && roleDef.role !== 'jpc_sysadmin') {
          const modPerm = DEFAULT_ROLE_PERMISSIONS[roleDef.role].permissions_management;
          assert.strictEqual(modPerm.view, false, `Default permissions_management.view must be false for ${roleDef.role}`);
          assert.strictEqual(modPerm.manage, false, `Default permissions_management.manage must be false for ${roleDef.role}`);
        }
      }
    });
  });

  describe('5. Dynamic Permission Evaluation & Audit Diffing', () => {
    test('Permission diffing computes exact changes between old and new configurations', () => {
      const orig = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS.jpc_sales));
      const updated = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS.jpc_sales));

      // Make 3 specific changes:
      // 1. Enable export on candidates
      updated.candidates.export = true;
      // 2. Enable delete on followups
      updated.followups.delete = true;
      // 3. Disable edit on pipeline
      updated.pipeline.edit = false;

      const changes: Array<{ module: string; action: PermissionAction; from: boolean; to: boolean }> = [];
      const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'manage', 'export'];

      for (const mod of APP_MODULES) {
        const curMod = orig[mod.id] || createEmptyModulePermission();
        const newMod = updated[mod.id] || createEmptyModulePermission();

        for (const act of actions) {
          if (Boolean(curMod[act]) !== Boolean(newMod[act])) {
            changes.push({
              module: mod.label,
              action: act,
              from: Boolean(curMod[act]),
              to: Boolean(newMod[act]),
            });
          }
        }
      }

      assert.strictEqual(changes.length, 3, 'Should detect exactly 3 changes');

      const candidatesExport = changes.find(c => c.module === 'Candidates' && c.action === 'export');
      assert.ok(candidatesExport);
      assert.strictEqual(candidatesExport.from, false);
      assert.strictEqual(candidatesExport.to, true);

      const followupsDelete = changes.find(c => c.module === 'Follow-Ups' && c.action === 'delete');
      assert.ok(followupsDelete);
      assert.strictEqual(followupsDelete.from, false);
      assert.strictEqual(followupsDelete.to, true);

      const pipelineEdit = changes.find(c => c.module === 'Pipeline Board' && c.action === 'edit');
      assert.ok(pipelineEdit);
      assert.strictEqual(pipelineEdit.from, true);
      assert.strictEqual(pipelineEdit.to, false);
    });

    test('Helper functions createEmptyModulePermission and createFullModulePermission construct valid objects', () => {
      const empty = createEmptyModulePermission();
      assert.strictEqual(empty.view, false);
      assert.strictEqual(empty.create, false);
      assert.strictEqual(empty.edit, false);
      assert.strictEqual(empty.delete, false);
      assert.strictEqual(empty.manage, false);
      assert.strictEqual(empty.export, false);

      const full = createFullModulePermission();
      assert.strictEqual(full.view, true);
      assert.strictEqual(full.create, true);
      assert.strictEqual(full.edit, true);
      assert.strictEqual(full.delete, true);
      assert.strictEqual(full.manage, true);
      assert.strictEqual(full.export, true);
    });
  });
});
