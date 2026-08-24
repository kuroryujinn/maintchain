#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import {
  Keypair, Contract, TransactionBuilder, Networks, BASE_FEE,
  SorobanDataBuilder, xdr, Account, Address,
  authorizeInvocation,
} from '@stellar/stellar-sdk';

const wallets = JSON.parse(readFileSync('scripts/synthetic-users/.tmp/wallets.json', 'utf-8'));
const wallet = wallets.users[0];
const rpcUrl = 'https://soroban-testnet.stellar.org';
const passphrase = Networks.TESTNET;
const contractId = 'CA2CSUN5T4ZJZHQ562XFHB2WVSGE2E7KS4NJ2SBFJM6CLRZIFLJP4EMC';
const kp = Keypair.fromSecret(wallet.secretKey);

function sha256Hex(input) {
  return '0x' + createHash('sha256').update(input).digest('hex');
}

async function rpcRequest(method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

// Get sequence
const ledgerKey = xdr.LedgerKey.account(
  new xdr.LedgerKeyAccount({ accountId: kp.xdrPublicKey() })
);
const ledgerResult = await rpcRequest('getLedgerEntries', { keys: [ledgerKey.toXDR('base64')] });
const sequence = xdr.LedgerEntryData.fromXDR(ledgerResult.entries[0].xdr, 'base64').account().seqNum().toString();
console.log('Account:', wallet.publicKey);
console.log('Sequence:', sequence);

// Build hashes
const org = 'MaintChain Synthetic Testing';
const orgHash = sha256Hex(org);
const profileHash = sha256Hex(JSON.stringify({
  stellar_address: wallet.publicKey, name: wallet.fullName,
  role: 'TECHNICIAN', organization: org,
}));

// Build contract call
const contract = new Contract(contractId);
const scValArgs = [
  new Address(wallet.publicKey).toScVal(),
  xdr.ScVal.scvU32(1),
  xdr.ScVal.scvBytes(Buffer.from(orgHash.replace('0x', ''), 'hex')),
  xdr.ScVal.scvBytes(Buffer.from(profileHash.replace('0x', ''), 'hex')),
];
const op = contract.call('verify_identity', ...scValArgs);

// Build tx for simulation
const tx = new TransactionBuilder(new Account(wallet.publicKey, sequence), {
  fee: BASE_FEE, networkPassphrase: passphrase,
}).addOperation(op).setTimeout(300).build();

// Simulate
const sim = await rpcRequest('simulateTransaction', { transaction: tx.toXDR() });
if (sim.error) { console.error('Sim error:', sim.error); process.exit(1); }

// Build final tx with soroban data
const sorobanData = xdr.SorobanTransactionData.fromXDR(sim.transactionData, 'base64');
const finalTx = new TransactionBuilder(new Account(wallet.publicKey, sequence), {
  fee: BASE_FEE, networkPassphrase: passphrase,
  sorobanData: new SorobanDataBuilder(sorobanData).build(),
}).addOperation(op).setTimeout(300).build();

// Build SorobanAuthorizedInvocation
const authInvocation = new xdr.SorobanAuthorizedInvocation({
  function: new xdr.SorobanAuthorizedFunction(
    xdr.SorobanAuthorizedFunctionType.sorobanAuthorizedFunctionTypeContractFn(),
    new xdr.InvokeContractArgs({
      contractAddress: new Address(contractId).toScAddress(),
      functionName: 'verify_identity',
      args: scValArgs,
    })
  ),
  subInvocations: [],
});

// Use authorizeInvocation to sign the auth entry
const latestLedgerRes = await rpcRequest('getLedgerEntries', { keys: [ledgerKey.toXDR('base64')] });
const currentSeq = Number(sequence);
const validUntilLedger = currentSeq + 100;

const authEntry = authorizeInvocation(
  kp,
  validUntilLedger,
  authInvocation,
  wallet.publicKey,
  passphrase,
);
console.log('Auth entry created');

// Add auth entry to the envelope
const txEnv = xdr.TransactionEnvelope.fromXDR(finalTx.toXDR(), 'base64');
const authEntries = txEnv.v1().auth();
authEntries.push(authEntry);

// Rebuild envelope with auth entries
const newV1 = new xdr.TransactionV1Envelope({
  tx: txEnv.v1().tx(),
  auth: authEntries,
});
const newEnv = xdr.TransactionEnvelope.envelopeTypeTx(newV1);

// Sign
const parsedTx = TransactionBuilder.fromXDR(newEnv.toXDR('base64'), passphrase);
parsedTx.sign(kp);
const signedXDR = parsedTx.toXDR('base64');

// Submit
console.log('\n--- Submit ---');
const sendRes = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: { transaction: signedXDR } }),
});
const sendData = await sendRes.json();
console.log('Status:', sendData.result?.status);
console.log('Hash:', sendData.result?.hash);

if (sendData.result?.status === 'ERROR') {
  console.log('Error resultXdr:', sendData.result?.errorResultXdr);
  try {
    const txResult = xdr.TransactionResult.fromXDR(sendData.result.errorResultXdr, 'base64');
    console.log('Error code:', txResult.result().switch().name);
  } catch {}
}

if (sendData.result?.status === 'PENDING') {
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await rpcRequest('getTransaction', { hash: sendData.result.hash });
    console.log(`Poll ${i + 1}: ${poll.status}`);
    if (poll.status === 'SUCCESS' || poll.status === 'FAILED') {
      if (poll.resultXdr) {
        try {
          const txResult = xdr.TransactionResult.fromXDR(poll.resultXdr, 'base64');
          console.log('Result:', txResult.result().switch().name);
        } catch {}
      }
      break;
    }
  }
}
