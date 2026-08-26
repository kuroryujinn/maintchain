import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Overview — MaintChain Documentation',
  description: 'What is MaintChain, the problem it solves, and its core concept.',
};

export default function DocsOverview() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">01</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Overview</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          MaintChain is a decentralized compliance platform that makes industrial maintenance records provably tamper-proof.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">What is MaintChain?</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain prevents falsification of industrial maintenance records by enforcing a multi-party approval workflow on-chain.
          A maintenance record is only considered compliant after independent roles (technician, supervisor, optionally auditor)
          have recorded their approvals via Soroban smart contracts on Stellar Testnet.
        </p>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Evidence files remain off-chain; only cryptographic hashes are stored on-chain.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">The Problem</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Industrial maintenance records today suffer from four structural vulnerabilities:
        </p>
        <div className="glass p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-[#dc2626] text-sm font-semibold mt-0.5">Mutable</span>
            <span className="text-sm text-[#64748b]">Paper logs and spreadsheets can be altered after the fact — no trusted historical record.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#dc2626] text-sm font-semibold mt-0.5">Single-party</span>
            <span className="text-sm text-[#64748b]">One person&apos;s approval is rarely audited by independent roles — single point of failure.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#dc2626] text-sm font-semibold mt-0.5">Isolated</span>
            <span className="text-sm text-[#64748b]">A technician&apos;s reputation does not travel with them across employers — repeated trust-building.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#dc2626] text-sm font-semibold mt-0.5">Expensive to audit</span>
            <span className="text-sm text-[#64748b]">Verifying a repair history requires chasing down siloed records — high compliance costs.</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">The Solution</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain closes the trust gap by enforcing a multi-party cryptographic approval workflow on the Stellar blockchain.
          To fake a single maintenance record, an attacker would need to compromise multiple independent key pairs and create
          matching evidence hashes — making falsification economically irrational.
        </p>
        <div className="glass p-4">
          <p className="text-sm font-mono text-[#0f172a]">
            Fault Detected → Worker Accepts → Evidence Uploaded → Evidence Verified → Approval Chain → Certificate Generated
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Core Concept</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          The core insight: a maintenance record is only trustworthy when multiple independent parties have cryptographically
          signed off on it. MaintChain enforces this through a multi-party approval workflow on-chain — technician submits
          evidence, supervisor verifies, auditor certifies — and every step is permanently recorded on the Stellar blockchain.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Target Users</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { role: 'Technicians', desc: 'Field workers who perform maintenance and submit evidence. Get a portable trust score.' },
            { role: 'Supervisors', desc: 'Site-level managers who verify evidence and approve work. Build reputation as reliable verifiers.' },
            { role: 'Auditors', desc: 'External or internal auditors who issue final compliance certificates.' },
            { role: 'Equipment Owners', desc: 'Companies that get verifiable, tamper-proof maintenance history.' },
          ].map((item) => (
            <div key={item.role} className="glass p-4">
              <h3 className="text-sm font-semibold text-[#0f172a]">{item.role}</h3>
              <p className="mt-1 text-xs text-[#64748b]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Technology Stack</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Layer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Technology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Blockchain', 'Stellar Soroban (Testnet)'],
                ['Smart Contracts', 'Rust (no_std, wasm32v1-none)'],
                ['Backend', 'Rust (Axum) + PostgreSQL'],
                ['Frontend', 'Next.js 14 (App Router) + React 18'],
                ['Styling', 'Tailwind CSS v4'],
                ['Wallet', 'Freighter Browser Extension'],
                ['Authentication', 'SEP-53 challenge-response'],
                ['Error Tracking', 'GlitchTip (Sentry-compatible)'],
                ['Hosting', 'Vercel (frontend) + Render (backend)'],
              ].map(([layer, tech]) => (
                <tr key={layer}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{layer}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{tech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Documentation</Link>
        <Link href="/docs/features" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Features →</Link>
      </div>
    </div>
  );
}
