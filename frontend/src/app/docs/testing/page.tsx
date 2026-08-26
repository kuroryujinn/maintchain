import Link from 'next/link';

export default function DocsTesting() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">09</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Testing</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Test suites, coverage, and verification results.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Test Results</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Suite</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Passed</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Failed</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Skipped</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">Frontend unit tests (vitest)</td>
                <td className="px-4 py-2.5 text-sm text-[#16a34a] font-semibold">23</td>
                <td className="px-4 py-2.5 text-sm text-[#16a34a]">0</td>
                <td className="px-4 py-2.5 text-sm text-[#64748b]">16</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">Contract tests (snapshot)</td>
                <td className="px-4 py-2.5 text-sm text-[#16a34a] font-semibold">31</td>
                <td className="px-4 py-2.5 text-sm text-[#16a34a]">0</td>
                <td className="px-4 py-2.5 text-sm text-[#64748b]">0</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-2.5 text-sm font-bold text-[#0f172a]">Total</td>
                <td className="px-4 py-2.5 text-sm font-bold text-[#16a34a]">54</td>
                <td className="px-4 py-2.5 text-sm font-bold text-[#16a34a]">0</td>
                <td className="px-4 py-2.5 text-sm text-[#64748b]">16</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#64748b]">
          The 16 skipped tests are API smoke tests that require <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">SMOKE_BASE_URL</code> to be set.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Running Tests</h2>
        <div className="glass p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-[#0f172a] mb-1">Frontend tests</p>
            <code className="block bg-slate-900 text-green-400 text-xs p-3 rounded-lg font-mono overflow-x-auto">cd frontend && npm test</code>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0f172a] mb-1">Contract tests</p>
            <code className="block bg-slate-900 text-green-400 text-xs p-3 rounded-lg font-mono overflow-x-auto">cd contracts && cargo test</code>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0f172a] mb-1">Build verification</p>
            <code className="block bg-slate-900 text-green-400 text-xs p-3 rounded-lg font-mono overflow-x-auto">cd frontend && npm run build</code>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0f172a] mb-1">Smoke tests (requires live deployment)</p>
            <code className="block bg-slate-900 text-green-400 text-xs p-3 rounded-lg font-mono overflow-x-auto">SMOKE_BASE_URL=https://maintchain.vercel.app npm test</code>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Frontend Test Files</h2>
        <div className="glass p-4 space-y-1">
          {[
            'src/lib/roles.test.ts — Role constants match DB constraint (4 tests)',
            'src/lib/soroban-xdr.test.ts — XDR encoding helpers (2 tests)',
            'src/lib/registration-error.test.ts — 409 duplicate detection (7 tests)',
            'src/hooks/useTransactionState.test.ts — Tx state machine (6 tests)',
            'src/lib/tx-status-handler.test.ts — On-chain failure handling (4 tests)',
          ].map((t) => (
            <p key={t} className="text-xs text-[#64748b]">{t}</p>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/deployment" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Deployment</Link>
        <Link href="/docs/security" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Security →</Link>
      </div>
    </div>
  );
}
