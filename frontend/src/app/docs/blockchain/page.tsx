import Link from 'next/link';

export default function DocsBlockchain() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">05</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Blockchain</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Stellar Soroban contracts, deployment, and transaction lifecycle.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Stellar Network</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain runs on <strong>Stellar Testnet</strong> — a public testing network with no real monetary value.
          All transactions use test XLM obtained from the Friendbot faucet.
        </p>
        <div className="glass p-4">
          <p className="text-sm text-[#0f172a] font-medium">Network Configuration</p>
          <p className="mt-1 text-xs text-[#64748b] font-mono">Network: Test SDF Network ; September 2015</p>
          <p className="text-xs text-[#64748b] font-mono">RPC: https://soroban-testnet.stellar.org</p>
          <p className="text-xs text-[#64748b] font-mono">Explorer: https://stellar.expert/explorer/testnet</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Deployed Contracts</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Contract</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Address</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Key Methods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['IdentityRegistry', 'CA2CSUN5T4ZJZHQ562XFHB2WVSGE2E7KS4NJ2SBFJM6CLRZIFLJP4EMC', 'verify_identity, is_verified, get_verification'],
                ['MultiPartyApproval', 'CDGJ6VX3TG4M66SBFS5LCBPTF26GEFRZXXAYNYAWYRYHG2WDJ7UYAZSC', 'approve_by_technician, approve_by_supervisor, approve_by_auditor, verify'],
                ['EquipmentRegistry', 'CBTOLJE5FVYO4Y473OIZIBX3OAAZAKCRODZ4LI56Q5UYMQTXRUSVC2EO', 'register_equipment, update_owner, get_equipment'],
                ['MaintenanceRecords', 'CDZ324UZJCIKG32YKY4MFZX5AO63VXCK73NO5QS3QI3256UDBYR5LP6M', 'create_record, submit_evidence, update_status, get_record'],
                ['ComplianceAttestation', 'CDDMPFXM3DMXZBMKBQR4UBSOXB5XZIDLVAJGX3L7D4C6TTFXGKY7EGU2', 'issue_certificate, get_attestation'],
              ].map(([name, addr, methods]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a] font-mono">{name}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b] font-mono break-all">{addr.slice(0, 12)}...{addr.slice(-8)}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b]">{methods}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Transaction Lifecycle</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Every on-chain transaction follows this lifecycle:
        </p>
        <div className="glass p-4 font-mono text-xs text-[#0f172a] overflow-x-auto">
          <pre>{`1. Simulate → Build transaction envelope
2. Sign     → User approves in Freighter wallet
3. Submit   → Transaction sent to Soroban RPC
4. Poll     → getTransaction up to 15 times (15s timeout)
5. Confirm  → Transaction confirmed on-ledger
6. Mirror   → Result stored in backend database`}</pre>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Backend Integration</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          The backend is <strong>verify-only</strong> — it never signs or submits transactions.
          All state-changing operations are initiated by the user&apos;s Freighter wallet.
          The backend only simulates read-only contract calls via native Rust RPC.
        </p>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/architecture" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← Architecture</Link>
        <Link href="/docs/api" className="text-sm text-slate-500 hover:text-[#2563eb] transition">API Reference →</Link>
      </div>
    </div>
  );
}
