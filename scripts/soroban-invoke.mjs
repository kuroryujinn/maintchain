// scripts/soroban-invoke.mjs
// Node.js helper script for building, signing, and submitting Soroban transactions.
// Called by the Rust backend via subprocess when a deployer secret key is configured.
//
// Usage:
//   node scripts/soroban-invoke.mjs < command.json
//
// Input (stdin JSON):
//   {
//     "rpc_url": "https://soroban-testnet.stellar.org",
//     "network_passphrase": "Test SDF Network ; September 2015",
//     "contract_id": "C...",
//     "method": "verify_compliance",
//     "args": ["0x..."],
//     "secret_key": "S...",
//     "simulate_only": true|false
//   }
//
// Output (stdout JSON):
//   { "success": true, "result": ..., "tx_hash": "..." }
//   or
//   { "success": false, "error": "..." }

import { Keypair, Contract, TransactionBuilder, Networks, BASE_FEE,
  SorobanDataBuilder, xdr, nativeToScVal, Memo } from '@stellar/stellar-sdk';

/**
 * Fetch with retry — only for retryable errors (network, 5xx).
 * Does NOT retry on 4xx, simulation errors, or contract failures.
 */
async function fetchWithRetry(url, options, maxRetries = 2) {
  const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || !RETRYABLE_STATUSES.includes(res.status)) {
        return res;
      }
      // Status is retryable — throw to trigger retry
      throw new Error(`Retryable status ${res.status}`);
    } catch (e) {
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.error(`  Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${e.message}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e; // No more retries
      }
    }
  }
}

function hexToScVal(hex) {
  const clean = hex.replace('0x', '').padStart(64, '0');
  const bytes = Buffer.from(clean, 'hex');
  return xdr.ScVal.scvBytes(bytes);
}

async function main() {
  let input = '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  input = Buffer.concat(chunks).toString('utf8');
  
  const config = JSON.parse(input);
  const { rpc_url, network_passphrase, contract_id, method, args, secret_key, simulate_only, idempotency_key } = config;

  if (!simulate_only && !secret_key) {
    console.log(JSON.stringify({ success: false, error: 'secret_key is required for non-simulate calls' }));
    process.exit(0);
  }

  const rpcUrl = rpc_url || 'https://soroban-testnet.stellar.org';
  const passphrase = network_passphrase || Networks.TESTNET;

  try {
    const contract = new Contract(contract_id);
    const scvalArgs = (args || []).map(a => {
      if (typeof a === 'string' && a.startsWith('0x')) return hexToScVal(a);
      if (typeof a === 'string' && a.startsWith('C')) {
        // Contract address as ScVal address
        return nativeToScVal(a);
      }
      return nativeToScVal(a);
    });
    
    const op = contract.call(method, ...scvalArgs);

    if (simulate_only) {
      // Build a minimal tx for simulation
      const tx = new TransactionBuilder(
        { sequence: '0', accountId: () => '' },
        { fee: BASE_FEE, networkPassphrase: passphrase }
      )
        .addOperation(op)
        .addMemo(Memo.text('simulate'))
        .setTimeout(30)
        .build();

      const simRes = await fetchWithRetry(`${rpcUrl}/simulateTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: tx.toXDR() }),
      });

      if (!simRes.ok) {
        const errText = await simRes.text().catch(() => '');
        throw new Error(`Simulation failed (${simRes.status}): ${errText}`);
      }

      const simData = await simRes.json();
      if (simData.error) throw new Error(`Simulation error: ${simData.error}`);

      console.log(JSON.stringify({
        success: true,
        result: simData.result || null,
        transactionData: simData.transactionData || null,
        raw: simData,
      }));
      return;
    }

    // Full write call
    const kp = Keypair.fromSecret(secret_key);
    const address = kp.publicKey();

    // Get account sequence
    const accountRes = await fetchWithRetry(`${rpcUrl}/accounts/${encodeURIComponent(address)}`);
    if (!accountRes.ok) throw new Error(`Failed to get account: ${accountRes.statusText}`);
    const { sequence } = await accountRes.json();

    // Build initial tx
    const tx = new TransactionBuilder(
      { sequence, accountId: () => address },
      { fee: BASE_FEE, networkPassphrase: passphrase }
    )
      .addOperation(op)
      .setTimeout(30)
      .build();

    // Simulate
    const simRes = await fetchWithRetry(`${rpcUrl}/simulateTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: tx.toXDR() }),
    });

    if (!simRes.ok) throw new Error(`Simulation failed: ${simRes.statusText}`);
    const simulation = await simRes.json();
    if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);
    if (!simulation.transactionData) throw new Error('Simulation did not return transactionData');

    // Build final tx with soroban data
    const sorobanData = xdr.SorobanTransactionData.fromXDR(simulation.transactionData, 'base64');
    const finalTx = new TransactionBuilder(
      { sequence, accountId: () => address },
      {
        fee: BASE_FEE,
        networkPassphrase: passphrase,
        sorobanData: new SorobanDataBuilder(sorobanData).build(),
      }
    )
      .addOperation(op)
      .setTimeout(30)
      .build();

    // Sign
    const txXDR = finalTx.toXDR();
    const txEnvelope = xdr.TransactionEnvelope.fromXDR(txXDR, 'base64');
    txEnvelope.sign(kp);
    const signedXDR = txEnvelope.toXDR('base64');

    // Compute tx hash for idempotency
    const txHash = txEnvelope.hash().toString('hex');

    // Submit with retry and idempotency key
    const sendBody = { transaction: signedXDR };
    if (idempotency_key || txHash) {
      sendBody.idempotency_key = idempotency_key || txHash;
    }

    const sendRes = await fetchWithRetry(`${rpcUrl}/sendTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) throw new Error(`Submit failed: ${sendRes.statusText}`);
    const sendResult = await sendRes.json();
    const txHashStr = sendResult.hash || txHash || 'unknown';
    let txStatus = sendResult.status;

    // Poll with retry
    if (txStatus === 'PENDING') {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await fetchWithRetry(`${rpcUrl}/getTransaction/${encodeURIComponent(txHashStr)}`);
        if (pollRes.ok) {
          const pollResult = await pollRes.json();
          txStatus = pollResult.status;
          if (txStatus === 'SUCCESS' || txStatus === 'FAILED') break;
        }
      }
    }

    if (txStatus === 'SUCCESS') {
      console.log(JSON.stringify({ success: true, tx_hash: txHashStr, status: 'SUCCESS' }));
    } else {
      console.log(JSON.stringify({ success: false, error: `Transaction ${txHashStr} ended with status: ${txStatus}`, tx_hash: txHashStr }));
    }

  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  }
}

main().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  process.exit(0);
});
