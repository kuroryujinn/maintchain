#!/usr/bin/env node
// scripts/synthetic-users/preflight-contract.mjs
// Simulates a read-only is_verified(GAAAA...) call to confirm the
// IdentityRegistry contract is deployed and responding on-chain.
//
// Usage:
//   node preflight-contract.mjs <contract_id> <rpc_url> <network_passphrase>
//
// Exits 0 if reachable, 1 if not.

import { Contract, Address, xdr, Networks, TransactionBuilder, Account, BASE_FEE } from '@stellar/stellar-sdk';

const [contractId, rpcUrl, networkPassphrase] = process.argv.slice(2);

if (!contractId || !rpcUrl || !networkPassphrase) {
  console.error('Usage: node preflight-contract.mjs <contract_id> <rpc_url> <network_passphrase>');
  process.exit(1);
}

const dummyAddr = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

try {
  const contract = new Contract(contractId);
  const op = contract.call('is_verified', new Address(dummyAddr).toScVal());

  const tx = new TransactionBuilder(
    new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
    { fee: BASE_FEE, networkPassphrase },
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: { transaction: tx.toXDR() },
    }),
  });

  const data = await res.json();

  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message ?? JSON.stringify(data.error);
    throw new Error(msg);
  }

  const result = data.result;
  if (result.error) throw new Error(result.error);

  const entry = result.results?.[0];
  if (!entry?.xdr) throw new Error('simulation returned no result');

  const scv = xdr.ScVal.fromXDR(entry.xdr, 'base64');
  const isBool = scv.switch().name === 'scvBool';

  if (isBool) {
    process.stdout.write('PASS');
    process.exit(0);
  } else {
    process.stdout.write(`WARN (unexpected return type: ${scv.switch().name})`);
    process.exit(0); // Contract responded, just unexpected type
  }
} catch (err) {
  process.stderr.write(err.message);
  process.exit(1);
}
