'use client';

import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import { CheckCircle2, ExternalLink, Loader2, UserPlus, Wallet, AlertCircle } from 'lucide-react';

const ROLES = [
  { value: 'technician', label: 'Technician', description: 'Field worker who performs maintenance and submits evidence' },
  { value: 'supervisor', label: 'Supervisor', description: 'Site-level manager who verifies evidence and approves work' },
  { value: 'auditor', label: 'Auditor', description: 'Compliance officer who issues final certificates' },
  { value: 'owner', label: 'Equipment Owner', description: 'Company that owns industrial equipment' },
  { value: 'regulator', label: 'Regulator / Inspector', description: 'External party who verifies compliance' },
];

export default function RegisterPage() {
  const { isConnected, address, connectWallet } = useSoroban();

  const [name, setName] = useState('');
  const [role, setRole] = useState('technician');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; address: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError('Please connect your Stellar wallet first.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.registerUser({
        stellar_address: address,
        name: name.trim(),
        role,
        organization: organization.trim() || undefined,
      });
      setSuccess({ id: result.id, address: result.stellar_address || address });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
        <EditorialSectionHeader
          number="01"
          title="Welcome to MaintChain!"
          caption="Registration · Your account is ready"
        />

        <FadeInView direction="up" distance="sm" duration={500} className="glass p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">
            Registration Complete
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Your Stellar wallet has been linked to your MaintChain profile. You can now participate in the compliance network.
          </p>

          <div className="mt-8 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Wallet Address</span>
              <span className="font-mono text-xs text-[var(--text-primary)]">
                {success.address.slice(0, 8)}...{success.address.slice(-6)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Role</span>
              <StatusBadge tone="info">{role.charAt(0).toUpperCase() + role.slice(1)}</StatusBadge>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Dashboard <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white"
            >
              Upload Evidence
            </a>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left">
            <h4 className="text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold">📋 Next Steps</h4>
            <ol className="mt-3 space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Complete the <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">User Feedback Form</a> to help us improve</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>Explore the platform — try uploading evidence or approving work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Share MaintChain with colleagues and grow the network</span>
              </li>
            </ol>
          </div>
        </FadeInView>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
      <EditorialSectionHeader
        number="01"
        title="Join the Compliance Network"
        caption="Register · Link your Stellar wallet to create your MaintChain identity"
      />

      <FadeInView direction="up" distance="sm" duration={500} className="glass p-8">
        {!isConnected ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Wallet className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
              Connect Your Wallet
            </h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              You need a Stellar wallet to register on MaintChain. Connect via Freighter to get started.
            </p>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="text-xs text-amber-800">
                <strong>Don&apos;t have Freighter?</strong> Install the{' '}
                <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                  Freighter browser extension
                </a>
                , create a wallet on Stellar Testnet, and fund it via{' '}
                <a href="https://lab.stellar.org/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                  Stellar Lab Friendbot
                </a>
                .
              </p>
            </div>

            <button
              onClick={connectWallet}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Connected Wallet
                  </div>
                  <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                  </div>
                </div>
                <StatusBadge tone="verified">Connected</StatusBadge>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
                Role
              </label>
              <div className="grid gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                      role === r.value
                        ? 'border-[var(--primary)] bg-blue-50'
                        : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]'
                    }`}
                  >
                    <div className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      role === r.value
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--text-tertiary)]'
                    }`}>
                      {role === r.value && (
                        <div className="h-full w-full rounded-full bg-white scale-[0.35]" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{r.label}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">{r.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
                Organization (optional)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., NordWerk Manufacturing"
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Register on MaintChain
                </>
              )}
            </button>

            <p className="text-center text-xs text-[var(--text-tertiary)]">
              By registering, you agree to link your Stellar wallet to your MaintChain profile.
            </p>
          </form>
        )}
      </FadeInView>
    </div>
  );
}
