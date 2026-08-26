import Link from 'next/link';

export default function DocsRoutes() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">13</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Application Routes</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Technical reference of every route in the MaintChain application.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Route Summary</h2>
        <div className="glass p-4">
          <p className="text-sm text-[#0f172a]">
            <strong>25 total routes</strong> — 22 static, 3 dynamic
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            8 primary navigation · 7 secondary discovery · 10 contextual/footer
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Primary Navigation</h2>
        <p className="text-sm text-[#64748b]">High-frequency pages displayed as text links in the top bar (XL screens).</p>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Route</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Page</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['/', 'Landing Page', 'Public'],
                ['/live-network', 'Live Network Feed', 'Public'],
                ['/workers', 'Worker Discovery', 'Public'],
                ['/machines', 'Machine Registry', 'Public'],
                ['/leaderboard', 'Trust Rankings', 'Public'],
                ['/certificates', 'Certificate Browser', 'Public'],
                ['/industries', 'Industry Categories', 'Public'],
                ['/dashboard', 'User Dashboard', 'Public'],
              ].map(([route, page, auth]) => (
                <tr key={route}>
                  <td className="px-4 py-2.5 text-sm font-mono text-[#2563eb]">{route}</td>
                  <td className="px-4 py-2.5 text-sm text-[#0f172a]">{page}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]">{auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Secondary Discovery</h2>
        <p className="text-sm text-[#64748b]">Uncommon/workflow pages displayed as pill tabs below the nav bar.</p>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Route</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Page</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['/upload', 'Evidence Upload', 'Session required'],
                ['/approve', 'Approval Center', 'Session required'],
                ['/audit', 'Audit Trail', 'Session required'],
                ['/technician', 'Technician Tasks', 'Session required'],
                ['/register', 'User Registration', 'Session required'],
                ['/users', 'User Directory', 'Session required'],
                ['/feedback', 'Feedback Form', 'Public'],
              ].map(([route, page, auth]) => (
                <tr key={route}>
                  <td className="px-4 py-2.5 text-sm font-mono text-[#2563eb]">{route}</td>
                  <td className="px-4 py-2.5 text-sm text-[#0f172a]">{page}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]">{auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Other Routes</h2>
        <p className="text-sm text-[#64748b]">Contextual, footer, and utility routes.</p>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Route</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Page</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Entry Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['/get-verified', 'Identity Verification', 'Hero CTA + Landing CTA'],
                ['/technical-preview', 'Technical Preview Guide', 'Hero badge + Banner'],
                ['/analytics', 'Analytics Dashboard', 'No nav entry (utility)'],
                ['/docs', 'Documentation Portal', 'Footer + Docs header'],
                ['/contact', 'Contact Page', 'Footer'],
                ['/privacy', 'Privacy Policy', 'Footer'],
                ['/terms', 'Terms of Service', 'Footer'],
              ].map(([route, page, entry]) => (
                <tr key={route}>
                  <td className="px-4 py-2.5 text-sm font-mono text-[#2563eb]">{route}</td>
                  <td className="px-4 py-2.5 text-sm text-[#0f172a]">{page}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]">{entry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Dynamic Routes</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Route</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Page</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Parameter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['/workers/[slug]', 'Worker Profile', 'slug (e.g., elena-fischer)'],
                ['/machines/[id]', 'Machine Passport', 'id (e.g., MCH-1104)'],
                ['/certificates/[id]', 'Certificate Detail', 'id (e.g., CERT-DE-4471)'],
              ].map(([route, page, param]) => (
                <tr key={route}>
                  <td className="px-4 py-2.5 text-sm font-mono text-[#2563eb]">{route}</td>
                  <td className="px-4 py-2.5 text-sm text-[#0f172a]">{page}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b] font-mono">{param}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/roadmap" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Roadmap</Link>
        <Link href="/docs" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Documentation →</Link>
      </div>
    </div>
  );
}
