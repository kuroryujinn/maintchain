#!/usr/bin/env node
// scripts/check-deploy-contracts.mjs
// CI guard: the contract references in scripts/deploy-contracts.mjs must match
// the workspace crates. The deploy script installs each crate's WASM artifact
// from contracts/target/wasm32v1-none/release/<package_name>.wasm (Cargo names
// WASM artifacts after the package name with hyphens -> underscores), so:
//
// 1. Every *.wasm reference in the deploy script must correspond to a workspace
//    crate package. A stale reference (crate renamed/removed) would silently
//    deploy a stale artifact — or, if the file no longer exists, skip it.
// 2. Every workspace crate must have a deploy reference. A new contract added
//    to the workspace but forgotten in the deploy script is never deployed.
// 3. No crate may be referenced more than once — deploying the same WASM twice
//    is a configuration error that silently wastes an install+deploy cycle.
//
// Fail CI instead of letting any of these drift.
//
// Usage (from anywhere in the repo): node scripts/check-deploy-contracts.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = join(repoRoot, 'contracts');
const deployPath = join(repoRoot, 'scripts', 'deploy-contracts.mjs');

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!existsSync(deployPath)) fail(`Missing ${deployPath}`);
if (!existsSync(contractsDir)) fail(`Missing ${contractsDir}`);

// Workspace crate package names: subdirectories of contracts/ with a Cargo.toml
// declaring a [package] name. The package name is the authoritative identity —
// the deploy WASM artifact is named after it (hyphens -> underscores).
const crateDirs = readdirSync(contractsDir)
  .filter((entry) => {
    const full = join(contractsDir, entry);
    return (
      statSync(full).isDirectory() && existsSync(join(full, 'Cargo.toml'))
    );
  })
  .sort();

const packages = [];
for (const dir of crateDirs) {
  const manifest = readFileSync(join(contractsDir, dir, 'Cargo.toml'), 'utf-8');
  const pkgSection = manifest.match(/\[package\]\s*([^\[]*)/);
  const nameMatch =
    pkgSection &&
    pkgSection[1].match(/^\s*name\s*=\s*(["'])([^"']+?)\1/m);
  if (!nameMatch) {
    fail(`Could not parse [package] name from contracts/${dir}/Cargo.toml`);
  }
  packages.push(nameMatch[2]);
}

// *.wasm references in the deploy script, anchored to the CONTRACTS `wasmPath:`
// entries (stems only, e.g. "equipment_registry"). Anchoring structurally
// excludes unrelated ".wasm" text — the JS property access `contract.wasmPath`,
// `--wasm` flags, and stray mentions in comments.
const deploy = readFileSync(deployPath, 'utf-8');
// Note: the path is quoted — "...X.wasm')..." — so allow non-")" chars
// (the closing quote) between the .wasm extension and the closing paren.
const wasmStems = [
  ...deploy.matchAll(/wasmPath:\s*resolve\([^)]*?([a-zA-Z0-9_-]+\.wasm)[^)]*\)/g),
].map((m) => m[1].replace(/\.wasm$/, ''));
if (wasmStems.length === 0) {
  fail(`No wasmPath: resolve(...) entries found in ${deployPath}`);
}

// 1. Every deploy wasm reference must map to a workspace crate package.
//    Cargo artifact names use underscores for hyphens: "equipment_registry" <-> "equipment-registry".
const unknown = wasmStems.filter(
  (stem) => !packages.includes(stem.replace(/_/g, '-')),
);

// 2. Every workspace crate must have a deploy wasm reference.
const missing = packages.filter(
  (pkg) => !wasmStems.includes(pkg.replace(/-/g, '_')),
);

// 3. No crate may be referenced more than once.
const counts = {};
for (const s of wasmStems) counts[s] = (counts[s] || 0) + 1;
const duplicates = Object.keys(counts).filter((s) => counts[s] > 1);

if (unknown.length > 0) {
  console.error(
    '::error::scripts/deploy-contracts.mjs references WASM files with no matching workspace crate:',
  );
  unknown.forEach((s) =>
    console.error(
      `  ${s}.wasm (no package "${s.replace(/_/g, '-')}" in contracts/)`,
    ),
  );
  fail('Fix or remove the stale references in the CONTRACTS array');
}

if (missing.length > 0) {
  console.error(
    '::error::Workspace crate(s) have no deployment reference in scripts/deploy-contracts.mjs:',
  );
  missing.forEach((p) =>
    console.error(
      `  ${p} (expected ${p.replace(/-/g, '_')}.wasm in the CONTRACTS array)`,
    ),
  );
  fail('Add the crate to the CONTRACTS array in scripts/deploy-contracts.mjs');
}

if (duplicates.length > 0) {
  console.error(
    '::error::scripts/deploy-contracts.mjs deploys the same crate more than once:',
  );
  duplicates.forEach((s) => console.error(`  ${s}.wasm (${counts[s]}x)`));
  fail('Remove the duplicate entries from the CONTRACTS array');
}

console.log(
  `✅ deploy-contracts.mjs covers all workspace crates (${packages.join(', ')})`,
);
