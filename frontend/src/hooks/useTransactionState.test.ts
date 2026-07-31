// frontend/src/hooks/useTransactionState.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTransactionState, TxState } from './useTransactionState';

// RTL auto-cleanup only registers when `afterEach` is globally available, and
// this Vitest setup runs without globals — unmount explicitly between tests.
afterEach(() => cleanup());

describe('useTransactionState', () => {
  it('stores the transaction hash when transitioning to COMPLETE', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.transition(TxState.COMPLETE, { hash: 'tx-complete' });
    });

    expect(result.current.transactionHash).toBe('tx-complete');
    expect(result.current.isCompleted).toBe(true);
  });

  it('stores the transaction hash when transitioning to CONFIRMED', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.transition(TxState.CONFIRMED, { hash: 'tx-confirmed' });
    });

    expect(result.current.transactionHash).toBe('tx-confirmed');
    expect(result.current.state).toBe(TxState.CONFIRMED);
    // CONFIRMED means on-chain confirmed but the DB mirror is still pending.
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isProcessing).toBe(true);
  });

  it('stores the transaction hash on TIMEOUT (with lastError)', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.setError(TxState.TIMEOUT, 'did not confirm in time', { hash: 'tx-timeout' });
    });

    expect(result.current.transactionHash).toBe('tx-timeout');
    expect(result.current.lastError).toBe('did not confirm in time');
    expect(result.current.state).toBe(TxState.TIMEOUT);
  });

  it('stores the transaction hash on DATABASE_SYNC_FAILED', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.setError(TxState.DATABASE_SYNC_FAILED, 'mirror failed', { hash: 'tx-dbsync' });
    });

    expect(result.current.transactionHash).toBe('tx-dbsync');
    expect(result.current.isFailed).toBe(true);
  });

  it('clears lastError, hash, and derived state on reset()', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.setError(TxState.RPC_ERROR, 'boom');
    });
    expect(result.current.lastError).toBe('boom');
    expect(result.current.transactionHash).toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe(TxState.IDLE);
    expect(result.current.lastError).toBeNull();
    expect(result.current.transactionHash).toBeNull();
    expect(result.current.isFailed).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('toggles isRechecking via the recheck metadata flag', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      result.current.transition(TxState.PENDING, { recheck: '1' });
    });
    expect(result.current.isRechecking).toBe(true);

    // A PENDING transition without the recheck marker clears the flag,
    // and poll progress metadata is surfaced.
    act(() => {
      result.current.transition(TxState.PENDING, { pollAttempt: '3', maxPollAttempts: '15' });
    });
    expect(result.current.isRechecking).toBe(false);
    expect(result.current.pollAttempt).toBe(3);
    expect(result.current.maxPollAttempts).toBe(15);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isRechecking).toBe(false);
  });
});
