// scripts/soroban-invoke.mjs
// Node.js helper script for **simulate-only** Soroban RPC calls.
//
// This script is called by the Rust backend via subprocess.
// It NO LONGER signs or submits transactions — that is done by
// the user's Freighter wallet through the frontend.
//
// Usage:
//   node scripts/soroban-invoke.mjs < command.json
//
// Input (stdin JSON):
//   {
//     "rpc_url": "https://soroban-testnet.stellar.org",
//     "network_passphrase": "Test SDF Network ; September 2015",
//     "contract_id": "C...",
//     "method": "verify",
//     "args": ["0x..."],
//     "simulate_only": true
//   }
//
// Output (stdout JSON):
//   { "success": true, "result": ..., "raw": ... }
//   or
//   { "success": false, "error": "..." }

import { Contract, TransactionBuilder, Networks, BASE_FEE, xdr, nativeToScVal, Account } from '@stellar/stellar-sdk';

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
  const { rpc_url, network_passphrase, contract_id, method, args } = config;

  const rpcUrl = rpc_url || 'https://soroban-testnet.stellar.org';
  const passphrase = network_passphrase || Networks.TESTNET;

  try {
    const contract = new Contract(contract_id);
    const scvalArgs = (args || []).map(a => {
      if (typeof a === 'string' && a.startsWith('0x')) return hexToScVal(a);
      if (typeof a === 'string' && a.startsWith('C')) {
        return nativeToScVal(a);
      }
      return nativeToScVal(a);
    });

    const op = contract.call(method, ...scvalArgs);

    // Build a minimal tx for simulation.
    // TransactionBuilder requires a real Account-like source (it calls
    // source.sequenceNumber()); use a dummy all-zeros account — this is
    // simulate-only, so no real account or signature is needed.
    const tx = new TransactionBuilder(
      new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      { fee: BASE_FEE, networkPassphrase: passphrase }
    )
      .addOperation(op)
      .setTimeout(30)
      .build();

    // Stellar RPC is a single JSON-RPC 2.0 POST endpoint at the base URL.
    // Path-based endpoints (e.g. /simulateTransaction) return 404.
    const simRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: { transaction: tx.toXDR() },
      }),
    });

    if (!simRes.ok) {
      const errText = await simRes.text().catch(() => '');
      throw new Error(`Simulation failed (${simRes.status}): ${errText}`);
    }

    const simData = await simRes.json();
    if (simData.error) throw new Error(`Simulation error: ${simData.error.message || simData.error}`);

    const result = simData.result || {};
    console.log(JSON.stringify({
      success: true,
      result: result.result || null,
      transactionData: result.transactionData || null,
      raw: simData,
    }));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  }
}

main().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  process.exit(0);
});
