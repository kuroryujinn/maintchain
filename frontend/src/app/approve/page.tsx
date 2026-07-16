'use client';
import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';

export default function ApprovalCenter() {
  const { isConnected, callContract } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      const result = await callContract(
        'MULTI_PARTY_APPROVAL_ID',
        'approve_by_supervisor',
        [id, '1'] // 1 for APPROVED
      );

      const maybeHash =
        (result as any)?.hash ??
        (result as any)?.transactionHash ??
        (result as any)?.result?.hash ??
        null;

      setTxHash(maybeHash);
      if (!maybeHash) {
        setError(
          'Contract call succeeded but tx hash is not available from wallet result.'
        );
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Supervisor approval center"
        caption="Approve · Existing contract calls stay intact while the approval surface now matches the rest of MaintChain's trust-oriented UI."
        action={<StatusBadge tone={isConnected ? 'verified' : 'pending'}>{isConnected ? 'Ready for approvals' : 'Connect wallet first'}</StatusBadge>}
      />

      <WalletConnectPanel />

      {isConnected && (
        <div className="space-y-4">
          {(error || txHash) && (
            <div
              className={
                txHash
                  ? 'glass px-4 py-3 text-sm'
                  : 'glass px-4 py-3 text-sm'
              }
              style={{
                borderColor: txHash ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)',
                color: txHash ? '#166534' : '#991b1b'
              }}
            >
              {txHash ? (
                <>
                  <div className="font-semibold">Contract transaction submitted</div>
                  <div className="mt-1 font-mono text-xs">{txHash}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Contract transaction failed</div>
                  <div className="mt-1">{error}</div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <FadeInView className="glass p-6 flex justify-between items-center" direction="up" distance="sm" duration={400}>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Record #8821-A</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Technician: Alice | Equipment: Pump-01
                </p>
                <p className="text-xs text-[var(--primary)] font-mono mt-1">
                  Hash: 0x8f2...a1c
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove('REC-8821-A')}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {}}
                  className="rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </FadeInView>

            <FadeInView className="glass p-6 flex justify-between items-center" direction="up" distance="sm" duration={400} delay={80}>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Record #9012-B</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Technician: Bob | Equipment: Valve-04
                </p>
                <p className="text-xs text-[var(--primary)] font-mono mt-1">
                  Hash: 0x1a4...b2d
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove('REC-9012-B')}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {}}
                  className="rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </FadeInView>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Approval rule">Supervisor sign-off remains visible before certificate issuance.</DetailPanel>
            <DetailPanel glass label="Proof context">Hashes and worker context stay attached to each record.</DetailPanel>
            <DetailPanel glass label="Later integration">This seeded shell can be swapped for API-backed queues later.</DetailPanel>
          </div>
        </div>
      )}
    </div>
  );
}
