import Link from 'next/link';

export default function DocsSecurity() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">10</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Security</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Authentication, authorization, and security mechanisms.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Authentication Layers</h2>
        <div className="glass p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-[#2563eb] mt-0.5">Layer 1</span>
            <div>
              <p className="text-sm font-medium text-[#0f172a]">Server-to-Server API Key</p>
              <p className="text-xs text-[#64748b]">MAINTCHAIN_API_KEY injected as Bearer token by the Next.js proxy.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-[#2563eb] mt-0.5">Layer 2</span>
            <div>
              <p className="text-sm font-medium text-[#0f172a]">Per-User Wallet Session</p>
              <p className="text-xs text-[#64748b]">SEP-53 challenge-response → HMAC-signed HttpOnly cookie.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Wallet Authentication</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Freighter v6&apos;s signMessage follows SEP-53 (Sign and Verify Messages).
          The backend verifies the signature using Ed25519 verification.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">CORS Configuration</h2>
        <div className="glass p-4">
          <p className="text-xs text-[#64748b]">
            CORS is restricted to an explicit <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">ALLOWED_ORIGINS</code> allow-list.
            Only GET and POST methods are allowed. Authorization and Content-Type headers are permitted.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Content Security Policy</h2>
        <div className="glass p-4">
          <p className="text-xs text-[#64748b]">
            CSP headers restrict script sources, frame embedding, and connection origins.
            GlitchTip/Sentry is tunneled via /monitoring (same-origin).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Secret Management</h2>
        <div className="glass p-4 space-y-2">
          <p className="text-xs text-[#64748b]">Secrets are managed through:</p>
          <ul className="list-disc list-inside text-xs text-[#64748b] space-y-1">
            <li>Render Dashboard (DATABASE_URL, API keys, contract IDs)</li>
            <li>Vercel Environment Variables (AUTH_SECRET, API keys)</li>
            <li>render.yaml with sync: false (documents required vars without exposing values)</li>
          </ul>
          <p className="mt-2 text-xs text-[#64748b]">
            <strong>Never committed:</strong> .env files, private keys, database passwords, API secrets.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Blockchain Verification</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          All on-chain operations are initiated by the user&apos;s Freighter wallet.
          The backend is verify-only — it simulates read-only contract calls and never signs transactions.
          This prevents the backend from being a single point of trust.
        </p>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/testing" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Testing</Link>
        <Link href="/docs/troubleshooting" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Troubleshooting →</Link>
      </div>
    </div>
  );
}
