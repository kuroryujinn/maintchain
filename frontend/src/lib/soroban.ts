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
  Address,
} from '@stellar/stellar-sdk';

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface ContractCallResult {
  transactionHash: string;
  /** Always 'SUCCESS' — invokeContract throws on failure */
  status: 'SUCCESS';
}

/**
 * Transaction status reported during contract invocation.
 * Threaded through invokeContract → callContract → pages for visible UI feedback.
 */
export type TxStatus =
  | { state: 'simulating' }
  | { state: 'awaiting_signature' }
  | { state: 'submitting' }
  | { state: 'pending'; attempt: number; maxAttempts: number }
  | { state: 'success'; hash: string }
  | { state: 'timeout'; hash: string }
  | { state: 'failed'; reason: string };

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
  onStatusChange?: (status: TxStatus) => void,
): Promise<ContractCallResult> {
  const errorCtx = `invokeContract(${contractId.slice(0, 8)}…, ${method})`;
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);

  // 1. Get account sequence from Soroban RPC
  // 1. Get account sequence from Soroban RPC
  onStatusChange?.({ state: 'simulating' });
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
  onStatusChange?.({ state: 'simulating' });
  const simRes = await fetch(`${SOROBAN_RPC_URL}/simulateTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });

  if (!simRes.ok) {
    onStatusChange?.({ state: 'failed', reason: `Simulation failed: ${simRes.statusText}` });
    throw new Error(`Simulation failed: ${simRes.statusText}`);
  }
  const simulation = await simRes.json();
  if (simulation.error) {
    onStatusChange?.({ state: 'failed', reason: `Simulation error: ${simulation.error}` });
    throw new Error(`Simulation error: ${simulation.error}`);
  }

  // 4. Build final transaction with soroban data from simulation
  const transactionData = simulation.transactionData;
  if (!transactionData) {
    onStatusChange?.({ state: 'failed', reason: 'Simulation did not return transactionData' });
    throw new Error('Simulation did not return transactionData');
  }

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
  onStatusChange?.({ state: 'awaiting_signature' });
  const finalTxXdr = finalTx.toXDR();
  const signed = await signTransaction(finalTxXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sourceAddress,
  });

  if (signed.error) {
    onStatusChange?.({ state: 'failed', reason: `Freighter signing error: ${signed.error.message}` });
    throw new Error(`Freighter signing error: ${signed.error.message}`);
  }
  if (!signed.signedTxXdr) {
    onStatusChange?.({ state: 'failed', reason: 'Signing failed — no signed XDR returned.' });
    throw new Error('Signing failed — no signed XDR returned.');
  }

  // 6. Submit to Soroban RPC
  onStatusChange?.({ state: 'submitting' });
  const sendRes = await fetch(`${SOROBAN_RPC_URL}/sendTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signed.signedTxXdr }),
  });

  if (!sendRes.ok) {
    onStatusChange?.({ state: 'failed', reason: `Submit failed: ${sendRes.statusText}` });
    throw new Error(`Submit failed: ${sendRes.statusText}`);
  }

  const sendResult = await sendRes.json();
  const txHash: string = sendResult.hash || 'unknown';
  let txStatus = sendResult.status;

  // 7. Poll for completion with per-attempt status callbacks
  const MAX_POLL_ATTEMPTS = 15;
  let pollResult: any = null;
  if (txStatus === 'PENDING') {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      onStatusChange?.({ state: 'pending', attempt: i + 1, maxAttempts: MAX_POLL_ATTEMPTS });
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(
        `${SOROBAN_RPC_URL}/getTransaction/${encodeURIComponent(txHash)}`,
      );
      if (pollRes.ok) {
        pollResult = await pollRes.json();
        txStatus = pollResult.status;
        if (txStatus === 'SUCCESS' || txStatus === 'FAILED') break;
      }
    }
  }

  // Handle timeout (all attempts exhausted, still PENDING)
  if (txStatus === 'PENDING') {
    onStatusChange?.({ state: 'timeout', hash: txHash });
    let errorMsg = `${errorCtx}: Soroban transaction TIMEOUT after ${MAX_POLL_ATTEMPTS}s`;
    errorMsg += ' (no resultXdr — polling timed out)';
    const timeoutError = new Error(errorMsg) as Error & { isTxTimeout?: boolean };
    timeoutError.isTxTimeout = true;
    throw timeoutError;
  }

  // Surface full Soroban error details for diagnostics
  if (txStatus === 'FAILED') {
    let errorMsg = `${errorCtx}: Soroban transaction FAILED`;
    if (pollResult?.resultXdr) {
      try {
        const txResult = xdr.TransactionResult.fromXDR(pollResult.resultXdr, 'base64');
        errorMsg += ` (code: ${txResult.result().switch()})`;
      } catch {
        errorMsg += ` (raw resultXdr: ${pollResult.resultXdr.slice(0, 60)}…)`;
      }
    } else {
      errorMsg += ' (no resultXdr — maybe the polling timed out)';
    }
    onStatusChange?.({ state: 'failed', reason: errorMsg });
    throw new Error(errorMsg);
  }

  onStatusChange?.({ state: 'success', hash: txHash });
  return { transactionHash: txHash, status: 'SUCCESS' };
}

/**
 * Poll a single transaction's status from Soroban RPC.
 * Used by the "Check again" button after a timeout — re-polls the existing
 * hash once instead of restarting the full simulate/sign/submit loop.
 */
export async function pollTransactionStatus(
  txHash: string,
): Promise<'SUCCESS' | 'FAILED' | 'PENDING'> {
  const res = await fetch(
    `${SOROBAN_RPC_URL}/getTransaction/${encodeURIComponent(txHash)}`,
  );
  if (!res.ok) return 'PENDING';
  const data = await res.json();
  return (data?.status ?? 'PENDING') as 'SUCCESS' | 'FAILED' | 'PENDING';
}

/**
 * Convert JS values to Soroban ScVal for contract calls.
 * Handles Stellar addresses (G... / C...) properly by creating Address ScVals.
 */
export function toScVal(value: string | number | boolean): xdr.ScVal {
  // Detect Stellar addresses (G... for accounts, C... for contracts)
  if (typeof value === 'string') {
    if ((value.startsWith('G') && value.length === 56) ||
        (value.startsWith('C') && value.length === 56)) {
      return new Address(value).toScVal();
    }
  }
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

/**
 * Convert a string to a Soroban BytesN<32> hex value.
 * Pads the UTF-8 encoded string to 32 bytes, then returns as a 0x-prefixed hex string.
 * Used for passing maintenance IDs and other string identifiers to Soroban contracts.
 */
export function toBytesN32(str: string): string {
  return '0x' + Array.from(new TextEncoder().encode(str.padEnd(32, '\0')))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create an explicit u32 ScVal for passing to Soroban contracts that expect `u32`.
 * nativeToScVal(number) maps small integers to i32, which causes type mismatch
 * errors on Soroban contracts expecting u32 parameters.
 */
export function u32ScVal(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}
