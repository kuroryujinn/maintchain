import Link from 'next/link';

export default function DocsRoadmap() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">12</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Roadmap</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Implemented features versus planned milestones.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#16a34a]">✅ Implemented</h2>
        <div className="space-y-2">
          {[
            '5 Soroban smart contracts deployed on Stellar Testnet',
            'Axum REST backend with PostgreSQL',
            'Next.js 14 frontend with 25 routes',
            'Freighter wallet integration',
            'SEP-53 challenge-response authentication',
            'Multi-party approval workflow on-chain',
            'Compliance attestation with certificate issuance',
            'Identity verification (IdentityRegistry contract)',
            'Evidence upload with SHA-256 hashing',
            'Mobile responsive UI',
            'GlitchTip error tracking',
            'User feedback collection',
            'CI/CD pipeline with GitHub Actions',
            'Lighthouse CI performance audits',
            'Production smoke tests',
          ].map((item) => (
            <div key={item} className="glass p-3 flex items-center gap-2">
              <span className="text-[#16a34a] text-sm">✅</span>
              <span className="text-sm text-[#0f172a]">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#d97706]">🗺️ Planned</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Quarter</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Milestone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Q3 2026', 'First real-user onboarding wave; production evidence storage (IPFS/S3)'],
                ['Q4 2026', 'IPFS/Arweave production storage; certificate verification portal; mobile app alpha'],
                ['Q1 2027', 'Mobile app (React Native); Stellar mainnet deployment'],
                ['Q2 2027', 'Enterprise SSO, custom audit rules engine, API marketplace'],
              ].map(([quarter, milestone]) => (
                <tr key={quarter}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{quarter}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{milestone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/troubleshooting" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Troubleshooting</Link>
        <Link href="/docs/routes" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Application Routes →</Link>
      </div>
    </div>
  );
}
