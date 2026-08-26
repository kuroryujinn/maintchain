import Link from 'next/link';

export default function DocsDatabase() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-number">07</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0f172a] tracking-tight">Database</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          PostgreSQL schema, entities, and migration history.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Technology</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          MaintChain uses <strong>PostgreSQL 16</strong> via Supabase (connection pooler).
          The backend uses <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">sqlx</code> for
          direct SQL queries (no ORM).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Core Entities</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Table</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Purpose</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Key Fields</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['users', 'Registered user profiles', 'id, stellar_address, name, role, organization'],
                ['equipment', 'Registered equipment/machines', 'id, owner_id, serial_number, name, location'],
                ['maintenance_records', 'Maintenance orders and status', 'id, equipment_id, technician_id, status, evidence_hash'],
                ['approvals', 'Supervisor/auditor decisions', 'maintenance_id, approver_id, role, decision'],
                ['user_verifications', 'On-chain identity records', 'user_id, stellar_address, verification_tx_hash'],
                ['audit_log', 'Transaction log entries', 'hash, status, contract_id, method'],
              ].map(([table, purpose, fields]) => (
                <tr key={table}>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#0f172a] font-mono">{table}</td>
                  <td className="px-4 py-2.5 text-sm text-[#64748b]">{purpose}</td>
                  <td className="px-4 py-2.5 text-xs text-[#64748b] font-mono">{fields}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Migration History</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          Migrations are stored in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">backend/migrations/</code> and
          run automatically on backend startup via <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">sqlx::migrate!</code>.
        </p>
        <div className="glass p-4 space-y-2">
          {[
            '0001_initial.sql — Users, equipment, maintenance_records',
            '0002_approvals.sql — Approval tracking table',
            '0003_audit_log.sql — Audit trail logging',
            '0004_user_verifications.sql — On-chain verification records',
            '0005_transaction_log.sql — Transaction log for tx status tracking',
            '0006_role_constraint.sql — Role CHECK constraint (TECHNICIAN, SUPERVISOR, AUDITOR, OWNER)',
            '0007_add_note_to_approvals.sql — Decision note field',
            '0008_add_fk_to_approvals.sql — Foreign key on approver_id',
          ].map((m) => (
            <p key={m} className="text-xs text-[#64748b] font-mono">{m}</p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0f172a]">Connection Configuration</h2>
        <div className="glass p-4">
          <p className="text-xs text-[#64748b]">Environment variable: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">DATABASE_URL</code></p>
          <p className="mt-1 text-xs text-[#64748b]">Also supports: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">POSTGRES_URL</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">SUPABASE_Connection_STRING</code></p>
          <p className="mt-1 text-xs text-[#64748b]">The backend appends <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">?sslmode=require</code> if not present.</p>
        </div>
      </section>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
        <Link href="/docs/api" className="text-sm text-slate-500 hover:text-[#2563eb] transition">← API Reference</Link>
        <Link href="/docs/deployment" className="text-sm text-slate-500 hover:text-[#2563eb] transition">Deployment →</Link>
      </div>
    </div>
  );
}
