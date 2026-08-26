import Link from 'next/link';

export default function DocsDeployment() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">08</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Deployment</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Hosting, configuration, and deployment process.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Infrastructure</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Platform</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Frontend', 'Vercel', 'https://maintchain.vercel.app'],
                ['Backend', 'Render', 'Docker container'],
                ['Database', 'Supabase', 'PostgreSQL 16'],
                ['Contracts', 'Stellar Testnet', '5 Soroban contracts'],
                ['Error Tracking', 'GlitchTip', 'Sentry-compatible'],
              ].map(([service, platform, url]) => (
                <tr key={service}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{service}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{platform}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b] font-mono">{url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">render.yaml Configuration</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          The backend uses Render Blueprints for infrastructure-as-code.
          Secret variables use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">sync: false</code> to
          keep credentials out of source control.
        </p>
        <div className="glass p-4 space-y-2">
          <p className="text-xs text-[#64748b]">Variables in render.yaml (declarative):</p>
          <ul className="list-disc list-inside text-xs text-[#64748b] space-y-1">
            <li>RUST_LOG, SOROBAN_HELPER_PATH, SOROBAN_RPC_URL</li>
            <li>GLITCHTIP_DSN, GLITCHTIP_ENVIRONMENT</li>
          </ul>
          <p className="mt-2 text-xs text-[#64748b]">Variables managed via Dashboard (sync: false):</p>
          <ul className="list-disc list-inside text-xs text-[#64748b] space-y-1">
            <li>DATABASE_URL, MAINTCHAIN_API_KEY, ALLOWED_ORIGINS</li>
            <li>SOROBAN_NETWORK_PASSPHRASE</li>
            <li>APPROVAL_CONTRACT_ID, RECORDS_CONTRACT_ID, ATTESTATION_CONTRACT_ID, IDENTITY_REGISTRY_CONTRACT_ID</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">CI/CD Pipeline</h2>
        <div className="glass p-4 space-y-2">
          <p className="text-xs text-[#64748b]">GitHub Actions workflows:</p>
          <ul className="list-disc list-inside text-xs text-[#64748b] space-y-1">
            <li><strong>ci.yml</strong> — TypeScript lint + test + build, Rust check + build, contract tests</li>
            <li><strong>deploy.yml</strong> — Vercel prebuilt flow on push to main</li>
            <li><strong>lighthouse.yml</strong> — Performance/SEO audits on PRs</li>
            <li><strong>production-smoke.yml</strong> — HTTP + Playwright smoke tests against production</li>
          </ul>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/database" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Database</Link>
        <Link href="/docs/testing" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Testing →</Link>
      </div>
    </div>
  );
}
