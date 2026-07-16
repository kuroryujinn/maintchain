// frontend/src/lib/soroban.ts
// Soroban contract interaction using @stellar/stellar-sdk v13 + Freighter v6
// Builds transactions, simulates via RPC, signs with Freighter, submits to Soroban RPC.

import { signTransaction } from '@stellar/freighter-api';
import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  nativeToScVal,
  SorobanDataBuilder,
  xdr,
  Memo,
} from '@stellar/stellar-sdk';

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface ContractCallResult {
  transactionHash: string;
  status: 'SUCCESS' | 'FAILED';
}

/**
 * Invoke a read-only (simulate) contract call.
 */
export async function simulateContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
) {
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);

  const tx = new TransactionBuilder(
    { sequence: '0', accountId: () => '' } as any,
    { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE },
  )
    .addOperation(op)
    .addMemo(Memo.text('simulate'))
    .setTimeout(30)
    .build();

  const res = await fetch(`${SOROBAN_RPC_URL}/simulateTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });

  if (!res.ok) {
    throw new Error(`Simulation failed (${res.status}): ${await res.text().catch(() => '')}`);
  }

  const simulation = await res.json();
  if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);
  if (!simulation.result?.retval) throw new Error('Simulation returned no result value');

  return simulation.result.retval;
}

/**
 * Invoke a write function on a Soroban contract.
 * Builds tx → simulates for footprint → signs with Freighter → submits to RPC.
 *
 * Simplified approach: uses the simulation's `transactionData` (base64 SorobanTransactionData XDR)
 * to set the correct footprint and resource fees on the final transaction.
 */
export async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
): Promise<ContractCallResult> {
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);

  // 1. Get account sequence from Soroban RPC
  const accountRes = await fetch(
    `${SOROBAN_RPC_URL}/accounts/${encodeURIComponent(sourceAddress)}`,
  );
  if (!accountRes.ok) throw new Error(`Failed to get account: ${accountRes.statusText}`);
  const { sequence } = await accountRes.json();

  // 2. Build initial transaction
  const tx = new TransactionBuilder(
    { sequence, accountId: () => sourceAddress } as any,
    { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE },
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  // 3. Simulate to get footprint + resource fees
  const simRes = await fetch(`${SOROBAN_RPC_URL}/simulateTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });

  if (!simRes.ok) throw new Error(`Simulation failed: ${simRes.statusText}`);
  const simulation = await simRes.json();
  if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);

  // 4. Build final transaction with soroban data from simulation
  const transactionData = simulation.transactionData;
  if (!transactionData) throw new Error('Simulation did not return transactionData');

  // Parse the base64 transactionData XDR into SorobanTransactionData
  const sorobanData = xdr.SorobanTransactionData.fromXDR(transactionData, 'base64');

  const finalTx = new TransactionBuilder(
    { sequence, accountId: () => sourceAddress } as any,
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
      sorobanData: new SorobanDataBuilder(sorobanData).build(),
    },
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  // 5. Sign with Freighter
  const finalTxXdr = finalTx.toXDR();
  const signed = await signTransaction(finalTxXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sourceAddress,
  });

  if (signed.error) throw new Error(`Freighter signing error: ${signed.error.message}`);
  if (!signed.signedTxXdr) throw new Error('Signing failed — no signed XDR returned.');

  // 6. Submit to Soroban RPC
  const sendRes = await fetch(`${SOROBAN_RPC_URL}/sendTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signed.signedTxXdr }),
  });

  if (!sendRes.ok) throw new Error(`Submit failed: ${sendRes.statusText}`);

  const sendResult = await sendRes.json();
  const txHash: string = sendResult.hash || 'unknown';
  let txStatus = sendResult.status;

  // 7. Poll for completion
  if (txStatus === 'PENDING') {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(
        `${SOROBAN_RPC_URL}/getTransaction/${encodeURIComponent(txHash)}`,
      );
      if (pollRes.ok) {
        const pollResult = await pollRes.json();
        txStatus = pollResult.status;
        if (txStatus === 'SUCCESS' || txStatus === 'FAILED') break;
      }
    }
  }

  return { transactionHash: txHash, status: txStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED' };
}

/**
 * Convert JS values to Soroban ScVal for contract calls.
 */
export function toScVal(value: string | number | boolean): xdr.ScVal {
  return nativeToScVal(value);
}

/**
 * Build a Bytes ScVal from a hex string (with or without 0x prefix).
 * Uses Uint8Array for browser compatibility (no Buffer dependency).
 */
export function bytes32ScVal(hex: string): xdr.ScVal {
  const cleanHex = hex.replace('0x', '').padStart(64, '0');
  // Buffer.from is safe in Next.js (webpack polyfills Buffer in browser)
  const bytes = Buffer.from(cleanHex, 'hex');
  return xdr.ScVal.scvBytes(bytes);
}
