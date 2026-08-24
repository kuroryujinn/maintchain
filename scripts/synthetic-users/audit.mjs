#!/usr/bin/env node
// scripts/synthetic-users/audit.mjs
// Independently verifies the final state of all synthetic users.
// Checks wallets, registrations, and verifications for consistency.
//
// Usage:
//   node scripts/synthetic-users/audit.mjs [--count 50] [--live]

import { readFileSync, existsSync } from 'fs';
import { getConfig, getStatePaths } from './config.mjs';
import { generateIndianNameBatch } from './indian-names.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      opts.count = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--live') opts.live = true;
  }
  return opts;
}

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

async function main() {
  const cliArgs = parseArgs();
  const config = getConfig();
  if (cliArgs.count) config.count = cliArgs.count;
  const paths = getStatePaths(config.tmpDir);
  const names = generateIndianNameBatch(config.count);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       MaintChain Synthetic User Audit                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const walletsData = loadJson(paths.wallets);
  const regData = loadJson(paths.registration);
  const verData = loadJson(paths.verification);
  const ledgerData = loadJson(paths.verifiedWallets);

  const wallets = walletsData?.users || [];
  const registrations = regData?.results || [];
  const verifications = verData?.results || [];
  const ledger = ledgerData || [];

  // ── Counts ──
  const walletsGenerated = wallets.length;
  const walletsFunded = wallets.filter((w) => w.funded).length;
  const registeredCount = registrations.filter((r) => r.registered).length;
  const verifiedCount = verifications.filter((r) => r.verified).length;

  console.log(`  Synthetic users:       ${config.count}`);
  console.log(`  Wallets generated:     ${walletsGenerated}`);
  console.log(`  Wallets funded:        ${walletsFunded}`);
  console.log(`  Registered:            ${registeredCount}`);
  console.log(`  Verified:              ${verifiedCount}`);
  console.log('');

  // ── Per-user audit ──
  let allPassed = true;
  const failures = [];

  for (let i = 0; i < config.count; i++) {
    const synthId = `SYNTH-${String(i + 1).padStart(4, '0')}`;
    const name = names[i]?.fullName || 'Unknown';
    const wallet = wallets.find((w) => w.syntheticId === synthId);
    const reg = registrations.find((r) => r.syntheticId === synthId);
    const ver = verifications.find((r) => r.syntheticId === synthId);
    const ledgerEntry = ledger.find((l) => l.syntheticId === synthId);

    const issues = [];

    // Wallet checks
    if (!wallet) {
      issues.push('wallet not generated');
    } else {
      if (!wallet.publicKey?.startsWith('G') || wallet.publicKey?.length !== 56) {
        issues.push('invalid public key');
      }
      if (!wallet.funded) {
        issues.push('not funded');
      }
      if (!wallet.fullName) {
        issues.push('missing name');
      }
    }

    // Registration checks
    if (!reg || !reg.registered) {
      issues.push('not registered');
    }

    // Verification checks
    if (!ver || !ver.verified) {
      issues.push('not verified');
    } else {
      if (!ver.transactionHash) {
        issues.push('missing transaction hash');
      }
    }

    // Ledger checks
    if (!ledgerEntry) {
      issues.push('missing from verified-wallets.json');
    }

    const status = issues.length === 0 ? '✅' : '❌';
    if (issues.length > 0) allPassed = false;

    console.log(
      `  ${status} ${synthId} │ ${name.padEnd(20)} │ ${issues.length === 0 ? 'PASS' : issues.join('; ')}`
    );

    if (issues.length > 0) {
      failures.push({ synthId, name, issues });
    }
  }

  console.log('');
  console.log(`  Failures: ${failures.length}`);

  if (allPassed) {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║  RESULT: ✅ PASS                             ║');
    console.log('  ╚══════════════════════════════════════════════╝');
  } else {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║  RESULT: ❌ FAIL                             ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('  Failure details:');
    for (const f of failures) {
      console.log(`    ${f.synthId} (${f.name}): ${f.issues.join(', ')}`);
    }
  }

  console.log('');

  // Print formatted table
  console.log('  ┌──────────────┬─────────────────────────┬────────────┬────────────┐');
  console.log('  │ SYNTH-ID     │ Name                    │ Registered │ Verified   │');
  console.log('  ├──────────────┼─────────────────────────┼────────────┼────────────┤');

  for (let i = 0; i < config.count; i++) {
    const synthId = `SYNTH-${String(i + 1).padStart(4, '0')}`;
    const name = names[i]?.fullName || 'Unknown';
    const reg = registrations.find((r) => r.syntheticId === synthId);
    const ver = verifications.find((r) => r.syntheticId === synthId);

    const regStatus = reg?.registered ? '    ✅    ' : '    ❌    ';
    const verStatus = ver?.verified ? '    ✅    ' : '    ❌    ';

    console.log(
      `  │ ${synthId}  │ ${name.padEnd(23)} │${regStatus}│${verStatus}│`
    );
  }

  console.log('  └──────────────┴─────────────────────────┴────────────┴────────────┘');
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Audit failed:', err.message);
  process.exit(1);
});
