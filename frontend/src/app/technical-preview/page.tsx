'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Shield,
  Upload,
  UserCheck,
  ClipboardCheck,
  FileCheck,
  Award,
  AlertTriangle,
  Bug,
  MessageSquare,
} from 'lucide-react';

const TEST_STAGES = [
  {
    step: '01',
    title: 'Get Verified',
    slug: '/get-verified',
    icon: Shield,
    description: 'Register your identity on-chain by connecting Freighter and signing a Soroban transaction. This creates a verified identity record that links your Stellar wallet to your profile (name, role, organization).',
    testNotes: [
      'Does the wallet connection flow work end-to-end?',
      'Does the challenge-response auth (SEP-53) work correctly?',
      'Does the verification transaction get confirmed on Testnet?',
      'Does the backend sync mirror the on-chain record?',
    ],
  },
  {
    step: '02',
    title: 'Submit Evidence',
    slug: '/upload',
    icon: Upload,
    description: 'Submit maintenance evidence for a record. The evidence hash is stored on-chain via Soroban, while supporting files remain off-chain.',
    testNotes: [
      'Does the file upload UX work as expected?',
      'Does the on-chain submit_evidence call succeed?',
      'Does the approval flow show the new evidence in the timeline?',
      'Try submitting without a wallet connected — does the error message make sense?',
    ],
  },
  {
    step: '03',
    title: 'Technician Approval',
    slug: '/technician',
    icon: UserCheck,
    description: 'Technicians approve maintenance records they worked on. This triggers the first on-chain approval via the MultiPartyApproval contract.',
    testNotes: [
      'Does the technician approval flow work?',
      'Are error states visible when the on-chain call fails?',
      'Does rejecting from the technician side propagate correctly?',
    ],
  },
  {
    step: '04',
    title: 'Supervisor Approval',
    slug: '/approve',
    icon: ClipboardCheck,
    description: 'Supervisors review and approve or reject technician-submitted evidence. This is the second approval layer, also recorded on-chain.',
    testNotes: [
      'Does the supervisor approval center load pending records?',
      'Try approving and rejecting — do both flows complete?',
      'Does the on-chain failure state show clearly (reject the Freighter prompt)?',
      'Does the TransactionProgress component show meaningful status during polling?',
    ],
  },
  {
    step: '05',
    title: 'Auditor Certification',
    slug: '/audit',
    icon: FileCheck,
    description: 'Auditors review the full evidence trail and issue a compliance certificate. The issue_certificate contract call cross-invokes MultiPartyApproval.verify() and MaintenanceRecords.complete() on-chain.',
    testNotes: [
      'Does the certification checklist dialog work?',
      'Does the issue_certificate cross-contract call succeed?',
      'Try certifying with only partial approvals — does it correctly fail?',
      'Does the audit trail show the expected timeline of events?',
    ],
  },
  {
    step: '06',
    title: 'Compliance Certificate',
    slug: '/certificates',
    icon: Award,
    description: 'View issued compliance certificates. Each certificate is linked to the on-chain transaction hash that created it, making every certificate independently verifiable on Stellar Testnet.',
    testNotes: [
      'Do issued certificates appear in the certificates view?',
      'Can you click through to view a certificate\'s on-chain transaction?',
    ],
  },
];

const KNOWN_ISSUES = [
  {
    icon: AlertTriangle,
    title: 'Testnet RPC latency',
    description: 'Stellar Testnet RPC can be slow or occasionally unavailable. If a transaction seems stuck during the “Confirming — attempt N/15” phase, wait for polling to complete — the status banner will show the result.',
  },
  {
    icon: Bug,
    title: 'Freighter signature timing',
    description: 'If Freighter doesn’t open automatically for signing, check that it’s unlocked and on Testnet. You may need to manually open Freighter and approve the signature request.',
  },
  {
    icon: AlertTriangle,
    title: 'Balance required',
    description: 'Each on-chain transaction costs a small amount of testnet XLM. If you haven’t funded your wallet, use the Stellar Lab faucet to get testnet XLM before starting.',
  },
  {
    icon: Bug,
    title: 'Contract deployment state',
    description: 'Contracts are deployed to Testnet and may be reset. If you get a “simulation failed” error, the contracts may have been redeployed and the frontend environment variables need updating.',
  },
];

export default function TechnicalPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span>Phase 1</span>
          <span aria-hidden="true">·</span>
          <span>Technical Preview</span>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_8px_24px_rgba(245,158,11,0.35)]">
            <FlaskConical className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What to Test
            </h1>
            <p className="mt-2 text-lg text-[var(--text-secondary)]">
              MaintChain is a <strong>technical preview</strong> of a multi-party
              approval and compliance certificate system on{' '}
              <strong>Stellar Testnet</strong>. We&rsquo;re looking for bugs, confusing
              flows, and feedback on the approval logic — not production data.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <strong>Got feedback?</strong>{' '}
              Use the feedback button (bottom-right corner) or{' '}
              <Link href="/feedback" className="font-semibold underline hover:text-amber-900">
                visit the feedback page
              </Link>
              . Tell us which stage you tested, what happened, and what you expected
              instead. Specific bug reports are incredibly helpful.
            </div>
          </div>
        </div>
      </div>

      {/* Test Stages */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          The Six Compliance Stages
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Walk through each stage end-to-end. Each stage involves an on-chain Soroban
          transaction, so you&rsquo;ll need Freighter and some testnet XLM.
        </p>

        <div className="space-y-4">
          {TEST_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur-sm transition hover:border-blue-200 hover:bg-white/80 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-sm">
                    {stage.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {stage.title}
                      </h3>
                      <Link
                        href={stage.slug}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                      >
                        Go to {stage.title} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {stage.description}
                    </p>
                    <div className="mt-3 space-y-1">
                      {stage.testNotes.map((note) => (
                        <div key={note} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Known Issues */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Known Rough Edges
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          These are things we&rsquo;re aware of. Please still report them — knowing how
          often they occur helps us prioritize fixes.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {KNOWN_ISSUES.map((issue) => {
            const Icon = issue.icon;
            return (
              <div
                key={issue.title}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900">{issue.title}</h3>
                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    {issue.description}
                  </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Start CTA */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 text-center backdrop-blur-sm">
        <FlaskConical className="mx-auto h-10 w-10 text-blue-500" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          Ready to Start Testing?
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
          Begin with Stage 1 — Get Verified. You&rsquo;ll need Freighter installed,
          a Stellar Testnet wallet with a small amount of testnet XLM, and about
          15 minutes to walk through all six stages.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/get-verified"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
          >
            Start Stage 1: Get Verified <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
