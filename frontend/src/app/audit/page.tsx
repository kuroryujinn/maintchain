'use client';
import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { useSoroban } from '@/hooks/useSoroban';

export default function AuditTimeline() {

  const { connectWallet, isConnected, callContract } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCertify = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      const result = await callContract('ATTESTATION_CONTRACT_ID', 'issue_certificate', [
        id,
        'on_chain_cert_hash',
      ]);

      const maybeHash =
        (result as any)?.hash ??
        (result as any)?.transactionHash ??
        (result as any)?.result?.hash ??
        null;

      setTxHash(maybeHash);
      if (!maybeHash) setError('Contract call succeeded but tx hash is not available from wallet result.');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };


  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Audit timeline and certificate issuance"
        caption="Audit · The audit route now sits inside the shared shell while keeping the existing certification contract call available."
        action={<StatusBadge tone={isConnected ? 'info' : 'pending'}>{isConnected ? 'Auditor session active' : 'Wallet required'}</StatusBadge>}
      />

      {!isConnected ? (
        <FadeInView direction="up" distance="sm" duration={400} className="glass p-8 text-center" style={{ borderColor: 'rgba(37, 99, 235, 0.25)' }}>
          <p className="mb-4 text-[var(--text-primary)]">Connect your wallet to perform audit certification.</p>
          <button
            onClick={connectWallet}
            className="rounded-full bg-[var(--primary)] px-6 py-3 text-white"
          >
            Connect Wallet
          </button>
        </FadeInView>
      ) : (
        <div className="space-y-4">
          <FadeInView direction="up" distance="sm" duration={400} className="glass p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Maintenance Event #REC-8821-A</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[var(--text-secondary)]">Technician Uploaded Evidence (S-441)</span>
                    <span className="text-[var(--text-secondary)] ml-auto">2026-06-10 10:00</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[var(--text-secondary)]">Supervisor Approved (S-102)</span>
                    <span className="text-[var(--text-secondary)] ml-auto">2026-06-11 14:30</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm opacity-50">
                    <div className="w-3 h-3 rounded-full bg-[var(--border)]"></div>
                    <span className="text-[var(--text-secondary)]">Auditor Certification</span>
                    <span className="text-[var(--text-secondary)] ml-auto">Pending...</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCertify('REC-8821-A')}
                  className="mt-6 rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                  Issue Compliance Certificate
                </button>
              </div>
            </div>
          </FadeInView>

          <FadeInView direction="up" distance="sm" duration={400} delay={80} className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Timeline purpose">Show what has happened, what is pending, and who closes the loop.</DetailPanel>
            <DetailPanel glass label="Certificate action">Issue a compliance certificate after the approval chain is complete.</DetailPanel>
            <DetailPanel glass label="Verification target">Keep audit proof readable without crypto-first aesthetics.</DetailPanel>
          </FadeInView>
        </div>
      )}
    </div>
  );
}
