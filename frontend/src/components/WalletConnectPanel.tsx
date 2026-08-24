'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, ShieldAlert, Loader2, User } from 'lucide-react';

import { useSoroban } from '@/hooks/useSoroban';
import { api } from '@/lib/api';
import type { UserResponse } from '@/lib/api-types';

type WalletConnectPanelProps = {
  compact?: boolean;
  className?: string;
};

export default function WalletConnectPanel({ compact = false, className = '' }: WalletConnectPanelProps) {
  const {
    address,
    balanceXlm,
    balanceError,
    connectWallet,
    disconnectWallet,
    freighterInstalled,
    isConnected,
    networkError,
    sessionVerified,
    sessionVerifying,
    sessionError,
  } = useSoroban();

  const [userName, setUserName] = useState<string | null>(null);

  // Fetch the user's registered name when connected
  useEffect(() => {
    if (!isConnected || !address) {
      setUserName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user: UserResponse = await api.getUserByStellar(address);
        if (!cancelled) setUserName(user.name);
      } catch {
        // 404 = not registered yet; any other error = ignore
        if (!cancelled) setUserName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address]);

  const truncatedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [address]);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        {isConnected ? (
          <>
            {/* Session verification indicator */}
            <div className="hidden sm:flex items-center">
              {sessionVerified ? (
                <span
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                  title="Session verified — your wallet signature has been validated"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Verified</span>
                </span>
              ) : sessionVerifying ? (
                <span
                  className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
                  aria-label="Verifying wallet session"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </span>
              ) : sessionError ? (
                <span
                  className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"
                  title={sessionError}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Auth failed</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                  <span>No session</span>
                </span>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-end text-right">
              {userName && (
                <span className="text-xs font-medium text-white/80">{userName}</span>
              )}
              <span className="font-mono text-xs text-white/60">{truncatedAddress}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/10"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
          >
            Connect Freighter
          </button>
        )}
      </div>
    );
  }

  return (
    <section className={`glass p-6 ${className}`.trim()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Wallet</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Freighter connection</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Connect a Stellar Testnet account with Freighter to approve records and submit Soroban contract calls.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!freighterInstalled && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              Freighter not detected
            </span>
          )}

          {isConnected ? (
            <button
              onClick={disconnectWallet}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--text-secondary)]"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)]"
            >
              Connect Freighter
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Status</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {isConnected ? 'Connected' : 'Waiting for wallet'}
          </p>
          {userName && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
              <User className="h-3 w-3 text-[var(--text-secondary)]" />
              {userName}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{truncatedAddress || 'No address yet'}</p>
        </div>

        <div className="glass p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Balance</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{balanceXlm ?? '0'} XLM</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{balanceError ? balanceError : 'Testnet balance from Horizon'}</p>
        </div>

        <div className="glass p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Network</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {networkError ? 'Needs attention' : 'Stellar Testnet'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{networkError?.message ?? 'Ready for contract approvals'}</p>
        </div>
      </div>
    </section>
  );
}