import Link from 'next/link';

export default function DocsGettingStarted() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">03</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Getting Started</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Step-by-step guide for new users to access and use MaintChain.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">1. Access MaintChain</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Open <a href="https://maintchain.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">maintchain.vercel.app</a> in your browser.
          The landing page shows the Trust Network overview, statistics, and navigation.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">2. Install Freighter Wallet</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Freighter is a browser extension wallet for the Stellar network. Install it from{' '}
          <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">freighter.app</a>.
        </p>
        <div className="glass p-4 space-y-2">
          <p className="text-sm text-[#0f172a] font-medium">Steps:</p>
          <ol className="list-decimal list-inside text-sm text-[#64748b] space-y-1">
            <li>Visit freighter.app and click &quot;Install Freighter&quot;</li>
            <li>Add the extension to your browser</li>
            <li>Create a new wallet and save your recovery phrase</li>
            <li>Set a password</li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">3. Fund Your Testnet Account</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain runs on Stellar Testnet (not real money). Use the Friendbot to get free test tokens:
        </p>
        <div className="glass p-4 space-y-2">
          <ol className="list-decimal list-inside text-sm text-[#64748b] space-y-1">
            <li>Copy your Stellar public address from Freighter (starts with G...)</li>
            <li>Open <a href="https://lab.stellar.org/" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">Stellar Lab Friendbot</a></li>
            <li>Paste your address and click &quot;Get test network lumens&quot;</li>
            <li>You&apos;ll receive 10,000 test XLM</li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">4. Connect to MaintChain</h2>
        <div className="glass p-4 space-y-2">
          <ol className="list-decimal list-inside text-sm text-[#64748b] space-y-1">
            <li>Open <a href="https://maintchain.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">MaintChain</a></li>
            <li>Click &quot;Connect Freighter&quot; in the top navigation</li>
            <li>Approve the Freighter connection popup</li>
            <li>Approve the signature challenge (creates your session)</li>
          </ol>
        </div>
        <p className="text-xs text-[#64748b]">
          <strong>Important:</strong> Ensure Freighter is set to <strong>TESTNET</strong> network.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">5. Register Your Account</h2>
        <div className="glass p-4 space-y-2">
          <ol className="list-decimal list-inside text-sm text-[#64748b] space-y-1">
            <li>Go to <a href="/register" className="text-[#2563eb] hover:underline">/register</a></li>
            <li>Enter your full name</li>
            <li>Select your role (Technician, Supervisor, Auditor, or Owner)</li>
            <li>Add your organization (optional)</li>
            <li>Click &quot;Register on MaintChain&quot;</li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">6. Get Verified (On-Chain Identity)</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Get Verified writes your identity to the on-chain IdentityRegistry contract:
        </p>
        <div className="glass p-4 space-y-2">
          <ol className="list-decimal list-inside text-sm text-[#64748b] space-y-1">
            <li>Go to <a href="/get-verified" className="text-[#2563eb] hover:underline">/get-verified</a> and click &quot;Start Verification&quot;</li>
            <li>Connect Freighter and approve the signature challenge</li>
            <li>Review your identity details</li>
            <li>Click &quot;Sign Verification Transaction&quot;</li>
            <li>Approve in Freighter (pays small testnet XLM for gas)</li>
            <li>Success screen with transaction hash and Stellar Expert link</li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">7. Explore the Application</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Once registered, explore based on your role:
        </p>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Start Here</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">What You&apos;ll Do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Technician', '/upload', 'Upload maintenance evidence, submit hashes on-chain'],
                ['Supervisor', '/approve', 'Accept or reject maintenance records'],
                ['Auditor', '/audit', 'Review audit trails, issue compliance certificates'],
                ['General', '/dashboard', 'View compliance metrics and reports'],
                ['Discovery', '/workers, /machines', 'Browse network data and discover professionals'],
              ].map(([role, start, action]) => (
                <tr key={role}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a]">{role}</td>
                  <td className="px-4 py-2.5 text-sm text-[#2563eb] font-mono">{start}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/features" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Features</Link>
        <Link href="/docs/architecture" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Architecture →</Link>
      </div>
    </div>
  );
}
