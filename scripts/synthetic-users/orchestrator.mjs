#!/usr/bin/env node
// scripts/synthetic-users/orchestrator.mjs
// Full E2E orchestrator for MaintChain synthetic users.
//
// Runs the complete flow:
//   1. Generate wallets + fund via Friendbot
//   2. Validate wallets
//   3. Register users through backend API
//   4. Verify users on-chain (IdentityRegistry contract)
//   5. Produce verified-wallets.json + audit report
//
// Usage:
//   NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<contract_id> node scripts/synthetic-users/orchestrator.mjs [--count 50]
//   NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<contract_id> node scripts/synthetic-users/orchestrator.mjs --count 5  (quick test)
//
// Required environment variables:
//   NEXT_PUBLIC_IDENTITY_REGISTRY_ID  — deployed IdentityRegistry contract ID
//     OR
//   IDENTITY_REGISTRY_CONTRACT_ID     — same value, alternative name
//
// Optional environment variables:
//   SOROBAN_RPC_URL      — Stellar RPC endpoint (default: https://soroban-testnet.stellar.org)
//   BACKEND_URL          — MaintChain backend URL (default: http://localhost:8081)
//
// Supports resume: re-running picks up where it left off.

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

import { getConfig, getStatePaths } from './config.mjs';
import { generateIndianNameBatch } from './indian-names.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;

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

// ── Run a script ─────────────────────────────────────────────────────

function runScript(name, extraArgs = '') {
  const scriptPath = resolve(SCRIPTS_DIR, name);
  const cmd = `node "${scriptPath}" ${extraArgs}`;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Running: ${name}`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: resolve(SCRIPTS_DIR, '../..'),
      env: { ...process.env },
    });
    return true;
  } catch (err) {
    console.error(`\n❌ Script ${name} failed with exit code ${err.status}`);
    return false;
  }
}

// ── Generate verified-wallets.json ───────────────────────────────────

function generateVerifiedWalletsLedger(config, paths) {
  if (!existsSync(paths.verification)) {
    console.warn('⚠️  verification-results.json not found — skipping ledger generation.');
    return [];
  }

  const verificationData = JSON.parse(readFileSync(paths.verification, 'utf-8'));
  const verified = (verificationData.results || []).filter((r) => r.verified);

  const ledger = verified.map((r) => ({
    syntheticId: r.syntheticId,
    walletId: r.wallet,
    verificationTx: r.transactionHash,
    paymentTx: r.transactionHash, // Verification tx includes the gas payment
    paymentAmountXlm: r.payment?.amount || null,
    verifiedAt: r.timestamp,
  }));

  writeFileSync(paths.verifiedWallets, JSON.stringify(ledger, null, 2));
  return ledger;
}

// ── Print final audit report ─────────────────────────────────────────

function printAuditReport(config, paths) {
  const names = generateIndianNameBatch(config.count);

  // Load all state files
  let wallets = [];
  let registrations = [];
  let verifications = [];

  if (existsSync(paths.wallets)) {
    wallets = JSON.parse(readFileSync(paths.wallets, 'utf-8')).users || [];
  }
  if (existsSync(paths.registration)) {
    registrations = JSON.parse(readFileSync(paths.registration, 'utf-8')).results || [];
  }
  if (existsSync(paths.verification)) {
    verifications = JSON.parse(readFileSync(paths.verification, 'utf-8')).results || [];
  }

  const walletsGenerated = wallets.length;
  const walletsFunded = wallets.filter((w) => w.funded).length;
  const registered = registrations.filter((r) => r.registered).length;
  const verified = verifications.filter((r) => r.verified).length;
  const regFailed = registrations.filter((r) => !r.registered).length;
  const verifyFailed = verifications.filter((r) => !r.verified).length;

  const allPassed =
    walletsGenerated === config.count &&
    walletsFunded === config.count &&
    registered === config.count &&
    verified === config.count;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       MaintChain Synthetic User Audit Report                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Synthetic users:       ${config.count}`);
  console.log(`  Wallets generated:     ${walletsGenerated}`);
  console.log(`  Wallets funded:        ${walletsFunded}`);
  console.log(`  Registered:            ${registered}`);
  console.log(`  Verified:              ${verified}`);
  console.log('');
  console.log(`  Registration failures: ${regFailed}`);
  console.log(`  Verification failures: ${verifyFailed}`);
  console.log('');

  // Show each user's status
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

  if (allPassed) {
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║  RESULT: ✅ PASS                             ║');
    console.log('  ╚══════════════════════════════════════════════╝');
  } else {
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║  RESULT: ❌ FAIL                             ║');
    console.log('  ╚══════════════════════════════════════════════╝');
  }

  console.log('');
  return allPassed;
}

// ── Preflight checks ─────────────────────────────────────────────────

/**
 * POST a JSON-RPC request to the Soroban RPC endpoint.
 */
async function rpcRequest(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message ?? JSON.stringify(data.error);
    throw new Error(msg);
  }
  return data.result;
}

/**
 * Run preflight checks before the E2E flow starts.
 * Verifies: backend reachable, contract deployed and responding on-chain.
 */
async function runPreflight(config) {
  let allPassed = true;

  // ── Check 1: Backend reachable ──
  process.stdout.write('  Backend reachable              ');
  try {
    const res = await fetch(`${config.backendUrl}/health`, { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    if (res.ok && body.status === 'ok') {
      console.log('PASS');
    } else {
      console.log(`FAIL (HTTP ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`FAIL (${err.message})`);
    allPassed = false;
  }

  // ── Check 2: Stellar network (RPC reachable) ──
  process.stdout.write('  Stellar network                 ');
  try {
    const ledger = await rpcRequest(config.rpcUrl, 'getLatestLedger', {});
    if (ledger && ledger.sequence) {
      console.log(`PASS (ledger ${ledger.sequence})`);
    } else {
      console.log('FAIL (no ledger info)');
      allPassed = false;
    }
  } catch (err) {
    console.log(`FAIL (${err.message})`);
    allPassed = false;
  }

  // ── Check 3: IdentityRegistry configured ──
  process.stdout.write('  IdentityRegistry configured     ');
  console.log('PASS');

  // ── Check 4: IdentityRegistry contract reachable on-chain ──
  // Simulates a read-only is_verified(GAAAA...) call to confirm the
  // contract is deployed and responding at the given address.
  // Uses a tiny child script to avoid importing stellar-sdk in the orchestrator.
  process.stdout.write('  IdentityRegistry reachable      ');
  try {
    const contractScript = resolve(SCRIPTS_DIR, 'preflight-contract.mjs');
    const result = execSync(
      `node "${contractScript}" "${config.identityRegistryId}" "${config.rpcUrl}" "${config.networkPassphrase}"`,
      { encoding: 'utf-8', timeout: 20000, env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    console.log(result.trimEnd());
  } catch (err) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || err.message;
    // If the child wrote PASS/WARN to stdout, it succeeded despite exit code
    if (stdout.trimStart().startsWith('PASS') || stdout.trimStart().startsWith('WARN')) {
      console.log(stdout.trimEnd());
    } else {
      console.log('FAIL');
      console.error(`         ${stderr.split('\n')[0]}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const cliArgs = parseArgs();
  const config = getConfig();
  if (cliArgs.count) config.count = cliArgs.count;

  // Ensure .tmp exists
  mkdirSync(config.tmpDir, { recursive: true });

  const paths = getStatePaths(config.tmpDir);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Synthetic User Orchestrator      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Count:    ${config.count}`);
  console.log(`  Backend:  ${config.backendUrl}`);
  console.log(`  RPC:      ${config.rpcUrl}`);
  console.log(`  Contract: ${config.identityRegistryId || '(not set)'}`);
  console.log('');

  // Contract ID is required — fail early with actionable guidance
  if (!config.identityRegistryId) {
    console.error('\n❌ IdentityRegistry contract ID not configured.');
    console.error('   Set one of the following environment variables:');
    console.error('     NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<contract_id>');
    console.error('     IDENTITY_REGISTRY_CONTRACT_ID=<contract_id>');
    console.error('');
    console.error('   The deployed Testnet contract ID is documented in README.md.');
    process.exit(1);
  }

  // ── Preflight checks ──
  console.log('── Preflight ──');
  const preflightOk = await runPreflight(config);
  if (!preflightOk) {
    console.error('\n❌ Preflight checks failed. Fix the issues above and retry.');
    process.exit(1);
  }
  console.log('');

  // ── Step 1: Generate wallets ──
  const genOk = runScript('generate-wallets.mjs', `--count ${config.count}`);
  if (!genOk) {
    console.error('\n❌ Wallet generation failed. Aborting.');
    process.exit(1);
  }

  // ── Step 2: Validate wallets ──
  const valOk = runScript('validate-wallets.mjs', `--count ${config.count}`);
  if (!valOk) {
    console.error('\n⚠️  Wallet validation had issues. Continuing anyway.');
  }

  // ── Step 3: Register users ──
  const regOk = runScript('register-users.mjs', `--count ${config.count}`);
  if (!regOk) {
    console.error('\n⚠️  Some registrations failed. Continuing with verification.');
  }

  // ── Step 4: Verify users ──
  const verOk = runScript('verify-users.mjs', `--count ${config.count}`);
  if (!verOk) {
    console.error('\n⚠️  Some verifications failed.');
  }

  // ── Step 5: Generate verified-wallets.json ──
  console.log('\n── Step 5: Generating verified-wallets.json ──');
  const ledger = generateVerifiedWalletsLedger(config, paths);
  console.log(`  📋 ${ledger.length} verified wallets recorded`);

  // ── Step 6: Audit report ──
  console.log('\n── Step 6: Audit Report ──');
  const passed = printAuditReport(config, paths);

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('\n❌ Orchestrator failed:', err.message);
  process.exit(1);
});
