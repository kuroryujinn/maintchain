// frontend/src/lib/tx-status-handler.ts
// Maps Soroban invokeContract status callbacks onto the transaction state
// machine. Shared by the approve / upload / audit pages so on-chain failure
// handling has exactly ONE shape across all of them — see the regression test
// in tx-status-handler.test.ts for why the 'failed' case is a no-op.

import { TxState, type TxStateMachine } from '@/hooks/useTransactionState';
import type { TxStatus } from '@/lib/soroban';

interface HandleContractStatusOptions {
  /**
   * Called when the submitted transaction times out (still PENDING after all
   * poll attempts), with the submitted tx hash. Pages use this to remember the
   * interrupted operation so the "Check again" recovery can resume the
   * backend DB mirror on success.
   */
  onTimeout: (hash: string) => void;
}

/**
 * Handle a single status callback from invokeContract.
 *
 * IMPORTANT — 'failed' is deliberately a no-op: invokeContract ALWAYS throws
 * on FAILED status, so the caller's catch block is the ONLY place the terminal
 * failure transition (RPC_ERROR) should fire. The pages previously reacted to
 * 'failed' here AND in their catch block, which fired the failure transition
 * twice for one failure and double-incremented retryCount.
 *
 * 'timeout' is different: the timeout error is flagged `isTxTimeout` and the
 * page catch deliberately skips it, so the TIMEOUT transition must fire here.
 */
export function handleContractStatus(
  status: TxStatus,
  sm: Pick<TxStateMachine, 'transition' | 'setError'>,
  options: HandleContractStatusOptions,
): void {
  switch (status.state) {
    case 'simulating':
      sm.transition(TxState.SIMULATING);
      break;
    case 'awaiting_signature':
      sm.transition(TxState.WAITING_FOR_SIGNATURE);
      break;
    case 'submitting':
      sm.transition(TxState.SUBMITTING);
      break;
    case 'pending':
      sm.transition(TxState.PENDING, {
        pollAttempt: String(status.attempt),
        maxPollAttempts: String(status.maxAttempts),
      });
      break;
    case 'timeout':
      options.onTimeout(status.hash);
      sm.setError(
        TxState.TIMEOUT,
        `Transaction submitted but not yet confirmed. Hash: ${status.hash}`,
        { hash: status.hash },
      );
      break;
    case 'failed':
      // No-op — the catch block owns this transition (see doc comment above).
      break;
  }
}
