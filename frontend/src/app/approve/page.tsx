'use client';
import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import type { MaintenanceResponse } from '@/lib/api-types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toBytesN32 } from '@/lib/soroban';

const MULTI_PARTY_APPROVAL_ID = process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID || '';

export default function ApprovalCenter() {
  const { isConnected, callContract, address } = useSoroban();

  const [records, setRecords] = useState<MaintenanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    api.listPendingApprovals()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isConnected]);

  const handleApprove = async (id: string) => {
    setTxHash(null);
    setError(null);
    setProcessingId(id);
    setProcessingAction('approve');

    try {
      // Validate on-chain configuration is available
      if (!MULTI_PARTY_APPROVAL_ID) {
        throw new Error('Contract ID not configured (NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID) — on-chain approval required');
      }

      // BLOCKCHAIN-FIRST: Approve on-chain via Soroban BEFORE backend/DB write.
      // On-chain failure blocks the entire operation.
      if (isConnected && address) {
        const idBytes32 = toBytesN32(id);
        const decisionHex = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const txResult = await callContract(
          MULTI_PARTY_APPROVAL_ID,
          'approve_by_supervisor',
          [idBytes32, decisionHex]
        );
        const onChainTx = txResult.transactionHash;

        // On-chain succeeded — now record in backend (DB mirror)
        const result = await api.supervisorApprove(id, {
          decision_note: 'Approved via MaintChain approval center',
        });

        setTxHash(`Record ${id} → Status: ${result.status} | On-chain: ${onChainTx.slice(0, 12)}...`);
        setRecords(prev => prev.filter(r => r.maintenance_id !== id));
      }
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
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

    try {
      // Validate on-chain configuration is available
      if (!MULTI_PARTY_APPROVAL_ID) {
        throw new Error('Contract ID not configured (NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID) — on-chain rejection required');
      }

      // BLOCKCHAIN-FIRST: Reject on-chain via Soroban BEFORE backend/DB write.
      if (isConnected && address) {
        const idBytes32 = toBytesN32(id);
        const txResult = await callContract(
          MULTI_PARTY_APPROVAL_ID,
          'reject_by_supervisor',
          [idBytes32]
        );
        const onChainTx = txResult.transactionHash;

        // On-chain succeeded — now record in backend (DB mirror)
        const result = await api.supervisorReject(id, {
          decision_note: 'Rejected: requires additional evidence',
        });

        setTxHash(`Record ${id} → Status: ${result.status} | On-chain: ${onChainTx.slice(0, 12)}...`);
        setRecords(prev => prev.filter(r => r.maintenance_id !== id));
      }
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
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
