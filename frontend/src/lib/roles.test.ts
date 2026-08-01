// frontend/src/lib/roles.test.ts
// Drift guard for the single source of truth in roles.ts.
// Asserts the shared role list matches the backend CHECK constraint in
// backend/migrations/0004_user_roles.sql, so a mismatch between the
// frontend role list and the database fails in CI (this bug class caused
// every /register submission to 500 with "violates check constraint
// users_role_check").

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { ALLOWED_ROLES, ROLE_CODES, ROLE_OPTIONS, USER_ROLES } from './roles';

/**
 * Locate the backend migration that defines users_role_check.
 *
 * We deliberately resolve from process.cwd() (walking up to the repo root)
 * rather than import.meta.url: Vitest's Vite transform rewrites
 * import.meta.url to a non-file: scheme, which breaks fileURLToPath. CI and
 * the npm test script always run vitest from frontend/, but the walk-up also
 * covers repo-root or deeper invocations.
 */
function findMigrationPath(): string {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'backend', 'migrations', '0004_user_roles.sql');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    'Could not locate backend/migrations/0004_user_roles.sql from process.cwd()',
  );
}

/** Parse the role names out of the users_role_check CHECK constraint. */
function rolesFromMigration(): string[] {
  const migrationPath = findMigrationPath();
  const sql = readFileSync(migrationPath, 'utf-8');
  const checkMatch = sql.match(
    /role\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*role\s+IN\s*\(([^)]*)\)/i,
  );
  if (!checkMatch) {
    throw new Error(
      `Could not parse users_role_check constraint from ${migrationPath}`,
    );
  }
  return checkMatch[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
}

describe('roles (single source of truth)', () => {
  it('matches the backend users_role_check CHECK constraint', () => {
    const dbRoles = rolesFromMigration();
    expect([...USER_ROLES].sort()).toEqual(dbRoles.sort());
  });

  it('ALLOWED_ROLES matches USER_ROLES', () => {
    expect([...ALLOWED_ROLES]).toEqual([...USER_ROLES]);
  });

  it('ROLE_CODES covers every role exactly once with distinct codes', () => {
    expect(Object.keys(ROLE_CODES).sort()).toEqual([...USER_ROLES].sort());
    const codes = Object.values(ROLE_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('ROLE_OPTIONS cover every role with a label and description', () => {
    expect(ROLE_OPTIONS.map((o) => o.value).sort()).toEqual(
      [...USER_ROLES].sort(),
    );
    for (const opt of ROLE_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
      expect(opt.description.length).toBeGreaterThan(0);
    }
  });
});
