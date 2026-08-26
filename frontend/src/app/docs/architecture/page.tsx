import Link from 'next/link';

export default function DocsArchitecture() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">04</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Architecture</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          System design, component interactions, and data flow.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">System Overview</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain uses a full-stack architecture with two independent data paths:
          on-chain operations via Freighter wallet, and off-chain CRUD via the backend API.
        </p>
        <div className="glass p-4 font-mono text-xs text-[#0f172a] overflow-x-auto">
          <pre>{`┌─────────────────────────────────────────────────┐
│  Browser (Next.js 14 + React 18 + Tailwind v4) │
│  ┌───────────────────────────────────────────┐  │
│  │  Freighter wallet injection               │  │
│  │  InvokeContract / SimulateContract        │  │
│  │  REST API client (fetch → backend)         │  │
│  └────────┬──────────────────────┬───────────┘  │
│           │ Freighter            │ fetch        │
│           ▼                      ▼              │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Stellar Testnet  │  │ Backend (Axum)     │  │
│  │ · Soroban        │  │ · Equipment CRUD   │  │
│  │ · Horizon        │  │ · Maintenance      │  │
│  │ · Signed txs     │  │ · Approvals        │  │
│  └──────────────────┘  │ · Audit trail      │  │
│                        │ · SHA-256 hashing   │  │
│                        └────────────────────┘  │
└─────────────────────────────────────────────────┘`}</pre>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Authentication Flow</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Two-layer authentication: server-to-server API key + per-user wallet session (SEP-53).
        </p>
        <div className="glass p-4 font-mono text-xs text-[#0f172a] overflow-x-auto">
          <pre>{`Browser                    Proxy                    Backend
  │                         │                         │
  │── POST /auth/challenge ─►──── /auth/challenge ────►│
  │                         │   Generate nonce         │
  │◄── { message } ────────◄──── { message } ─────────◄│
  │                         │                         │
  │── Freighter sign() ────►│                         │
  │◄── { signature } ──────│                         │
  │                         │                         │
  │── POST /auth/verify ───►──── /auth/verify ───────►│
  │   { nonce, signature }  │   Ed25519_verify()      │
  │◄── 200 + Set-Cookie ───◄──── { verified:true } ──◄│
  │                         │                         │
  │── GET /api/* ──────────►│   Validate cookie       │
  │   Cookie: session=...   │   Add X-User-Address    │
  │                         │──── forwarded ─────────►│`}</pre>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Compliance Flow</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          The six-stage compliance workflow:
        </p>
        <div className="glass p-4 space-y-3">
          {[
            { stage: '1. Detection', desc: 'Equipment flagged by sensor or inspector.' },
            { stage: '2. Assignment', desc: 'Technician accepts order. Recorded in backend + on-chain.' },
            { stage: '3. Evidence Upload', desc: 'Technician documents repair. SHA-256 hash stored on-chain.' },
            { stage: '4. Verification', desc: 'Supervisor reviews evidence against work order.' },
            { stage: '5. Multi-Party Approval', desc: 'Supervisor approves on-chain. Optional auditor signs.' },
            { stage: '6. Certificate Issuance', desc: 'ComplianceAttestation issues final certificate on-chain.' },
          ].map((item) => (
            <div key={item.stage} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-[#2563eb] whitespace-nowrap mt-0.5">{item.stage}</span>
              <span className="text-sm text-[#64748b]">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">On-Chain / Off-Chain Boundary</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Approval signatures', 'On-chain', 'Immutable audit trail'],
                ['Evidence hashes', 'On-chain', 'Proof-of-existence without large files'],
                ['Equipment ownership', 'On-chain', 'Verifiable chain of custody'],
                ['Compliance certificates', 'On-chain', 'Publicly verifiable at any time'],
                ['Evidence files', 'Off-chain (IPFS)', 'Cost-prohibitive on-chain'],
                ['Worker profiles', 'Off-chain (Postgres)', 'High churn, not safety-critical'],
                ['Machine metadata', 'Off-chain (Postgres)', 'Updated frequently'],
              ].map(([data, location, rationale]) => (
                <tr key={data}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{data}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{location}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Deployment Architecture</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Platform</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Frontend', 'Vercel', 'Auto-deployed from main'],
                ['Backend', 'Render', 'Docker container (render.yaml)'],
                ['Database', 'Supabase', 'PostgreSQL 16'],
                ['Contracts', 'Stellar Testnet', '5 Soroban contracts'],
                ['Error Tracking', 'GlitchTip', 'Sentry-compatible SDK'],
              ].map(([service, platform, config]) => (
                <tr key={service}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{service}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{platform}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{config}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/getting-started" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Getting Started</Link>
        <Link href="/docs/blockchain" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Blockchain →</Link>
      </div>
    </div>
  );
}
