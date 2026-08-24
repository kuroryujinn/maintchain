#!/usr/bin/env node
// scripts/synthetic-users/register-users.mjs
// Registers all synthetic users through the real MaintChain backend.
//
// Flow per user:
//   1. POST /auth/challenge → get nonce message
//   2. Sign with generated wallet key (Ed25519, SEP-53 format)
//   3. POST /auth/verify → get session cookie
//   4. POST /users with session cookie → register user
//
// Usage:
//   node scripts/synthetic-users/register-users.mjs [--count 50]
//
// Requires wallets.json from generate-wallets.mjs

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';

import { getConfig, getStatePaths } from './config.mjs';
import { sleep } from './utils/http.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── SEP-53 Signing ───────────────────────────────────────────────────
// Freighter signs messages using SEP-53:
//   1. SHA-256("Stellar Signed Message:\n" + message)
//   2. Ed25519_sign(hash)
// We replicate this with Node.js crypto + Stellar SDK Keypair.

function sep53Sign(message, secretKey) {
  const kp = Keypair.fromSecret(secretKey);

  // SHA-256 hash with SEP-53 prefix
  const hash = createHash('sha256')
    .update('Stellar Signed Message:\n')
    .update(message)
    .digest();

  // Ed25519 sign
  const signature = kp.sign(hash);

  // Base64 encode (matches Freighter's output format)
  return signature.toString('base64');
}

// ── HTTP helper ──────────────────────────────────────────────────────

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, text, headers: res.headers };
}

// ── Auth flow ────────────────────────────────────────────────────────

async function createSession(publicKey, secretKey, backendUrl) {
  // Step 1: Get challenge
  const challengeRes = await postJson(`${backendUrl}/auth/challenge`, {
    stellar_address: publicKey,
  });

  if (!challengeRes.ok) {
    throw new Error(
      `Challenge failed (${challengeRes.status}): ${challengeRes.text}`
    );
  }

  const { message } = challengeRes.json;

  // Step 2: Sign with SEP-53
  const signature = sep53Sign(message, secretKey);

  // Step 3: Verify
  const verifyRes = await postJson(`${backendUrl}/auth/verify`, {
    stellar_address: publicKey,
    nonce: message,
    signature,
  });

  if (!verifyRes.ok) {
    throw new Error(
      `Verify failed (${verifyRes.status}): ${verifyRes.text}`
    );
  }

  return verifyRes.json;
}

// ── Register user ────────────────────────────────────────────────────

async function registerUser(
  wallet,
  backendUrl,
  cookie
) {
  const res = await postJson(
    `${backendUrl}/users`,
    {
      stellar_address: wallet.publicKey,
      name: wallet.fullName,
      role: 'TECHNICIAN',
      organization: 'MaintChain Synthetic Testing',
    },
    {
      Cookie: cookie,
    }
  );

  return res;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const config = getConfig();
  const paths = getStatePaths(config.tmpDir);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Synthetic User Registration      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Backend:   ${config.backendUrl}`);
  console.log(`  Network:   ${config.network}`);
  console.log('');

  // ── Check backend is reachable ──
  try {
    const healthRes = await fetch(`${config.backendUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
    console.log('  ✅ Backend is reachable');
  } catch (err) {
    console.error(`  ❌ Backend not reachable at ${config.backendUrl}: ${err.message}`);
    console.error('     Start the backend first: cd backend && cargo run');
    process.exit(1);
  }

  // ── Load wallets ──
  if (!existsSync(paths.wallets)) {
    console.error('❌ wallets.json not found. Run generate-wallets.mjs first.');
    process.exit(1);
  }

  const walletsData = JSON.parse(readFileSync(paths.wallets, 'utf-8'));
  const wallets = walletsData.users || [];

  if (wallets.length === 0) {
    console.error('❌ No wallets found in wallets.json.');
    process.exit(1);
  }

  console.log(`  📋 Loaded ${wallets.length} wallets`);

  // ── Load existing results (resume support) ──
  let results = [];
  if (existsSync(paths.registration)) {
    try {
      const existing = JSON.parse(readFileSync(paths.registration, 'utf-8'));
      results = existing.results || [];
      console.log(`  ℹ️  Found ${results.length} existing registration results`);
    } catch {
      results = [];
    }
  }

  const alreadyRegistered = new Set(
    results.filter((r) => r.registered).map((r) => r.syntheticId)
  );

  console.log(
    `  📋 Already registered: ${alreadyRegistered.size}, pending: ${wallets.length - alreadyRegistered.size}`
  );
  console.log('');

  // ── Register each user ──
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];

    // Skip if already registered (resume support)
    if (alreadyRegistered.has(wallet.syntheticId)) {
      skipped++;
      continue;
    }

    const label = `${wallet.syntheticId} (${wallet.fullName})`;

    try {
      // Create session via SEP-53 challenge-response
      console.log(`  🔐 ${label}: creating session...`);
      const session = await createSession(
        wallet.publicKey,
        wallet.secretKey,
        config.backendUrl
      );

      // The backend /auth/verify doesn't set cookies — it just returns
      // { verified: true, stellar_address: "..." }. The session cookie
      // is created by the Next.js proxy. For direct backend calls,
      // we pass X-User-Address header instead.
      console.log(`  📝 ${label}: registering...`);

      const regRes = await fetch(`${config.backendUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Address': wallet.publicKey,
          Authorization: 'Bearer test',
        },
        body: JSON.stringify({
          stellar_address: wallet.publicKey,
          name: wallet.fullName,
          role: 'TECHNICIAN',
          organization: 'MaintChain Synthetic Testing',
        }),
      });

      const regBody = await regRes.text();
      let regJson;
      try {
        regJson = JSON.parse(regBody);
      } catch {
        regJson = null;
      }

      if (regRes.ok || regRes.status === 409) {
        // 409 = already registered (not an error for resume)
        successful++;
        results.push({
          syntheticId: wallet.syntheticId,
          wallet: wallet.publicKey,
          registered: true,
          registrationTimestamp: new Date().toISOString(),
          error: null,
          userId: regJson?.id || null,
        });
        console.log(
          `  ✅ ${label}: registered${regRes.status === 409 ? ' (already existed)' : ''}`
        );
      } else {
        failed++;
        results.push({
          syntheticId: wallet.syntheticId,
          wallet: wallet.publicKey,
          registered: false,
          registrationTimestamp: null,
          error: `HTTP ${regRes.status}: ${regBody.slice(0, 200)}`,
          userId: null,
        });
        console.error(
          `  ❌ ${label}: failed (${regRes.status}): ${regBody.slice(0, 100)}`
        );
      }
    } catch (err) {
      failed++;
      results.push({
        syntheticId: wallet.syntheticId,
        wallet: wallet.publicKey,
        registered: false,
        registrationTimestamp: null,
        error: err.message,
        userId: null,
      });
      console.error(`  ❌ ${label}: error: ${err.message}`);
    }

    // Rate limit: small delay between requests
    if (i < wallets.length - 1) {
      await sleep(300);
    }

    // Save progress after each registration (crash recovery)
    saveResults(paths.registration, results, wallets.length);
  }

  // ── Final report ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Registration Complete                       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total:      ${wallets.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Skipped:    ${skipped} (already registered)`);
  console.log('');
  console.log(`  Results saved to: ${paths.registration}`);
}

function saveResults(filePath, results, total) {
  const successful = results.filter((r) => r.registered).length;
  const failed = results.filter((r) => !r.registered).length;
  writeFileSync(
    filePath,
    JSON.stringify({ total, successful, failed, results }, null, 2)
  );
}

main().catch((err) => {
  console.error('\n❌ Registration failed:', err.message);
  process.exit(1);
});
