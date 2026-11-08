import { describe, expect, it } from 'vitest';
import { UserRole } from '@/features/auth/constants';
import { ACCESS, hasPermission } from '@/features/auth/permissions';

describe('hasPermission', () => {
  it('allows a role listed for the action', () => {
    expect(hasPermission(UserRole.Owner, 'fuel-pricing', 'view')).toBe(true);
  });

  it('denies a role not listed for the action', () => {
    expect(hasPermission(UserRole.Cashier, 'fuel-pricing', 'view')).toBe(false);
  });

  it('denies when there is no role', () => {
    expect(hasPermission(null, 'cash-management', 'view')).toBe(false);
  });
});

describe('ACCESS table', () => {
  it('only lists real roles', () => {
    const known = new Set<string>(Object.values(UserRole));

    for (const actions of Object.values(ACCESS)) {
      for (const roles of Object.values(actions)) {
        for (const role of roles) expect(known.has(role)).toBe(true);
      }
    }
  });

  it('never grants an action to a role that cannot view the module', () => {
    for (const [moduleId, actions] of Object.entries(ACCESS)) {
      const viewers: readonly UserRole[] = actions.view;
      for (const [action, roles] of Object.entries(actions)) {
        for (const role of roles as readonly UserRole[]) {
          expect(
            viewers.includes(role),
            `${role} can ${action} ${moduleId} but cannot view it`,
          ).toBe(true);
        }
      }
    }
  });
});
