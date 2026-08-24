#!/usr/bin/env node
// scripts/synthetic-users/verify-users.mjs
// Verifies all registered synthetic users by calling IdentityRegistry.verify_identity
// on Stellar Testnet via direct Soroban RPC (no Freighter needed).
//
// Flow per user:
//   1. Compute SHA-256 identity hashes (org + profile)
//   2. Build IdentityRegistry.verify_identity transaction
//   3. Simulate for footprint
//   4. Sign with generated wallet key
//   5. Submit to Soroban RPC
//   6. Poll for confirmation
//   7. Mirror result to backend POST /verification
//
// Usage:
//   node scripts/synthetic-users/verify-users.mjs [--count 50]
//
// Requires wallets.json and registration-results.json

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import {
  Keypair,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  SorobanDataBuilder,
  xdr,
  Account,
  Address,
  Operation,
  authorizeInvocation,
} from '@stellar/stellar-sdk';

import { getConfig, getStatePaths } from './config.mjs';
import { sleep } from './utils/http.mjs';

// ── SHA-256 helper ───────────────────────────────────────────────────

function sha256Hex(input) {
  return '0x' + createHash('sha256').update(input).digest('hex');
}

// ── RPC helper ───────────────────────────────────────────────────────

async function rpcRequest(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });

  if (!res.ok) {
    throw new Error(`RPC ${method} failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  if (data.error) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message ?? 'unknown RPC error';
    throw new Error(`RPC ${method} error: ${msg}`);
  }
  return data.result;
}

// ── Get latest ledger sequence ───────────────────────────────────────

async function getLatestLedger(rpcUrl) {
  const result = await rpcRequest(rpcUrl, 'getLatestLedger', {});
  return result.sequence;
}

// ── Get account sequence ─────────────────────────────────────────────

async function getAccountSequence(rpcUrl, publicKey) {
  const ledgerKey = xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({
      accountId: Keypair.fromPublicKey(publicKey).xdrPublicKey(),
    })
  );

  const result = await rpcRequest(rpcUrl, 'getLedgerEntries', {
    keys: [ledgerKey.toXDR('base64')],
  });

  const entry = result?.entries?.[0];
  if (!entry) {
    throw new Error(`Account not found: ${publicKey}`);
  }

  // Parse as LedgerEntryData (matches live RPC response)
  try {
    return xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64')
      .account()
      .seqNum()
      .toString();
  } catch {
    return xdr.LedgerEntry.fromXDR(entry.xdr, 'base64')
      .data()
      .account()
      .seqNum()
      .toString();
  }
}

// ── Role codes (matches IdentityRegistry contract) ───────────────────

const ROLE_CODES = {
  TECHNICIAN: 1,
  SUPERVISOR: 2,
  AUDITOR: 3,
  OWNER: 4,
};

// ── Verify a single user ─────────────────────────────────────────────

async function verifyUser(wallet, config) {
  const { rpcUrl, networkPassphrase, identityRegistryId, backendUrl } = config;

  if (!identityRegistryId) {
    throw new Error(
      'IdentityRegistry contract ID not configured. Set NEXT_PUBLIC_IDENTITY_REGISTRY_ID.'
    );
  }

  // Step 1: Compute identity hashes
  const org = 'MaintChain Synthetic Testing';
  const orgHash = sha256Hex(org);
  const profileHash = sha256Hex(
    JSON.stringify({
      stellar_address: wallet.publicKey,
      name: wallet.fullName,
      role: 'TECHNICIAN',
      organization: org,
    })
  );

  // Step 2: Get account sequence
  const sequence = await getAccountSequence(rpcUrl, wallet.publicKey);

  // Step 3: Build contract call arguments
  const roleCode = ROLE_CODES['TECHNICIAN'] || 1;

  // Build ScVal arguments
  const scValArgs = [
    new Address(wallet.publicKey).toScVal(),
    xdr.ScVal.scvU32(roleCode),
    xdr.ScVal.scvBytes(
      Buffer.from(orgHash.replace('0x', ''), 'hex')
    ),
    xdr.ScVal.scvBytes(
      Buffer.from(profileHash.replace('0x', ''), 'hex')
    ),
  ];

  // Step 4: Build the SorobanAuthorizedInvocation tree
  // This describes what the contract call does, so the auth system can verify it
  const rootInvocation = new xdr.SorobanAuthorizedInvocation({
    function: new xdr.SorobanAuthorizedFunction(
      xdr.SorobanAuthorizedFunctionType.sorobanAuthorizedFunctionTypeContractFn(),
      new xdr.InvokeContractArgs({
        contractAddress: new Address(identityRegistryId).toScAddress(),
        functionName: 'verify_identity',
        args: scValArgs,
      })
    ),
    subInvocations: [],
  });

  // Step 5: Get latest ledger for auth entry expiration
  const latestLedger = await getLatestLedger(rpcUrl);
  const validUntilLedger = latestLedger + 100;

  // Step 6: Sign the authorization entry with the wallet key
  // authorizeInvocation creates a SorobanAuthorizationEntry signed by the wallet
  const kp = Keypair.fromSecret(wallet.secretKey);
  const authEntry = await authorizeInvocation(
    kp,
    validUntilLedger,
    rootInvocation,
    wallet.publicKey,
    networkPassphrase,
  );

  // Step 7: Build the HostFunction and InvokeHostFunctionOp WITH auth entries
  // contract.call() creates an op with empty auth — we need to rebuild with auth
  // so the Soroban VM can verify the require_auth() check
  const contract = new Contract(identityRegistryId);
  const baseOp = contract.call('verify_identity', ...scValArgs);
  const ihfOp = baseOp.body().invokeHostFunctionOp();
  const hostFunction = ihfOp.hostFunction();

  const invokeOp = new xdr.InvokeHostFunctionOp({
    hostFunction,
    auth: [authEntry],  // SorobanAuthorizationEntry[] — required for require_auth()
  });

  const op = new xdr.Operation({
    sourceAccount: baseOp.sourceAccount(),
    body: xdr.OperationBody.invokeHostFunction(invokeOp),
  });

  // Step 8: Build initial transaction for simulation
  const tx = new TransactionBuilder(new Account(wallet.publicKey, sequence), {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  // Step 9: Simulate for footprint + resource fees
  const simulation = await rpcRequest(rpcUrl, 'simulateTransaction', {
    transaction: tx.toXDR(),
  });

  if (simulation.error) {
    throw new Error(`Simulation error: ${simulation.error}`);
  }
  if (simulation.result?.error) {
    throw new Error(`Simulation result error: ${JSON.stringify(simulation.result.error)}`);
  }

  const transactionData = simulation.transactionData;
  if (!transactionData) {
    throw new Error('Simulation did not return transactionData');
  }

  // Step 10: Build final transaction with soroban data from simulation
  // Fee must cover both the base fee and the Soroban resource fee
  // BASE_FEE is a string ('100') — cast to Number to avoid string concatenation
  const minResourceFee = parseInt(simulation.minResourceFee || '0', 10);
  const totalFee = String(Number(BASE_FEE) + minResourceFee);

  const sorobanData = xdr.SorobanTransactionData.fromXDR(transactionData, 'base64');

  const finalTx = new TransactionBuilder(new Account(wallet.publicKey, sequence), {
    fee: totalFee,
    networkPassphrase,
    sorobanData: new SorobanDataBuilder(sorobanData).build(),
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  // Step 11: Sign the transaction with wallet key
  finalTx.sign(kp);
  const signedXDR = finalTx.toXDR('base64');

  // Step 12: Submit
  const sendResult = await rpcRequest(rpcUrl, 'sendTransaction', {
    transaction: signedXDR,
  });

  const txHash = sendResult.hash;
  let txStatus = sendResult.status;

  // Step 10: Poll for confirmation
  const MAX_POLL = 15;
  let pollResult = null;

  if (txStatus === 'PENDING') {
    for (let i = 0; i < MAX_POLL; i++) {
      await sleep(1000);
      try {
        pollResult = await rpcRequest(rpcUrl, 'getTransaction', {
          hash: txHash,
        });
        txStatus = pollResult.status;
        if (txStatus === 'SUCCESS' || txStatus === 'FAILED') break;
      } catch {
        // Transient — keep polling
      }
    }
  }

  if (txStatus !== 'SUCCESS') {
    let errorMsg = `Transaction ${txStatus}: ${txHash}`;
    if (pollResult?.resultXdr) {
      try {
        const txResult = xdr.TransactionResult.fromXDR(pollResult.resultXdr, 'base64');
        const resultCode = txResult.result().switch().name || String(txResult.result().switch());
        errorMsg += ` (code: ${resultCode})`;
        // Try to extract inner result for Soroban errors
        if (txResult.result().switch().name === 'opSuccess') {
          const inner = txResult.result().success().results?.[0];
          if (inner) {
            const innerResult = inner.tr().result();
            if (innerResult.switch().name === 'invokeHostFunction') {
              const hfResult = innerResult.invokeHostFunctionResult();
              if (hfResult.switch().name === 'success') {
                errorMsg += ` [Soroban success but env error — check logs]`;
              } else {
                errorMsg += ` [Soroban: ${hfResult.switch().name}]`;
              }
            }
          }
        }
      } catch (e) {
        errorMsg += ` (parse error: ${e.message}, raw: ${pollResult.resultXdr.slice(0, 120)}...)`;
      }
    }
    throw new Error(errorMsg);
  }

  // Step 10: Mirror to backend
  try {
    await fetch(`${backendUrl}/verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Address': wallet.publicKey,
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({
        stellar_address: wallet.publicKey,
        role: 'TECHNICIAN',
        organization: org,
        profile_hash: profileHash,
        organization_hash: orgHash,
        verification_tx_hash: txHash,
        verified_at: new Date().toISOString(),
        network: 'TESTNET',
      }),
    });
  } catch (err) {
    console.warn(
      `  ⚠️  Backend mirror failed for ${wallet.syntheticId}: ${err.message}`
    );
  }

  return {
    transactionHash: txHash,
    orgHash,
    profileHash,
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const config = getConfig();
  const paths = getStatePaths(config.tmpDir);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Synthetic User Verification      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Backend:   ${config.backendUrl}`);
  console.log(`  RPC:       ${config.rpcUrl}`);
  console.log(`  Contract:  ${config.identityRegistryId || '(not set)'}`);
  console.log('');

  if (!config.identityRegistryId) {
    console.error('❌ IdentityRegistry contract ID not configured.');
    console.error(
      '   Set NEXT_PUBLIC_IDENTITY_REGISTRY_ID or IDENTITY_REGISTRY_CONTRACT_ID.'
    );
    process.exit(1);
  }

  // ── Load wallets ──
  if (!existsSync(paths.wallets)) {
    console.error('❌ wallets.json not found. Run generate-wallets.mjs first.');
    process.exit(1);
  }

  const walletsData = JSON.parse(readFileSync(paths.wallets, 'utf-8'));
  const wallets = walletsData.users || [];

  // ── Load existing results (resume support) ──
  let results = [];
  if (existsSync(paths.verification)) {
    try {
      const existing = JSON.parse(readFileSync(paths.verification, 'utf-8'));
      results = existing.results || [];
    } catch {
      results = [];
    }
  }

  const alreadyVerified = new Set(
    results.filter((r) => r.verified).map((r) => r.syntheticId)
  );

  const pending = wallets.filter((w) => !alreadyVerified.has(w.syntheticId));
  console.log(
    `  📋 ${wallets.length} wallets, ${alreadyVerified.size} already verified, ${pending.length} pending`
  );
  console.log('');

  // ── Verify each user ──
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];

    if (alreadyVerified.has(wallet.syntheticId)) {
      skipped++;
      continue;
    }

    const label = `${wallet.syntheticId} (${wallet.fullName})`;

    try {
      console.log(`  🔗 ${label}: verifying on-chain...`);
      const result = await verifyUser(wallet, config);

      successful++;
      results.push({
        syntheticId: wallet.syntheticId,
        wallet: wallet.publicKey,
        verified: true,
        transactionHash: result.transactionHash,
        network: 'testnet',
        payment: { occurred: false, amount: null, asset: 'XLM' },
        timestamp: new Date().toISOString(),
        error: null,
      });

      console.log(
        `  ✅ ${label}: verified (tx: ${result.transactionHash.slice(0, 12)}...)`
      );
    } catch (err) {
      failed++;
      results.push({
        syntheticId: wallet.syntheticId,
        wallet: wallet.publicKey,
        verified: false,
        transactionHash: null,
        network: 'testnet',
        payment: { occurred: false, amount: null, asset: 'XLM' },
        timestamp: null,
        error: err.message,
      });
      console.error(`  ❌ ${label}: ${err.message}`);
    }

    // Rate limit: wait between transactions
    if (i < wallets.length - 1) {
      await sleep(1500);
    }

    // Save progress (crash recovery)
    saveResults(paths.verification, results, wallets.length);
  }

  // ── Final report ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Verification Complete                       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total:      ${wallets.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Skipped:    ${skipped} (already verified)`);
  console.log('');
  console.log(`  Results saved to: ${paths.verification}`);
}

function saveResults(filePath, results, total) {
  const successful = results.filter((r) => r.verified).length;
  const failed = results.filter((r) => !r.verified).length;
  writeFileSync(
    filePath,
    JSON.stringify({ total, successful, failed, results }, null, 2)
  );
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err.message);
  process.exit(1);
});
