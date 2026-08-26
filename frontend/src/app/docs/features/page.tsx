import Link from 'next/link';

export default function DocsFeatures() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">02</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Features</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Complete inventory of every implemented feature in MaintChain.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Core Application Features</h2>
        <div className="space-y-3">
          {[
            { name: 'User Registration', desc: 'Web-based registration with wallet connect and role selection (Technician, Supervisor, Auditor, Owner).', status: '✅ Implemented', route: '/register' },
            { name: 'Wallet Connection', desc: 'Freighter browser extension integration with balance display and network verification.', status: '✅ Implemented', route: '/dashboard' },
            { name: 'Identity Verification', desc: '7-stage on-chain identity verification via IdentityRegistry Soroban contract.', status: '✅ Implemented', route: '/get-verified' },
            { name: 'Worker Discovery', desc: 'Search, filter, and sort workers by trust score, experience, and availability.', status: '✅ Implemented', route: '/workers' },
            { name: 'Machine Passports', desc: 'Machine registry with event timeline, certificates, and maintenance history.', status: '✅ Implemented', route: '/machines' },
            { name: 'Evidence Upload', desc: 'File upload with SHA-256 hashing and on-chain evidence storage.', status: '✅ Implemented', route: '/upload' },
            { name: 'Supervisor Approval', desc: 'On-chain approval via MultiPartyApproval Soroban contract, mirrored to backend.', status: '✅ Implemented', route: '/approve' },
            { name: 'Audit Trail', desc: 'Visual audit timeline with certificate issuance workflow.', status: '✅ Implemented', route: '/audit' },
            { name: 'Compliance Certificates', desc: 'On-chain certificate registry with approval chain verification.', status: '✅ Implemented', route: '/certificates' },
            { name: 'Leaderboard', desc: 'Global trust rankings based on verified work history.', status: '✅ Implemented', route: '/leaderboard' },
            { name: 'Industry Coverage', desc: 'Industry-specific pages showing MaintChain applicability.', status: '✅ Implemented', route: '/industries' },
            { name: 'Dashboard', desc: 'Worker dashboard with trust score, weekly rank, and activity metrics.', status: '✅ Implemented', route: '/dashboard' },
            { name: 'Feedback Collection', desc: 'Star ratings, category selection, and structured feedback forms.', status: '✅ Implemented', route: '/feedback' },
            { name: 'Live Network Feed', desc: 'Real-time activity feed with filtering and transaction visibility.', status: '✅ Implemented', route: '/live-network' },
            { name: 'User Directory', desc: 'Registered user list with role badges and search/filter.', status: '✅ Implemented', route: '/users' },
          ].map((feature) => (
            <div key={feature.name} className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#0f172a]">{feature.name}</h3>
                  <span className="text-xs text-[#16a34a] font-medium">{feature.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{feature.desc}</p>
              </div>
              <Link href={feature.route} className="text-xs text-[#2563eb] hover:underline whitespace-nowrap">
                {feature.route} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Authentication & Security</h2>
        <div className="space-y-3">
          {[
            { name: 'SEP-53 Challenge-Response', desc: 'Wallet signature verification using Stellar SEP-53 standard.' },
            { name: 'HMAC Session Cookies', desc: 'HttpOnly Secure session cookies for authenticated API requests.' },
            { name: 'Two-Layer Auth', desc: 'Server-to-server API key + per-user wallet session authentication.' },
            { name: 'Identity Middleware', desc: 'Backend middleware enforcing wallet ownership on registration and operations.' },
          ].map((feature) => (
            <div key={feature.name} className="glass p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#0f172a]">{feature.name}</h3>
                <span className="text-xs text-[#16a34a] font-medium">✅ Implemented</span>
              </div>
              <p className="mt-1 text-xs text-[#64748b]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Smart Contracts</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Contract</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Purpose</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['EquipmentRegistry', 'Equipment registration + versioned snapshots', '✅ Deployed'],
                ['MaintenanceRecords', 'Maintenance order state machine', '✅ Deployed'],
                ['MultiPartyApproval', 'Approval bitmap (tech × supervisor × auditor)', '✅ Deployed'],
                ['ComplianceAttestation', 'Final certificate issuance', '✅ Deployed'],
                ['IdentityRegistry', 'Identity verification per wallet', '✅ Deployed'],
              ].map(([name, purpose, status]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a] font-mono">{name}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{purpose}</td>
                  <td className="px-4 py-2.5 text-sm text-[#16a34a]">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/overview" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Overview</Link>
        <Link href="/docs/getting-started" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Getting Started →</Link>
      </div>
    </div>
  );
}
