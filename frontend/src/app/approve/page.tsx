'use client';
import { useState, useEffect, useRef } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import type { MaintenanceResponse } from '@/lib/api-types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toBytesN32, pollTransactionStatus } from '@/lib/soroban';
import { handleContractStatus } from '@/lib/tx-status-handler';
import { useTransactionState, TxState, FAILURE_STATES } from '@/hooks/useTransactionState';
import { TransactionProgress } from '@/components/maintchain/TransactionProgress';
import { addTxLogEvent } from '@/lib/transaction-logger';

const MULTI_PARTY_APPROVAL_ID = process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID || '';

export default function ApprovalCenter() {
  const { isConnected, callContract, address } = useSoroban();

  const [records, setRecords] = useState<MaintenanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Remembers which record's transaction timed out so "Check again" can
  // resume the backend DB mirror if the on-chain tx actually succeeded.
  const timeoutContextRef = useRef<{ id: string; action: 'approve' | 'reject' } | null>(null);

  const txStateMachine = useTransactionState({
    onStateChange: (newState) => {
      if (newState === TxState.COMPLETE || FAILURE_STATES.has(newState)) {
        addTxLogEvent({
          walletAddress: address || '',
          contractId: MULTI_PARTY_APPROVAL_ID,
          method: processingAction === 'approve' ? 'approve_by_supervisor' : 'reject_by_supervisor',
          state: newState,
          transactionHash: txStateMachine.transactionHash || undefined,
        });
      }
    },
  });

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    api.listPendingApprovals()
      .then(setRecords)
      .catch((err) => {
        console.error('Failed to load pending approvals:', err);
      })
      .finally(() => setLoading(false));
  }, [isConnected]);

  /**
   * Re-polls an already-submitted transaction after a timeout. This is the
   * Phase 1 "Check again" recovery — it re-runs the poll loop against the
   * existing hash instead of restarting the full simulate/sign/submit flow.
   */
  const handleCheckAgain = async (hash: string) => {
    txStateMachine.transition(TxState.PENDING, {
      pollAttempt: String(txStateMachine.maxPollAttempts ?? 15),
      maxPollAttempts: String(txStateMachine.maxPollAttempts ?? 15),
      recheck: '1',
    });
    try {
      const status = await pollTransactionStatus(hash);
      if (status === 'SUCCESS') {
        txStateMachine.transition(TxState.CONFIRMED, { hash });

        // Resume the backend DB mirror that was interrupted by the timeout.
        const ctx = timeoutContextRef.current;
        timeoutContextRef.current = null;
        if (ctx) {
          txStateMachine.transition(TxState.DATABASE_SYNC);
          try {
            const result = ctx.action === 'approve'
              ? await api.supervisorApprove(ctx.id, {
                  decision_note: 'Approved via MaintChain approval center',
                })
              : await api.supervisorReject(ctx.id, {
                  decision_note: 'Rejected: requires additional evidence',
                });
            txStateMachine.transition(TxState.COMPLETE, { hash });
            setTxHash(`Record ${ctx.id} → Status: ${result.status} | On-chain: ${hash.slice(0, 12)}...`);
            setRecords(prev => prev.filter(r => r.maintenance_id !== ctx.id));
          } catch (e) {
            txStateMachine.setError(
              TxState.DATABASE_SYNC_FAILED,
              `On-chain confirmed but the database mirror failed: ${String(e)}`,
              { hash },
            );
          }
        } else {
          txStateMachine.transition(TxState.COMPLETE, { hash });
          setTxHash(`On-chain approval confirmed (re-checked) | Tx: ${hash.slice(0, 12)}...`);
        }
      } else if (status === 'FAILED') {
        txStateMachine.setError(
          TxState.RPC_ERROR,
          `Transaction failed on-chain. Check the explorer for details (hash: ${hash.slice(0, 12)}...).`,
          { hash },
        );
        setError('On-chain transaction failed');
      } else {
        txStateMachine.setError(
          TxState.TIMEOUT,
          `Still pending after re-check. Testnet can be slow — check the explorer link above. Hash: ${hash.slice(0, 12)}...`,
          { hash },
        );
      }
    } catch {
      txStateMachine.setError(
        TxState.TIMEOUT,
        `Couldn't reach Testnet to check status — try again shortly.`,
        { hash },
      );
    }
  };

  const handleApprove = async (id: string) => {
    setTxHash(null);
    setError(null);
    setProcessingId(id);
    setProcessingAction('approve');
    timeoutContextRef.current = null;

    try {
      // Validate on-chain configuration is available
      if (!MULTI_PARTY_APPROVAL_ID) {
        throw new Error('Contract ID not configured (NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID) — on-chain approval required');
      }

      txStateMachine.reset();
      txStateMachine.transition(TxState.SIMULATING);

      // BLOCKCHAIN-FIRST: Approve on-chain via Soroban BEFORE backend/DB write.
      // On-chain failure blocks the entire operation.
      if (isConnected && address) {
        const idBytes32 = toBytesN32(id);
        const decisionHex = '0x0000000000000000000000000000000000000000000000000000000000000001';

        txStateMachine.transition(TxState.WAITING_FOR_SIGNATURE);

        const txResult = await callContract(
          MULTI_PARTY_APPROVAL_ID,
          'approve_by_supervisor',
          [idBytes32, decisionHex, address],
          {
            onStatusChange: (status) => {
              handleContractStatus(status, txStateMachine, {
                onTimeout: () => {
                  timeoutContextRef.current = { id, action: 'approve' };
                },
              });
            },
          }
        );
        const onChainTx = txResult.transactionHash;

        txStateMachine.transition(TxState.CONFIRMED, { hash: onChainTx });

        // On-chain succeeded — now record in backend (DB mirror)
        txStateMachine.transition(TxState.DATABASE_SYNC);

        const result = await api.supervisorApprove(id, {
          decision_note: 'Approved via MaintChain approval center',
        });

        txStateMachine.transition(TxState.COMPLETE, { hash: onChainTx });
        setTxHash(`Record ${id} → Status: ${result.status} | On-chain: ${onChainTx.slice(0, 12)}...`);
        setRecords(prev => prev.filter(r => r.maintenance_id !== id));
      }
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      // Timeout already surfaced a dedicated TIMEOUT state via onStatusChange —
      // don't downgrade it to a generic RPC error or show the red failure banner.
      const isTimeout = (e as { isTxTimeout?: boolean })?.isTxTimeout === true;
      if (!isTimeout) {
        txStateMachine.setError(TxState.RPC_ERROR, message);
        setError(message);
      }
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    setTxHash(null);
    setError(null);
    setProcessingId(id);
    setProcessingAction('reject');
    timeoutContextRef.current = null;

    try {
      // Validate on-chain configuration is available
      if (!MULTI_PARTY_APPROVAL_ID) {
        throw new Error('Contract ID not configured (NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID) — on-chain rejection required');
      }

      txStateMachine.reset();
      txStateMachine.transition(TxState.SIMULATING);

      // BLOCKCHAIN-FIRST: Reject on-chain via Soroban BEFORE backend/DB write.
      if (isConnected && address) {
        const idBytes32 = toBytesN32(id);

        txStateMachine.transition(TxState.WAITING_FOR_SIGNATURE);

        const txResult = await callContract(
          MULTI_PARTY_APPROVAL_ID,
          'reject_by_supervisor',
          [idBytes32, address],
          {
            onStatusChange: (status) => {
              handleContractStatus(status, txStateMachine, {
                onTimeout: () => {
                  timeoutContextRef.current = { id, action: 'reject' };
                },
              });
            },
          }
        );
        const onChainTx = txResult.transactionHash;

        txStateMachine.transition(TxState.CONFIRMED, { hash: onChainTx });

        // On-chain succeeded — now record in backend (DB mirror)
        txStateMachine.transition(TxState.DATABASE_SYNC);

        const result = await api.supervisorReject(id, {
          decision_note: 'Rejected: requires additional evidence',
        });

        txStateMachine.transition(TxState.COMPLETE, { hash: onChainTx });
        setTxHash(`Record ${id} → Status: ${result.status} | On-chain: ${onChainTx.slice(0, 12)}...`);
        setRecords(prev => prev.filter(r => r.maintenance_id !== id));
      }
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      const isTimeout = (e as { isTxTimeout?: boolean })?.isTxTimeout === true;
      if (!isTimeout) {
        txStateMachine.setError(TxState.RPC_ERROR, message);
        setError(message);
      }
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Supervisor approval center"
        caption="Approve · On-chain approval via Soroban, then mirrored to backend database."
        action={<StatusBadge tone={isConnected ? 'verified' : 'pending'}>{isConnected ? 'Ready for approvals' : 'Connect wallet first'}</StatusBadge>}
      />

      <WalletConnectPanel />

      {isConnected && (
        <div className="space-y-4">
          {/* Transaction progress indicator */}
          {txStateMachine.state !== TxState.IDLE && (
            <TransactionProgress
              stateMachine={txStateMachine}
              explorerUrl="https://stellar.expert/explorer/testnet"
              onDismiss={txStateMachine.reset}
              onCheckAgain={handleCheckAgain}
            />
          )}

          {(error || txHash) && (
            <div
              className="glass px-4 py-3 text-sm motion-safe:animate-[fadeSlideUp_0.3s_ease-out]"
              style={{
                borderColor: txHash ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)',
                color: txHash ? '#166534' : '#991b1b'
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                {txHash ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {txHash ? 'On-chain approval confirmed' : 'On-chain approval failed'}
              </div>
              <div className="mt-1 font-mono text-xs">{txHash ?? error}</div>
            </div>
          )}

          {loading ? (
            <FadeInView className="glass p-12 text-center" direction="up" distance="sm" duration={400}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent mx-auto" />
              <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading pending approvals...</p>
            </FadeInView>
          ) : records.length === 0 ? (
            <FadeInView className="glass p-12 text-center" direction="up" distance="sm" duration={400}>
              <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--success)]" />
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">All caught up</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                No records pending your approval right now.
              </p>
            </FadeInView>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {records.map((record, i) => (
                  <FadeInView key={record.maintenance_id} className="glass p-6 flex justify-between items-center" direction="up" distance="sm" duration={400} delay={i * 80}>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">Record #{record.maintenance_id}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Technician: {record.technician_id} | Equipment: {record.equipment_id}
                      </p>
                      <p className="text-xs text-[var(--primary)] font-mono mt-1">
                        Hash: {record.evidence_hash.slice(0, 20)}...
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Created: {new Date(record.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(record.maintenance_id)}
                        disabled={processingId === record.maintenance_id}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {processingId === record.maintenance_id && processingAction === 'approve' ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Signing...
                          </span>
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(record.maintenance_id)}
                        disabled={processingId === record.maintenance_id}
                        className="rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingId === record.maintenance_id && processingAction === 'reject' ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Signing...
                          </span>
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  </FadeInView>
                ))}
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Approval flow">On-chain Soroban call first, then backend DB mirror</DetailPanel>
            <DetailPanel glass label="Proof context">Hashes and worker context stay attached to each record.</DetailPanel>
            <DetailPanel glass label="API integration">Records are processed by the backend at port 8081.</DetailPanel>
          </div>
        </div>
      )}
    </div>
  );
}
