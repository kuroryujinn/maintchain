'use client';

import { useMemo } from 'react';

import { useSoroban } from '@/hooks/useSoroban';

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
  } = useSoroban();

  const truncatedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [address]);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        {isConnected ? (
          <>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Freighter</span>
              <span className="font-mono text-sm text-white/90">{truncatedAddress}</span>
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