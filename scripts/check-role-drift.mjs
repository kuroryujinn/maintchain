#!/usr/bin/env node
// scripts/check-role-drift.mjs
// Standalone CI guard: fails if the frontend role list (frontend/src/lib/roles.ts)
// drifts from the users_role_check CHECK constraint in
// backend/migrations/0004_user_roles.sql.
//
// Runs independently of the vitest suite (roles.test.ts covers the same ground),
// so the guard keeps working even if the test file or `npm test` changes.
//
// Usage (from anywhere in the repo): node scripts/check-role-drift.mjs

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = join(repoRoot, 'backend', 'migrations', '0004_user_roles.sql');
const rolesPath = join(repoRoot, 'frontend', 'src', 'lib', 'roles.ts');

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!existsSync(sqlPath)) fail(`Missing ${sqlPath}`);
if (!existsSync(rolesPath)) fail(`Missing ${rolesPath}`);

// Extract role names from the users_role_check CHECK constraint.
const sql = readFileSync(sqlPath, 'utf-8');
const checkMatch = sql.match(
  /role\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*role\s+IN\s*\(([^)]*)\)/i,
);
if (!checkMatch) {
  fail(`Could not parse users_role_check constraint from ${sqlPath}`);
}
// NOTE: no Set-dedupe here — a duplicate role in either file is itself a bug
// and must fail, matching the stricter semantics of roles.test.ts.
const sqlRoles = checkMatch[1]
  .split(',')
  .map((s) => s.trim().replace(/^'|'$/g, ''))
  .filter(Boolean)
  .sort();

// Extract the canonical role list from roles.ts (the USER_ROLES array literal).
const ts = readFileSync(rolesPath, 'utf-8');
const listMatch = ts.match(/export\s+const\s+USER_ROLES\s*=\s*\[([^\]]*)\]/);
if (!listMatch) {
  fail(`Could not parse USER_ROLES from ${rolesPath}`);
}
const tsRoles = listMatch[1]
  .split(',')
  .map((s) => s.trim().replace(/^'|'$/g, ''))
  .filter(Boolean)
  .sort();

if (JSON.stringify(sqlRoles) !== JSON.stringify(tsRoles)) {
  console.error('::error::Role drift between frontend and database:');
  console.error(`  DB (${sqlPath}):        ${sqlRoles.join(', ') || '(none)'}`);
  console.error(`  frontend (${rolesPath}): ${tsRoles.join(', ') || '(none)'}`);
  fail(
    'frontend/src/lib/roles.ts must match the users_role_check constraint in backend/migrations/0004_user_roles.sql',
  );
}

console.log(`✅ roles.ts matches the DB constraint (${tsRoles.join(', ')})`);
