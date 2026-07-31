// frontend/src/hooks/useTransactionState.ts
// Full transaction lifecycle state machine.

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

export const FAILURE_STATES = new Set([
  TxState.SIMULATION_FAILED,
  TxState.SIGNATURE_REJECTED,
  TxState.RPC_ERROR,
  TxState.INSUFFICIENT_BALANCE,
  TxState.CONTRACT_REVERT,
  TxState.TIMEOUT,
  TxState.DATABASE_SYNC_FAILED,
]);

interface RetryState {
  count: number;
  lastError: string;
}

interface TxStateMachineOptions {
  onStateChange?: (state: TxState, previous: TxState) => void;
}

export interface TxStateMachine {
  state: TxState;
  previousState: TxState;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  retryCount: number;
  lastError: string | null;
  transactionHash: string | null;
  pollAttempt: number | null;
  maxPollAttempts: number | null;
  /** True while the manual "Check again" re-poll is running */
  isRechecking: boolean;

  // Actions
  transition: (newState: TxState, metadata?: Record<string, string>) => void;
  setError: (state: TxState, error: string, metadata?: Record<string, string>) => void;
  reset: () => void;
}

export function useTransactionState(
  options: TxStateMachineOptions = {}
): TxStateMachine {
  const [state, setState] = useState<TxState>(TxState.IDLE);
  const [previousState, setPreviousState] = useState<TxState>(TxState.IDLE);
  const [retryState, setRetryState] = useState<RetryState>({
    count: 0,
    lastError: '',
  });
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState<number | null>(null);
  const [maxPollAttempts, setMaxPollAttempts] = useState<number | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const transition = useCallback((newState: TxState, metadata?: Record<string, string>) => {
    const prev = stateRef.current;
    setPreviousState(prev);
    setState(newState);

    // Persist the tx hash for CONFIRMED/COMPLETE so the explorer link can render.
    // TIMEOUT also carries a hash (submitted but unconfirmed) so testers can
    // look it up on Stellar Expert and use "Check again". DATABASE_SYNC_FAILED
    // carries the same hash (on-chain succeeded, mirror failed) so the link
    // renders regardless of transition ordering.
    if (
      newState === TxState.COMPLETE ||
      newState === TxState.CONFIRMED ||
      newState === TxState.TIMEOUT ||
      newState === TxState.DATABASE_SYNC_FAILED
    ) {
      setTransactionHash(metadata?.hash || transactionHash);
    }

    // Surface the RPC poll progress ("Confirming on-chain — attempt 4/15").
    if (metadata?.pollAttempt !== undefined) {
      setPollAttempt(Number(metadata.pollAttempt));
    }
    if (metadata?.maxPollAttempts !== undefined) {
      setMaxPollAttempts(Number(metadata.maxPollAttempts));
    }
    // Clear the re-check flag whenever a fresh poll transition arrives without
    // the recheck marker, so stale state never shows the wrong label.
    setIsRechecking(metadata?.recheck === '1');

    // If this is a failure state, update retry tracking
    if (FAILURE_STATES.has(newState)) {
      setRetryState(prevRetry => ({
        count: prevRetry.count + 1,
        lastError: metadata?.error || 'Unknown error',
      }));
    }

    options.onStateChange?.(newState, prev);
  }, [options, transactionHash]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState(TxState.IDLE);
    setPreviousState(TxState.IDLE);
    setRetryState({ count: 0, lastError: '' });
    setTransactionHash(null);
    setPollAttempt(null);
    setMaxPollAttempts(null);
    setIsRechecking(false);
  }, []);

  return {
    state,
    previousState,
    isProcessing: state !== TxState.IDLE && state !== TxState.COMPLETE && !FAILURE_STATES.has(state),
    isCompleted: state === TxState.COMPLETE,
    isFailed: FAILURE_STATES.has(state),
    retryCount: retryState.count,
    lastError: retryState.lastError || null,
    transactionHash,
    pollAttempt,
    maxPollAttempts,
    isRechecking,
    transition,
    setError: (newState: TxState, error: string, metadata?: Record<string, string>) =>
      transition(newState, { error, ...metadata }),
    reset,
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
