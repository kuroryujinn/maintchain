#!/usr/bin/env node
// scripts/synthetic-users/validate-wallets.mjs
// Validates the generated wallets file:
//   - Exactly N wallets exist
//   - All public keys are valid Stellar addresses
//   - All accounts exist on Testnet
//   - All have sufficient balance (> 0 XLM)
//   - No duplicate wallet addresses
//   - All have assigned Indian names
//
// Usage:
//   node scripts/synthetic-users/validate-wallets.mjs [--count 50]

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getConfig, getStatePaths } from './config.mjs';
import { getJsonWithRetry } from './utils/http.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      opts.count = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return opts;
}

function isValidStellarPublicKey(key) {
  return typeof key === 'string' && key.startsWith('G') && key.length === 56;
}

async function main() {
  const cliArgs = parseArgs();
  const config = getConfig();
  const expectedCount = cliArgs.count || config.count;
  const paths = getStatePaths(config.tmpDir);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Wallet Validator                 ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // ── Check wallets file exists ──
  if (!existsSync(paths.wallets)) {
    console.error('❌ wallets.json not found. Run generate-wallets.mjs first.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(paths.wallets, 'utf-8'));
  const users = data.users || [];

  let passed = 0;
  let failed = 0;
  const failures = [];

  function check(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✅ ${message}`);
    } else {
      failed++;
      failures.push(message);
      console.error(`  ❌ ${message}`);
    }
  }

  // ── Count check ──
  console.log('── Wallet Count ──');
  check(
    users.length === expectedCount,
    `Expected ${expectedCount} wallets, found ${users.length}`
  );

  // ── Duplicate check ──
  console.log('\n── Duplicate Addresses ──');
  const pubKeys = users.map((u) => u.publicKey);
  const uniqueKeys = new Set(pubKeys);
  check(
    uniqueKeys.size === users.length,
    `Expected ${users.length} unique addresses, found ${uniqueKeys.size}`
  );

  // ── Format check ──
  console.log('\n── Public Key Format ──');
  let allKeysValid = true;
  for (const user of users) {
    if (!isValidStellarPublicKey(user.publicKey)) {
      allKeysValid = false;
      console.error(`  ❌ ${user.syntheticId}: invalid public key format`);
    }
  }
  check(allKeysValid, `All ${users.length} public keys are valid Stellar G... addresses`);

  // ── Name check ──
  console.log('\n── Indian Names ──');
  let allNamesPresent = true;
  for (const user of users) {
    if (!user.fullName || !user.firstName || !user.lastName) {
      allNamesPresent = false;
      console.error(`  ❌ ${user.syntheticId}: missing name fields`);
    }
  }
  check(allNamesPresent, `All ${users.length} users have assigned Indian names`);

  // ── Network check ──
  console.log('\n── Network ──');
  const allTestnet = users.every((u) => u.network === 'testnet');
  check(allTestnet, `All wallets are on Testnet`);

  // ── Funding check ──
  console.log('\n── Funding Status ──');
  const fundedCount = users.filter((u) => u.funded).length;
  check(fundedCount === users.length, `All ${users.length} wallets are funded (${fundedCount}/${users.length})`);

  // ── Live balance check (optional, slow) ──
  if (process.argv.includes('--live')) {
    console.log('\n── Live Balance Check (Horizon) ──');
    let liveVerified = 0;
    let liveFailed = 0;

    for (const user of users) {
      try {
        const url = `https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(user.publicKey)}`;
        const account = await getJsonWithRetry(url, { retries: 2, backoffMs: 1000 });
        if (account && account.balances) {
          const native = account.balances.find((b) => b.asset_type === 'native');
          const balance = native ? parseFloat(native.balance) : 0;
          if (balance > 0) {
            liveVerified++;
          } else {
            liveFailed++;
            console.error(`  ❌ ${user.syntheticId}: balance is ${balance} XLM`);
          }
        } else {
          liveFailed++;
          console.error(`  ❌ ${user.syntheticId}: account not found on Testnet`);
        }
      } catch {
        liveFailed++;
        console.error(`  ❌ ${user.syntheticId}: failed to check balance`);
      }
    }
    check(liveFailed === 0, `All ${users.length} accounts exist on Testnet with balance (${liveVerified}/${users.length})`);
  } else {
    console.log('\n  ℹ️  Skipping live balance check. Run with --live to verify on Testnet.');
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Validation Results                          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Wallets:   ${users.length}`);
  console.log(`  Passed:    ${passed}`);
  console.log(`  Failed:    ${failed}`);
  console.log('');
  console.log(`  RESULT: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}`);

  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`    - ${f}`);
    }
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Validation failed:', err.message);
  process.exit(1);
});
