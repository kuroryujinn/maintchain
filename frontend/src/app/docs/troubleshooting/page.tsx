import Link from 'next/link';

export default function DocsTroubleshooting() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">11</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Troubleshooting</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Common issues and their solutions.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Wallet Issues</h2>
        <div className="space-y-3">
          {[
            { problem: 'Freighter not found', solution: 'Install the Freighter browser extension from freighter.app and refresh the page.' },
            { problem: 'Network mismatch', solution: 'Set Freighter to Testnet: Settings → Network → Testnet.' },
            { problem: 'Account not found', solution: 'Fund your account via Stellar Lab Friendbot (lab.stellar.org).' },
            { problem: 'Connection popup doesn\'t appear', solution: 'Check your browser\'s popup blocker settings.' },
          ].map((item) => (
            <div key={item.problem} className="glass p-4">
              <p className="text-sm font-semibold text-[#dc2626]">{item.problem}</p>
              <p className="mt-1 text-xs text-[#64748b]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Authentication Issues</h2>
        <div className="space-y-3">
          {[
            { problem: 'Signature Rejected', solution: 'You declined the transaction in Freighter. Re-approve on retry.' },
            { problem: 'Session expired', solution: 'Reconnect your wallet and approve the signature challenge again.' },
            { problem: 'Already Registered', solution: 'Your wallet already has a profile. Use the Dashboard or Get Verified.' },
          ].map((item) => (
            <div key={item.problem} className="glass p-4">
              <p className="text-sm font-semibold text-[#dc2626]">{item.problem}</p>
              <p className="mt-1 text-xs text-[#64748b]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Blockchain Issues</h2>
        <div className="space-y-3">
          {[
            { problem: 'Simulation Failed', solution: 'The contract call simulation failed. Check that the contract is deployed and the ID is correct.' },
            { problem: 'Confirmation Timeout', solution: 'Transaction submitted but not confirmed within 15s. Check Stellar Expert via the shown hash.' },
            { problem: 'Balance shows 0 XLM', solution: 'Use Friendbot to get free test tokens.' },
          ].map((item) => (
            <div key={item.problem} className="glass p-4">
              <p className="text-sm font-semibold text-[#dc2626]">{item.problem}</p>
              <p className="mt-1 text-xs text-[#64748b]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">API Issues</h2>
        <div className="space-y-3">
          {[
            { problem: '401 Unauthorized', solution: 'Your session has expired. Reconnect your wallet and approve the signature.' },
            { problem: '502 Bad Gateway', solution: 'The backend may be restarting. Wait a moment and retry.' },
            { problem: 'Backend Unavailable', solution: 'The backend may be down. Check the /health endpoint.' },
          ].map((item) => (
            <div key={item.problem} className="glass p-4">
              <p className="text-sm font-semibold text-[#dc2626]">{item.problem}</p>
              <p className="mt-1 text-xs text-[#64748b]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Local Development Issues</h2>
        <div className="space-y-3">
          {[
            { problem: 'Contract Not Configured', solution: 'Set NEXT_PUBLIC_IDENTITY_REGISTRY_ID in frontend/.env.local after deploying contracts.' },
            { problem: 'DATABASE_URL not set', solution: 'Set DATABASE_URL in backend/.env or as an environment variable.' },
            { problem: 'AUTH_SECRET not set', solution: 'Set AUTH_SECRET in Vercel environment variables for production.' },
          ].map((item) => (
            <div key={item.problem} className="glass p-4">
              <p className="text-sm font-semibold text-[#dc2626]">{item.problem}</p>
              <p className="mt-1 text-xs text-[#64748b]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/security" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Security</Link>
        <Link href="/docs/roadmap" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Roadmap →</Link>
      </div>
    </div>
  );
}
