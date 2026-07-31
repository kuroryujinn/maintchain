// frontend/src/lib/tx-status-handler.test.ts
// Regression tests for handleContractStatus.
//
// Bug class under test: invokeContract always THROWS on FAILED status, so a
// page that fired the terminal RPC_ERROR transition both in onStatusChange
// (on 'failed') AND in its catch block incremented retryCount TWICE for a
// single failure. The helper makes the catch block the only source of that
// transition, which this test proves.

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTransactionState, TxState } from '@/hooks/useTransactionState';
import { handleContractStatus } from './tx-status-handler';

// RTL auto-cleanup only registers when `afterEach` is globally available, and
// this Vitest setup runs without globals — unmount explicitly between tests.
afterEach(() => cleanup());

describe('handleContractStatus', () => {
  it('treats the failed status as a no-op — the catch block owns the failure transition', () => {
    const { result } = renderHook(() => useTransactionState());

    // invokeContract calls onStatusChange({ state: 'failed', ... }) and then
    // throws. The helper must NOT transition here.
    act(() => {
      handleContractStatus({ state: 'failed', reason: 'Soroban transaction FAILED' }, result.current, {
        onTimeout: () => {},
      });
    });

    expect(result.current.state).toBe(TxState.IDLE);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isFailed).toBe(false);
  });

  it('fires the RPC_ERROR failure transition exactly once for one failed call', () => {
    const { result } = renderHook(() => useTransactionState());

    // Reproduce the page contract for one failed on-chain call:
    //  1. onStatusChange reports 'failed' → helper runs (no-op)
    //  2. invokeContract throws → the page catch block fires setError(RPC_ERROR)
    //     exactly once
    act(() => {
      handleContractStatus({ state: 'failed', reason: 'Simulation failed' }, result.current, {
        onTimeout: () => {},
      });
    });
    act(() => {
      result.current.setError(
        TxState.RPC_ERROR,
        'invokeContract(C…, approve_by_supervisor): Soroban transaction FAILED',
      );
    });

    expect(result.current.state).toBe(TxState.RPC_ERROR);
    expect(result.current.isFailed).toBe(true);
    // ← The regression: retryCount must be 1. Before the fix, the 'failed'
    //   branch ALSO called setError, making this 2.
    expect(result.current.retryCount).toBe(1);
    expect(result.current.lastError).toContain('Soroban transaction FAILED');
  });

  it('maps pending status to PENDING with poll progress metadata', () => {
    const { result } = renderHook(() => useTransactionState());

    act(() => {
      handleContractStatus({ state: 'pending', attempt: 3, maxAttempts: 15 }, result.current, {
        onTimeout: () => {},
      });
    });

    expect(result.current.state).toBe(TxState.PENDING);
    expect(result.current.pollAttempt).toBe(3);
    expect(result.current.maxPollAttempts).toBe(15);
    expect(result.current.isRechecking).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('enters TIMEOUT with the tx hash and invokes onTimeout', () => {
    const { result } = renderHook(() => useTransactionState());
    let timedOutHash: string | null = null;

    act(() => {
      handleContractStatus({ state: 'timeout', hash: 'tx-abc123' }, result.current, {
        onTimeout: (hash) => {
          timedOutHash = hash;
        },
      });
    });

    expect(timedOutHash).toBe('tx-abc123');
    expect(result.current.state).toBe(TxState.TIMEOUT);
    expect(result.current.transactionHash).toBe('tx-abc123');
    expect(result.current.retryCount).toBe(1);
    expect(result.current.lastError).toContain('tx-abc123');
  });
});
