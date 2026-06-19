'use client';
import { useMemo, useState } from 'react';
import { useSoroban } from '@/hooks/useSoroban';

export default function ComplianceDashboard() {
  const {
    address,
    connectWallet,
    disconnectWallet,
    isConnected,
    walletError,

    networkOk,
    networkError,

    balanceLoading,
    balanceXlm,
    balanceError,

    sendLoading,
    sendXlm,
    txHash,
    sendError,
  } = useSoroban();

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('1');

  const truncatedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [address]);

  const canSend = isConnected && networkOk && !!destination && Number(amount) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>

        {!isConnected ? (
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">
              Connected: <span className="font-mono">{truncatedAddress}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Disconnect
            </button>
          </div>
        )}
      </header>

      {(walletError || networkError) && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          <div className="font-semibold">Wallet error</div>
          <div className="text-sm mt-1">{walletError?.message ?? networkError?.message}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-500 mb-2">XLM Balance (Testnet)</h3>
          {balanceLoading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : balanceError ? (
            <p className="text-sm text-red-700">{balanceError}</p>
          ) : (
            <p className="text-2xl font-bold">
              {balanceXlm ?? '0'} <span className="text-base font-normal">XLM</span>
            </p>
          )}
          <div className="text-xs text-slate-500 mt-2">
            Fetched directly from Horizon (Stellar Testnet)
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-500 mb-2">Total Assets</h3>
          <p className="text-2xl font-bold">124</p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-500 mb-2">Certified Valid</h3>
          <p className="text-2xl font-bold text-green-600">98%</p>
        </div>
      </div>

      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4">Send XLM (Testnet)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Destination address
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="G... (public address)"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Amount (XLM)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="0.0000001"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {sendError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {sendError}
          </div>
        )}

        {txHash && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-md text-sm">
            <div className="font-semibold">Transaction submitted</div>
            <div className="mt-1 font-mono">
              {txHash}
            </div>
            <div className="mt-2 text-xs text-green-800">
              View on Stellar Expert: (network assumed Testnet)
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={!canSend || sendLoading}
            onClick={async () => {
              const amt = amount.trim();
              const dest = destination.trim();
              await sendXlm(dest, amt);
            }}
            className="bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:cursor-not-allowed"
          >
            {sendLoading ? 'Sending...' : 'Send XLM'}
          </button>

          {!networkOk && (
            <div className="text-sm text-slate-600">
              Network mismatch: connect Freighter to Stellar Testnet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
