// frontend/src/hooks/useTransactionState.ts
// Full transaction lifecycle state machine with retry strategy.

import { useState, useCallback, useRef } from 'react';

// ── State Machine ──

export enum TxState {
  IDLE = 'IDLE',

  // Forward progression
  PREPARING = 'PREPARING',
  SIMULATING = 'SIMULATING',
  WAITING_FOR_SIGNATURE = 'WAITING_FOR_SIGNATURE',
  SUBMITTING = 'SUBMITTING',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DATABASE_SYNC = 'DATABASE_SYNC',
  COMPLETE = 'COMPLETE',

  // Failure states (terminal unless retryable)
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  RPC_ERROR = 'RPC_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CONTRACT_REVERT = 'CONTRACT_REVERT',
  TIMEOUT = 'TIMEOUT',
  DATABASE_SYNC_FAILED = 'DATABASE_SYNC_FAILED',
}

// ── Retry Policies ──

export enum RetryCategory {
  RETRYABLE  = 'RETRYABLE',   // RPC errors, timeouts, network issues
  NON_RETRYABLE = 'NON_RETRYABLE', // Bad signature, insufficient XLM, contract revert
}

const RETRYABLE_STATES = new Set([
  TxState.RPC_ERROR,
  TxState.TIMEOUT,
  TxState.DATABASE_SYNC_FAILED,
]);

export const FAILURE_STATES = new Set([
  TxState.SIMULATION_FAILED,
  TxState.SIGNATURE_REJECTED,
  TxState.RPC_ERROR,
  TxState.INSUFFICIENT_BALANCE,
  TxState.CONTRACT_REVERT,
  TxState.TIMEOUT,
  TxState.DATABASE_SYNC_FAILED,
]);

function getRetryCategory(state: TxState): RetryCategory {
  return RETRYABLE_STATES.has(state) ? RetryCategory.RETRYABLE : RetryCategory.NON_RETRYABLE;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface RetryState {
  count: number;
  lastError: string;
  nextRetryAt: number | null;
}

interface TxStateMachineOptions {
  onStateChange?: (state: TxState, previous: TxState) => void;
  onRetry?: (attempt: number, maxRetries: number) => void;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface TxStateMachine {
  state: TxState;
  previousState: TxState;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isRetryable: boolean;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  transactionHash: string | null;

  // Actions
  transition: (newState: TxState, metadata?: Record<string, string>) => void;
  setError: (state: TxState, error: string) => void;
  retry: () => void;
  reset: () => void;
  setTransactionHash: (hash: string) => void;
}

export function useTransactionState(
  options: TxStateMachineOptions = {}
): TxStateMachine {
  const { maxRetries = MAX_RETRIES, baseDelayMs = BASE_DELAY_MS } = options;
  const [state, setState] = useState<TxState>(TxState.IDLE);
  const [previousState, setPreviousState] = useState<TxState>(TxState.IDLE);
  const [retryState, setRetryState] = useState<RetryState>({
    count: 0,
    lastError: '',
    nextRetryAt: null,
  });
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const transition = useCallback((newState: TxState, metadata?: Record<string, string>) => {
    const prev = stateRef.current;
    setPreviousState(prev);
    setState(newState);

    if (newState === TxState.COMPLETE) {
      setTransactionHash(metadata?.hash || transactionHash);
    }

    // If this is a failure state, update retry tracking
    if (FAILURE_STATES.has(newState)) {
      setRetryState(prevRetry => {
        const nextCount = prevRetry.count + 1;
        return {
          count: nextCount,
          lastError: metadata?.error || 'Unknown error',
          nextRetryAt: RETRYABLE_STATES.has(newState) && nextCount < maxRetries
            ? Date.now() + Math.min(baseDelayMs * Math.pow(2, prevRetry.count), 15000)
            : null,
        };
      });
    }

    options.onStateChange?.(newState, prev);
  }, [options, maxRetries, baseDelayMs, transactionHash]);

  const retry = useCallback(() => {
    // Only retry from retryable states
    if (!RETRYABLE_STATES.has(stateRef.current)) return;
    if (retryState.count >= maxRetries) return;

    // Clear the timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Go back to the state before failure (usually SUBMITTING or PENDING)
    if (stateRef.current === TxState.RPC_ERROR || stateRef.current === TxState.TIMEOUT) {
      setState(TxState.SUBMITTING);
    } else if (stateRef.current === TxState.DATABASE_SYNC_FAILED) {
      setState(TxState.DATABASE_SYNC);
    }
  }, [retryState.count, maxRetries]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState(TxState.IDLE);
    setPreviousState(TxState.IDLE);
    setRetryState({ count: 0, lastError: '', nextRetryAt: null });
    setTransactionHash(null);
  }, []);

  return {
    state,
    previousState,
    isProcessing: state !== TxState.IDLE && state !== TxState.COMPLETE && !FAILURE_STATES.has(state),
    isCompleted: state === TxState.COMPLETE,
    isFailed: FAILURE_STATES.has(state),
    isRetryable: RETRYABLE_STATES.has(state) && retryState.count < maxRetries,
    retryCount: retryState.count,
    maxRetries,
    lastError: retryState.lastError || null,
    transactionHash,
    transition,
    setError: (newState: TxState, error: string) => transition(newState, { error }),
    retry,
    reset,
    setTransactionHash: (hash: string) => setTransactionHash(hash),
  };
}

// ── User-visible messages for each state ──

export const TX_STATE_MESSAGES: Record<TxState, { title: string; description: string; tone: 'info' | 'warning' | 'success' | 'error' | 'neutral' }> = {
  [TxState.IDLE]:                    { title: '', description: '', tone: 'neutral' },
  [TxState.PREPARING]:               { title: 'Preparing transaction', description: 'Building the contract call...', tone: 'info' },
  [TxState.SIMULATING]:              { title: 'Simulating transaction', description: 'Estimating fees and resource usage...', tone: 'info' },
  [TxState.WAITING_FOR_SIGNATURE]:   { title: 'Waiting for signature', description: 'Check your Freighter wallet to sign the transaction', tone: 'info' },
  [TxState.SUBMITTING]:              { title: 'Submitting to network', description: 'Sending transaction to Stellar...', tone: 'info' },
  [TxState.PENDING]:                 { title: 'Waiting for confirmation', description: 'Transaction is pending on the network...', tone: 'info' },
  [TxState.CONFIRMED]:               { title: 'Transaction confirmed', description: 'Blockchain update successful', tone: 'success' },
  [TxState.DATABASE_SYNC]:           { title: 'Syncing to database', description: 'Mirroring on-chain state to database...', tone: 'info' },
  [TxState.COMPLETE]:                { title: 'Complete', description: 'All operations successful', tone: 'success' },
  [TxState.SIMULATION_FAILED]:       { title: 'Simulation failed', description: 'Contract call could not be simulated', tone: 'error' },
  [TxState.SIGNATURE_REJECTED]:      { title: 'Signature rejected', description: 'You rejected the signature in Freighter', tone: 'error' },
  [TxState.RPC_ERROR]:               { title: 'Network error', description: 'Could not reach the Stellar network', tone: 'error' },
  [TxState.INSUFFICIENT_BALANCE]:    { title: 'Insufficient XLM', description: 'Your account needs more XLM for fees', tone: 'error' },
  [TxState.CONTRACT_REVERT]:         { title: 'Contract rejected', description: 'The smart contract rejected the transaction', tone: 'error' },
  [TxState.TIMEOUT]:                 { title: 'Transaction timeout', description: 'Transaction did not confirm in time', tone: 'error' },
  [TxState.DATABASE_SYNC_FAILED]:    { title: 'Database sync failed', description: 'On-chain succeeded but database update failed', tone: 'error' },
};
