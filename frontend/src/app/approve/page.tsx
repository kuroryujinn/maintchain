'use client';
import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

const mockRecords = [
  {
    id: 'REC-DE-4471',
    technician: 'Elena Fischer',
    equipment: 'Drive Motor Assembly 44',
    hash: '0xde44...007a',
  },
  {
    id: 'REC-IN-8702',
    technician: 'Rohan Patel',
    equipment: 'Boiler Control Array 12',
    hash: '0x8122...1ba7',
  },
];

export default function ApprovalCenter() {
  const { isConnected } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      const result = await api.supervisorApprove(id, {
        decision_note: 'Approved via MaintChain approval center',
      });
      setTxHash(`Record ${id} → Status: ${result.status}`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
    }
  };

  const handleReject = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      const result = await api.supervisorReject(id, {
        decision_note: 'Rejected: requires additional evidence',
      });
      setTxHash(`Record ${id} → Status: ${result.status}`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Supervisor approval center"
        caption="Approve · Approving or rejecting maintenance records via the backend API."
        action={<StatusBadge tone={isConnected ? 'verified' : 'pending'}>{isConnected ? 'Ready for approvals' : 'Connect wallet first'}</StatusBadge>}
      />

      <WalletConnectPanel />

      {isConnected && (
        <div className="space-y-4">
          {(error || txHash) && (
            <div
              className="glass px-4 py-3 text-sm"
              style={{
                borderColor: txHash ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)',
                color: txHash ? '#166534' : '#991b1b'
              }}
            >
              <div className="font-semibold">
                {txHash ? 'Approval processed' : 'Approval failed'}
              </div>
              <div className="mt-1 font-mono text-xs">{txHash ?? error}</div>
            </div>
          )}

          {mockRecords.length === 0 ? (
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
                {mockRecords.map((record, i) => (
                  <FadeInView key={record.id} className="glass p-6 flex justify-between items-center" direction="up" distance="sm" duration={400} delay={i * 80}>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">Record #{record.id}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Technician: {record.technician} | Equipment: {record.equipment}
                      </p>
                      <p className="text-xs text-[var(--primary)] font-mono mt-1">
                        Hash: {record.hash}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(record.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(record.id)}
                        className="rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </FadeInView>
                ))}
              </div>

              {/* Approval history timeline */}
              <FadeInView className="glass p-6 mt-6" direction="up" distance="sm" duration={400} delay={120}>
                <EditorialSectionHeader number="02" title="Recent approval history" />
                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-[var(--text-secondary)]">REC-8821-A</span>
                    <span className="text-[var(--text-primary)] font-medium">Approved</span>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">2 min ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-[var(--text-secondary)]">REC-7754-C</span>
                    <span className="text-[var(--text-primary)] font-medium">Approved</span>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">1 hour ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-[var(--text-secondary)]">REC-6631-D</span>
                    <span className="text-[var(--text-primary)] font-medium">Pending your review</span>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">3 hours ago</span>
                  </div>
                </div>
              </FadeInView>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Approval rule">Supervisor sign-off sent via POST /maintenance/:id/approvals/supervisor</DetailPanel>
            <DetailPanel glass label="Proof context">Hashes and worker context stay attached to each record.</DetailPanel>
            <DetailPanel glass label="API integration">Records are processed by the backend at port 8081.</DetailPanel>
          </div>
        </div>
      )}
    </div>
  );
}
