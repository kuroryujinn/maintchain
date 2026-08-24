#!/usr/bin/env node
// scripts/synthetic-users/generate-wallets.mjs
// Generates Stellar Testnet keypairs, funds them via Friendbot,
// and stores the results in .tmp/wallets.json.
//
// Usage:
//   node scripts/synthetic-users/generate-wallets.mjs [--count 50]
//
// Environment:
//   SYNTHETIC_COUNT   — number of wallets (default: 50)
//   SOROBAN_RPC_URL   — Stellar RPC (default: testnet)

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Keypair } from '@stellar/stellar-sdk';

import { getConfig, getStatePaths } from './config.mjs';
import { generateIndianNameBatch } from './indian-names.mjs';
import { postJsonWithRetry, getJsonWithRetry, sleep } from './utils/http.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Friendbot URL ────────────────────────────────────────────────────
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// ── Parse CLI args ───────────────────────────────────────────────────
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

// ── Fund a wallet via Friendbot ──────────────────────────────────────
async function fundWallet(publicKey) {
  const url = `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`;
  const result = await postJsonWithRetry(
    url,
    {},
    { retries: 3, backoffMs: 3000, label: `Friendbot ${publicKey.slice(0, 8)}` }
  );
  return result;
}

// ── Check account balance via Horizon ────────────────────────────────
async function checkBalance(publicKey) {
  const url = `https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(publicKey)}`;
  const account = await getJsonWithRetry(url, {
    retries: 3,
    backoffMs: 1000,
    label: `Balance ${publicKey.slice(0, 8)}`,
  });
  if (!account || !account.balances) return null;
  const native = account.balances.find((b) => b.asset_type === 'native');
  return native ? parseFloat(native.balance) : 0;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const cliArgs = parseArgs();
  const config = getConfig();
  const count = cliArgs.count || config.count;

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Synthetic Wallet Generator       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Count:       ${count}`);
  console.log(`  Network:     ${config.network}`);
  console.log(`  RPC URL:     ${config.rpcUrl}`);
  console.log(`  Friendbot:   ${FRIENDBOT_URL}`);
  console.log('');

  // Ensure .tmp directory exists
  mkdirSync(config.tmpDir, { recursive: true });

  const paths = getStatePaths(config.tmpDir);

  // Check for existing wallets (resume support)
  let existingWallets = [];
  if (existsSync(paths.wallets)) {
    try {
      const existing = JSON.parse(readFileSync(paths.wallets, 'utf-8'));
      existingWallets = existing.users || [];
      console.log(`  ℹ️  Found ${existingWallets.length} existing wallets — will reuse.`);
    } catch {
      existingWallets = [];
    }
  }

  // Determine how many new wallets to generate
  const existingCount = existingWallets.length;
  const newCount = Math.max(0, count - existingCount);

  if (newCount === 0 && existingCount >= count) {
    console.log(`  ✅ Already have ${existingCount} wallets (>= requested ${count}). Nothing to generate.`);
    return;
  }

  // Generate names for all users
  const names = generateIndianNameBatch(count);

  // Generate new keypairs
  console.log(`\n── Step 1: Generating ${newCount} new Stellar keypairs ──`);
  const newWallets = [];
  for (let i = 0; i < newCount; i++) {
    const globalIndex = existingCount + i;
    const kp = Keypair.random();
    const name = names[globalIndex];

    newWallets.push({
      syntheticId: name.syntheticId,
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
      network: 'testnet',
      createdAt: new Date().toISOString(),
      funded: false,
      balance: null,
      firstName: name.firstName,
      lastName: name.lastName,
      fullName: name.fullName,
    });

    // Log public key only — NEVER log secret key
    console.log(
      `  🔑 ${name.syntheticId} | ${name.fullName} | ${kp.publicKey().slice(0, 12)}...`
    );
  }

  // Combine with existing wallets
  const allWallets = [...existingWallets, ...newWallets];

  // Save intermediate state (before funding)
  saveWallets(paths.wallets, allWallets);
  console.log(`\n  💾 Saved ${allWallets.length} wallet records to wallets.json`);

  // Fund new wallets
  console.log(`\n── Step 2: Funding ${newCount} wallets via Friendbot ──`);
  let fundedCount = existingWallets.filter((w) => w.funded).length;
  let failedFunds = 0;

  for (let i = 0; i < newWallets.length; i++) {
    const wallet = newWallets[i];
    const label = `${wallet.syntheticId} (${wallet.fullName})`;

    // Skip if already funded (resume support)
    if (wallet.funded) {
      fundedCount++;
      continue;
    }

    try {
      console.log(`  💰 Funding ${label}...`);
      await fundWallet(wallet.publicKey);
      wallet.funded = true;
      fundedCount++;
      console.log(`  ✅ ${label} funded`);

      // Rate limit: wait between friendbot calls
      if (i < newWallets.length - 1) {
        await sleep(500);
      }
    } catch (err) {
      failedFunds++;
      console.error(`  ❌ ${label} funding failed: ${err.message}`);
    }

    // Save progress after each funding (crash recovery)
    saveWallets(paths.wallets, allWallets);
  }

  // Verify balances
  console.log(`\n── Step 3: Verifying balances ──`);
  let verifiedCount = 0;
  let insufficientBalance = 0;

  for (const wallet of allWallets) {
    if (!wallet.funded) continue;

    try {
      const balance = await checkBalance(wallet.publicKey);
      wallet.balance = balance;

      if (balance !== null && balance > 0) {
        verifiedCount++;
      } else {
        insufficientBalance++;
        console.warn(
          `  ⚠️  ${wallet.syntheticId}: balance is ${balance} XLM`
        );
      }
    } catch {
      // Account might not exist yet — skip
    }
  }

  // Final save
  saveWallets(paths.wallets, allWallets);

  // Report
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Wallet Generation Complete                  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total wallets:     ${allWallets.length}`);
  console.log(`  New generated:     ${newCount}`);
  console.log(`  Funded:            ${fundedCount}`);
  console.log(`  Funding failures:  ${failedFunds}`);
  console.log(`  Balance verified:  ${verifiedCount}`);
  console.log(`  Insufficient:      ${insufficientBalance}`);
  console.log('');
  console.log(`  State saved to: ${paths.wallets}`);
  console.log('');
  console.log('  ⚠️  wallet secret keys are stored in wallets.json');
  console.log('     This file MUST NOT be committed to Git.');
}

/**
 * Save wallets to the state file.
 * @param {string} filePath
 * @param {import('./types.mjs').SyntheticWallet[]} users
 */
function saveWallets(filePath, users) {
  const data = {
    network: 'testnet',
    generatedAt: new Date().toISOString(),
    count: users.length,
    users,
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('\n❌ Wallet generation failed:', err.message);
  process.exit(1);
});
