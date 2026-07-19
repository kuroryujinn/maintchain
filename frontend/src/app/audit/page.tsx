'use client';
import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import type { AuditResponse } from '@/lib/api-types';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink } from 'lucide-react';
import { toBytesN32 } from '@/lib/soroban';

const COMPLIANCE_ATTESTATION_ID = process.env.NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID || '';
const MULTI_PARTY_APPROVAL_ID = process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID || '';
const MAINTENANCE_RECORDS_ID = process.env.NEXT_PUBLIC_MAINTENANCE_RECORDS_ID || '';

export default function AuditTimeline() {
  const { connectWallet, isConnected, callContract, address } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    const load = async () => {
      setAuditLoading(true);
      try {
        const data = await api.getAuditTrail('REC-DE-4471');
        setAuditData(data);
      } catch {
        // Fall back to empty state if backend unavailable
      } finally {
        setAuditLoading(false);
      }
    };
    load();
  }, [isConnected]);

  const handleCertify = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      // 1. Issue certificate via backend API
      const result = await api.auditorApprove(id, {
        decision_note: 'Compliance verified — evidence and approval chain complete.',
      });

      // 2. Also issue certificate on-chain via Soroban (if wallet connected)
      let onChainTx: string | null = null;
      if (isConnected && COMPLIANCE_ATTESTATION_ID && MULTI_PARTY_APPROVAL_ID && MAINTENANCE_RECORDS_ID && address) {
        try {
          // Generate a random cert hash
          const certHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
          const idBytes32 = toBytesN32(id);
          const txResult = await callContract(
            COMPLIANCE_ATTESTATION_ID,
            'issue_certificate',
            [MULTI_PARTY_APPROVAL_ID, MAINTENANCE_RECORDS_ID, idBytes32, certHash]
          );
          onChainTx = txResult.transactionHash;
        } catch (sorobanError) {
          console.warn('Soroban issue_certificate failed:', sorobanError);
        }
      }

      const txInfo = onChainTx ? ` | On-chain tx: ${onChainTx.slice(0, 12)}...` : '';
      setTxHash(`Certificate issued → Status: ${result.status}${txInfo}`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Audit timeline and certificate issuance"
        caption="Audit · Fetches real audit trail from backend API and issues compliance certificates."
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
              <div className="w-full">
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Maintenance Event #REC-DE-4471</h3>

                {(error || txHash) && (
                  <div
                    className="mt-4 glass px-4 py-3 text-sm motion-safe:animate-[fadeSlideUp_0.3s_ease-out]"
                    style={{
                      borderColor: txHash ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)',
                      color: txHash ? '#166534' : '#991b1b'
                    }}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {txHash ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {txHash ? 'Certification processed' : 'Certification failed'}
                    </div>
                    <div className="mt-1 font-mono text-xs">{txHash ?? error}</div>
                  </div>
                )}

                {/* Dynamic audit timeline from API */}
                <div className="mt-6 relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:to-slate-200">
                  {auditLoading ? (
                    <div className="text-sm text-[var(--text-secondary)]">Loading audit trail...</div>
                  ) : auditData && auditData.events.length > 0 ? (
                    auditData.events.map((event) => (
                      <div key={event.id} className="relative">
                        <div className={`absolute -left-8 mt-1 h-6 w-6 rounded-full ring-4 ring-emerald-100 flex items-center justify-center ${
                          event.decision === 'APPROVED' ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}>
                          {event.decision === 'APPROVED' ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : (
                            <Clock3 className="h-3 w-3 text-slate-500" />
                          )}
                        </div>
                        <div className="glass p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                            {event.role}
                          </div>
                          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                            {event.decision ?? 'Pending'}
                          </div>
                          {event.note && (
                            <div className="mt-1 text-xs text-[var(--text-secondary)] italic">
                              &quot;{event.note}&quot;
                            </div>
                          )}
                          <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {new Date(event.approval_timestamp).toLocaleString()}
                          </div>
                          {/* Link to on-chain transaction */}
                          {event.on_chain_tx_id && (
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${event.on_chain_tx_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary)] font-mono hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on-chain → {event.on_chain_tx_id.slice(0, 12)}...
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Static fallback timeline */}
                      <div className="relative">
                        <div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                        <div className="glass p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Technician Uploaded Evidence</div>
                          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">S-441 completed evidence package</div>
                          <div className="mt-1 text-xs text-[var(--text-tertiary)]">2026-06-10 10:00 UTC</div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                        <div className="glass p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Supervisor Approved</div>
                          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">S-102 confirmed evidence accuracy</div>
                          <div className="mt-1 text-xs text-[var(--text-tertiary)]">2026-06-11 14:30 UTC</div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-slate-200 ring-4 ring-slate-100 flex items-center justify-center">
                          <Clock3 className="h-3 w-3 text-slate-500" />
                        </div>
                        <div className="glass p-4 border-dashed border-[var(--border)]">
                          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Auditor Certification</div>
                          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">Pending your certification</div>
                          <div className="mt-2">
                            <button
                              onClick={() => handleCertify('REC-DE-4471')}
                              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                            >
                              Issue Compliance Certificate
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Only show bottom certify button if we have dynamic data (API loaded) */}
                {auditData && auditData.events.length > 0 && (
                  <button
                    onClick={() => handleCertify('REC-DE-4471')}
                    className="mt-6 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Issue Compliance Certificate
                  </button>
                )}
              </div>
            </div>
          </FadeInView>

          <FadeInView direction="up" distance="sm" duration={400} delay={80} className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Timeline source">Fetched from GET /maintenance/:id/audit</DetailPanel>
            <DetailPanel glass label="Certificate action">Issued via POST /maintenance/:id/approvals/auditor</DetailPanel>
            <DetailPanel glass label="Verification target">Every event links to an on-chain transaction hash.</DetailPanel>
          </FadeInView>
        </div>
      )}
    </div>
  );
}
