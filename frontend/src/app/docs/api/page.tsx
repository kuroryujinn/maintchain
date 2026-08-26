import Link from 'next/link';

export default function DocsApi() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">06</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">API Reference</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          REST API endpoints for the MaintChain backend.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Base URL</h2>
        <div className="glass p-4">
          <p className="text-sm font-mono text-[#0f172a]">https://maintchain-backend.onrender.com</p>
          <p className="mt-1 text-xs text-[#64748b]">All API requests go through the Next.js proxy at /api/*</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Authentication</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Two-layer authentication: API key (server-to-server) + session cookie (per-user).
          Auth endpoints (/api/auth/*) are public. All other endpoints require a valid session.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Public Endpoints</h2>
        <div className="space-y-3">
          {[
            { method: 'GET', path: '/health', desc: 'Health check', auth: 'None' },
            { method: 'GET', path: '/health/config', desc: 'Configuration check (database, env)', auth: 'None' },
            { method: 'POST', path: '/auth/challenge', desc: 'Generate SEP-53 nonce for wallet', auth: 'None' },
            { method: 'POST', path: '/auth/verify', desc: 'Verify wallet signature, issue session', auth: 'None' },
          ].map((ep) => (
            <div key={ep.path} className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#16a34a]">{ep.method}</span>
              <span className="text-sm font-mono text-[#0f172a]">{ep.path}</span>
              <span className="text-xs text-[#64748b] sm:ml-auto">{ep.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Protected Endpoints</h2>
        <div className="space-y-3">
          {[
            { method: 'GET', path: '/equipment', desc: 'List all equipment' },
            { method: 'POST', path: '/equipment', desc: 'Register equipment' },
            { method: 'GET', path: '/maintenance', desc: 'List maintenance records' },
            { method: 'POST', path: '/maintenance/orders', desc: 'Create maintenance order' },
            { method: 'GET', path: '/maintenance/:id', desc: 'Get maintenance record' },
            { method: 'POST', path: '/maintenance/:id/evidence', desc: 'Submit evidence hash' },
            { method: 'POST', path: '/maintenance/:id/evidence/upload', desc: 'Upload evidence file' },
            { method: 'POST', path: '/maintenance/:id/approvals/supervisor', desc: 'Supervisor approval' },
            { method: 'POST', path: '/maintenance/:id/approvals/supervisor/reject', desc: 'Supervisor rejection' },
            { method: 'GET', path: '/maintenance/:id/audit', desc: 'Get audit trail' },
            { method: 'POST', path: '/maintenance/:id/approvals/auditor', desc: 'Auditor certification' },
            { method: 'GET', path: '/maintenance/pending', desc: 'List pending approvals' },
            { method: 'GET', path: '/compliance/dashboard', desc: 'Compliance metrics' },
            { method: 'GET', path: '/compliance/eligible/:id', desc: 'Check eligibility' },
            { method: 'GET', path: '/compliance/attestation/:id', desc: 'Get on-chain attestation' },
            { method: 'GET', path: '/onchain/record/:id', desc: 'Get on-chain record' },
            { method: 'GET', path: '/users', desc: 'List users' },
            { method: 'POST', path: '/users', desc: 'Register user' },
            { method: 'GET', path: '/users/count', desc: 'User count' },
            { method: 'GET', path: '/users/:stellar_address', desc: 'Get user by wallet' },
            { method: 'GET', path: '/verification/readiness', desc: 'Verification readiness check' },
            { method: 'GET', path: '/verification/:stellar_address', desc: 'Get verification record' },
            { method: 'POST', path: '/verification', desc: 'Create verification record' },
            { method: 'POST', path: '/hash/evidence', desc: 'Compute evidence hash' },
            { method: 'GET', path: '/tx-log', desc: 'List transaction log' },
            { method: 'POST', path: '/tx-log', desc: 'Post transaction log entry' },
          ].map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#2563eb]">{ep.method}</span>
              <span className="text-sm font-mono text-[#0f172a]">{ep.path}</span>
              <span className="text-xs text-[#64748b] sm:ml-auto">{ep.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Frontend API Routes</h2>
        <div className="space-y-3">
          {[
            { method: 'POST', path: '/api/feedback', desc: 'Submit feedback (public)' },
            { method: 'GET', path: '/api/metrics', desc: 'Server metrics (public)' },
            { method: 'ANY', path: '/api/*', desc: 'Catch-all proxy to backend (auth required)' },
          ].map((ep) => (
            <div key={ep.path} className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#d97706]">{ep.method}</span>
              <span className="text-sm font-mono text-[#0f172a]">{ep.path}</span>
              <span className="text-xs text-[#64748b] sm:ml-auto">{ep.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/blockchain" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Blockchain</Link>
        <Link href="/docs/database" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Database →</Link>
      </div>
    </div>
  );
}
