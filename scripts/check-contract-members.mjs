#!/usr/bin/env node
// scripts/check-contract-members.mjs
// CI guard for the contracts/ workspace. Verifies three invariants:
//
// 1. Every Rust crate directory under contracts/ (a subdirectory with its own
//    Cargo.toml) is listed in the workspace `members` array in
//    contracts/Cargo.toml — a crate missing from `members` is silently excluded
//    from `cargo test` and WASM builds: it compiles fine in isolation but is
//    never tested or deployed.
// 2. Every member entry points to an existing crate directory.
// 3. Every crate's [package] `name` matches its directory name — the package
//    name drives the WASM artifact and contract IDs, so a renamed package left
//    in an old directory silently breaks deploys.
//
// Fail CI instead of letting any of these drift.
//
// Usage (from anywhere in the repo): node scripts/check-contract-members.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = join(repoRoot, 'contracts');
const manifestPath = join(contractsDir, 'Cargo.toml');

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) fail(`Missing ${manifestPath}`);

const manifest = readFileSync(manifestPath, 'utf-8');
const membersMatch = manifest.match(/members\s*=\s*\[([^\]]*)\]/);
if (!membersMatch) {
  fail(`Could not parse workspace members from ${manifestPath}`);
}

const members = membersMatch[1]
  .split(',')
  .map((s) => s.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean)
  .sort();

// Crate directories = subdirectories of contracts/ containing a Cargo.toml.
// (Build dirs like target/ have no Cargo.toml and are naturally excluded.)
const crateDirs = readdirSync(contractsDir)
  .filter((entry) => {
    const full = join(contractsDir, entry);
    return (
      statSync(full).isDirectory() && existsSync(join(full, 'Cargo.toml'))
    );
  })
  .sort();

/** Convert a workspace glob pattern (e.g. "contracts/*") to a RegExp. */
function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  );
}

// Member paths may be bare names or carry a "contracts/" prefix; normalize
// before comparing against directory names so both forms cover the same dirs.
const isCovered = (member, dir) => {
  const normalized = member.replace(/^\.\//, '').replace(/^contracts\//, '');
  return normalized === dir || globToRegExp(normalized).test(dir);
};

// 1. Every member entry must resolve to an existing crate directory.
// (Glob entries like "contracts/*" are skipped — they cover many dirs.)
// Member paths are accepted as bare names or with a "contracts/" prefix
// (Cargo accepts both); normalize before resolving.
const missing = members.filter((m) => {
  if (m.includes('*') || m.includes('?')) return false;
  const memberPath = m.replace(/^\.\//, '').replace(/^contracts\//, '');
  const full = join(contractsDir, memberPath);
  return !(
    existsSync(full) &&
    statSync(full).isDirectory() &&
    existsSync(join(full, 'Cargo.toml'))
  );
});

// 2. Every crate directory must be covered by a member entry.
const unlisted = crateDirs.filter(
  (dir) => !members.some((m) => isCovered(m, dir)),
);

if (missing.length > 0) {
  console.error(
    '::error::Workspace member(s) in contracts/Cargo.toml have no crate directory:',
  );
  missing.forEach((m) => console.error(`  ${m}`));
  fail('Fix the members array in contracts/Cargo.toml');
}

if (unlisted.length > 0) {
  console.error(
    '::error::Contract crate(s) are not listed in workspace members (silently excluded from cargo test/build):',
  );
  unlisted.forEach((d) => console.error(`  ${d}`));
  fail('Add them to the members array in contracts/Cargo.toml');
}

// 3. Every crate's [package] name must match its directory name.
const nameMismatches = [];
for (const dir of crateDirs) {
  const crateManifest = readFileSync(
    join(contractsDir, dir, 'Cargo.toml'),
    'utf-8',
  );
  const pkgSection = crateManifest.match(/\[package\]\s*([^\[]*)/);
  if (!pkgSection) {
    nameMismatches.push({ dir, actual: '(no [package] section)' });
    continue;
  }
  const nameMatch = pkgSection[1].match(/^\s*name\s*=\s*(["'])([^"']+?)\1/m);
  if (!nameMatch) {
    nameMismatches.push({ dir, actual: '(no package name)' });
    continue;
  }
  if (nameMatch[2] !== dir) nameMismatches.push({ dir, actual: nameMatch[2] });
}

if (nameMismatches.length > 0) {
  console.error(
    '::error::Contract crate package name does not match its directory name:',
  );
  nameMismatches.forEach(({ dir, actual }) =>
    console.error(
      `  contracts/${dir}/Cargo.toml declares package "${actual}" (expected "${dir}")`,
    ),
  );
  fail('Rename the package in Cargo.toml or the directory so they match');
}

console.log(
  `✅ Workspace consistent: members ↔ directories ↔ package names (${crateDirs.join(', ')})`,
);
