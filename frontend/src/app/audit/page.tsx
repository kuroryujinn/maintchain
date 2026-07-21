'use client';
import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import type { AuditResponse } from '@/lib/api-types';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck,
  Fingerprint,
  ShieldCheck,
  UserCheck,
  Wrench,
  Loader2,
  ClipboardList,
  Building2,
  User,
} from 'lucide-react';
import { toBytesN32 } from '@/lib/soroban';

const COMPLIANCE_ATTESTATION_ID = process.env.NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID || '';
const MULTI_PARTY_APPROVAL_ID = process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID || '';
const MAINTENANCE_RECORDS_ID = process.env.NEXT_PUBLIC_MAINTENANCE_RECORDS_ID || '';

interface CertFormData {
  auditorName: string;
  organization: string;
  certificationNotes: string;
  evidenceVerified: boolean;
  supervisorApprovalVerified: boolean;
  equipmentIdentityVerified: boolean;
  documentationComplete: boolean;
  partsTraceable: boolean;
}

const initialFormData: CertFormData = {
  auditorName: '',
  organization: '',
  certificationNotes: '',
  evidenceVerified: false,
  supervisorApprovalVerified: false,
  equipmentIdentityVerified: false,
  documentationComplete: false,
  partsTraceable: false,
};

const checklistItems = [
  { key: 'evidenceVerified' as const, label: 'Evidence hash verified against on-chain record', icon: Fingerprint },
  { key: 'supervisorApprovalVerified' as const, label: 'Supervisor approval confirmed', icon: UserCheck },
  { key: 'equipmentIdentityVerified' as const, label: 'Equipment identity verified', icon: ShieldCheck },
  { key: 'documentationComplete' as const, label: 'Maintenance documentation complete', icon: FileCheck },
  { key: 'partsTraceable' as const, label: 'Parts and materials traceable', icon: Wrench },
];

export default function AuditTimeline() {
  const { connectWallet, isConnected, callContract, address } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [certifying, setCertifying] = useState(false);

  // Certification dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CertFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CertFormData, string>>>({});

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

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };

  const openCertDialog = () => {
    resetForm();
    // Pre-fill from wallet if connected
    if (address) {
      setFormData(prev => ({ ...prev, auditorName: address.slice(0, 12) + '...' }));
    }
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CertFormData, string>> = {};
    if (!formData.auditorName.trim()) errors.auditorName = 'Auditor name is required';
    if (!formData.organization.trim()) errors.organization = 'Organization is required';
    if (!formData.certificationNotes.trim()) errors.certificationNotes = 'Certification notes are required';

    // Check at least 3 of 5 checklist items
    const checkedCount = checklistItems.filter(item => formData[item.key]).length;
    if (checkedCount < 3) {
      // We'll attach the error generically
      errors.evidenceVerified = 'Please verify at least 3 items before certifying';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const refreshAuditTrail = async () => {
    try {
      const data = await api.getAuditTrail('REC-DE-4471');
      setAuditData(data);
    } catch {
      // Silently fail — the timeline already shows the latest state
    }
  };

  const handleCertify = async () => {
    if (!validateForm()) return;

    setCertifying(true);
    setTxHash(null);
    setError(null);
    setDialogOpen(false);

    const maintenanceId = 'REC-DE-4471';

    try {
      // Build structured certification note from form data
      const checkedItems = checklistItems
        .filter(item => formData[item.key])
        .map(item => `  ✅ ${item.label}`)
        .join('\n');

      const decisionNote = [
        `━━━ Auditor Certification Report ━━━`,
        ``,
        `Auditor:         ${formData.auditorName}`,
        `Organization:    ${formData.organization}`,
        `Maintenance ID:  ${maintenanceId}`,
        `Certified At:    ${new Date().toISOString()}`,
        ``,
        `━━━ Verification Checklist ━━━`,
        checkedItems || '  ⚠️ No items checked',
        ``,
        `━━━ Notes ━━━`,
        formData.certificationNotes,
        ``,
        `━━━ End of Certification ━━━`,
      ].join('\n');

      // 1. Issue certificate via backend API
      const result = await api.auditorApprove(maintenanceId, {
        decision_note: decisionNote,
      });

      // 2. Also issue certificate on-chain via Soroban (if wallet connected)
      let onChainTx: string | null = null;
      if (isConnected && COMPLIANCE_ATTESTATION_ID && MULTI_PARTY_APPROVAL_ID && MAINTENANCE_RECORDS_ID && address) {
        try {
          const certHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
          const idBytes32 = toBytesN32(maintenanceId);
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
      resetForm();
      // Refresh the audit trail to include the new auditor approval event
      refreshAuditTrail();
    } catch (e: unknown) {
      const message = e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
      setError(message);
    } finally {
      setCertifying(false);
    }
  };

    const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
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
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Maintenance Event #REC-DE-4471</h3>
                </div>

                {/* Status / error banner */}
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
                    <div className="mt-1 font-mono text-xs whitespace-pre-wrap">{txHash ?? error}</div>
                  </div>
                )}

                {/* Audit timeline */}
                <div className="mt-6 relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:to-slate-200">
                  {auditLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading audit trail...
                    </div>
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
                            <div className="mt-1 text-xs text-[var(--text-secondary)] italic whitespace-pre-wrap line-clamp-3">
                              &quot;{event.note}&quot;
                            </div>
                          )}
                          <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {new Date(event.approval_timestamp).toLocaleString()}
                          </div>
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

                      {/* Auditor step — floating certification card */}
                      <div className="relative">
                        <div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-indigo-500 ring-4 ring-indigo-100 flex items-center justify-center">
                          <ClipboardList className="h-3 w-3 text-white" />
                        </div>
                        <div className="glass p-5 border-2 border-dashed" style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Auditor Certification</div>
                              <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                                Pending your certification
                              </div>
                            </div>
                            <span className="glow-dot-blue" />
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-secondary)]">
                            Review the maintenance record, verify evidence and approvals,
                            then issue the compliance certificate with your details.
                          </p>
                          <div className="mt-4">
                            <Button
                              onClick={openCertDialog}
                              disabled={certifying}
                              className="rounded-full bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 transition"
                            >
                              {certifying ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Certifying...</>
                              ) : (
                                <><ClipboardList className="mr-2 h-4 w-4" /> Issue Compliance Certificate</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom certify button for dynamic timeline */}
                {auditData && auditData.events.length > 0 && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={openCertDialog}
                      disabled={certifying}
                      className="rounded-full bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 transition"
                    >
                      {certifying ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Certifying...</>
                      ) : (
                        <><ClipboardList className="mr-2 h-4 w-4" /> Issue Compliance Certificate</>
                      )}
                    </Button>
                  </div>
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

      {/* ─── Certification Form Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              Issue Compliance Certificate
            </DialogTitle>
            <DialogDescription>
              Fill in your details and verify the checklist before certifying this maintenance record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Auditor Identity */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                <User className="h-3 w-3" />
                Auditor Identity
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Jane Smith"
                    value={formData.auditorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, auditorName: e.target.value }))}
                    className={formErrors.auditorName ? 'border-red-400' : ''}
                  />
                  {formErrors.auditorName && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.auditorName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
                    Organization <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Bureau Veritas, SGS, TÜV Rheinland"
                    value={formData.organization}
                    onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                    className={formErrors.organization ? 'border-red-400' : ''}
                  />
                  {formErrors.organization && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.organization}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Verification Checklist */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                <ShieldCheck className="h-3 w-3" />
                Verification Checklist <span className="text-red-500">* (at least 3)</span>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        formData[item.key]
                          ? 'border-indigo-200 bg-indigo-50/60'
                          : 'border-[var(--border)] hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData[item.key]}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-start gap-2">
                        <Icon className={`mt-0.5 h-4 w-4 ${
                          formData[item.key] ? 'text-indigo-600' : 'text-[var(--text-tertiary)]'
                        }`} />
                        <span className={`text-sm ${
                          formData[item.key] ? 'text-indigo-900 font-medium' : 'text-[var(--text-secondary)]'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {formErrors.evidenceVerified && (
                <p className="mt-2 text-xs text-red-500">Please verify at least 3 items before certifying</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Certification Notes */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                <Building2 className="h-3 w-3" />
                Certification Notes <span className="text-red-500">*</span>
              </div>
              <textarea
                placeholder="Provide a detailed summary of your certification findings, including any observations, recommendations, or conditions..."
                value={formData.certificationNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, certificationNotes: e.target.value }))}
                rows={4}
                className={`w-full rounded-xl border bg-transparent p-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                  formErrors.certificationNotes ? 'border-red-400' : 'border-[var(--border)]'
                }`}
              />
              {formErrors.certificationNotes && (
                <p className="mt-1 text-xs text-red-500">{formErrors.certificationNotes}</p>
              )}
            </div>

            {/* Connected wallet info */}
            {address && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Connected wallet:</span>{' '}
                <span className="font-mono">{address.slice(0, 8)}...{address.slice(-4)}</span>
                {' · '}Network: Stellar Testnet
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleDialogClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCertify}
              disabled={certifying}
              className="rounded-full bg-indigo-600 px-6 text-white hover:bg-indigo-700"
            >
              {certifying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Certifying...</>
              ) : (
                <><ClipboardList className="mr-2 h-4 w-4" /> Issue Certificate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
