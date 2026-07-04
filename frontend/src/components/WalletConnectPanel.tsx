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
              <span className="font-mono text-sm text-slate-900">{truncatedAddress}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Connect Freighter
          </button>
        )}
      </div>
    );
  }

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur ${className}`.trim()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Wallet</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Freighter connection</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
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
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Connect Freighter
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {isConnected ? 'Connected' : 'Waiting for wallet'}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{truncatedAddress || 'No address yet'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Balance</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{balanceXlm ?? '0'} XLM</p>
          <p className="mt-1 text-xs text-slate-500">{balanceError ? balanceError : 'Testnet balance from Horizon'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Network</p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {networkError ? 'Needs attention' : 'Stellar Testnet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">{networkError?.message ?? 'Ready for contract approvals'}</p>
        </div>
      </div>
    </section>
  );
}