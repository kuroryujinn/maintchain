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

import { Contract, TransactionBuilder, Networks, BASE_FEE, xdr, nativeToScVal, Memo } from '@stellar/stellar-sdk';

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

    // Build a minimal tx for simulation
    const tx = new TransactionBuilder(
      { sequence: '0', accountId: () => '' },
      { fee: BASE_FEE, networkPassphrase: passphrase }
    )
      .addOperation(op)
      .addMemo(Memo.text('simulate'))
      .setTimeout(30)
      .build();

    const simRes = await fetch(`${rpcUrl}/simulateTransaction`, {
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
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  }
}

main().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message || String(e) }));
  process.exit(0);
});
