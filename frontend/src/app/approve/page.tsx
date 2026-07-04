'use client';
import { useState } from 'react';

import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';

export default function ApprovalCenter() {
  const { isConnected, callContract } = useSoroban();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setTxHash(null);
    setError(null);

    try {
      const result = await callContract(
        'MULTI_PARTY_APPROVAL_ID',
        'approve_by_supervisor',
        [id, '1'] // 1 for APPROVED
      );

      const maybeHash =
        (result as any)?.hash ??
        (result as any)?.transactionHash ??
        (result as any)?.result?.hash ??
        null;

      setTxHash(maybeHash);
      if (!maybeHash) {
        setError(
          'Contract call succeeded but tx hash is not available from wallet result.'
        );
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Approval Center</h1>

      <WalletConnectPanel />

      {isConnected && (
        <div className="space-y-4">
          {(error || txHash) && (
            <div
              className={
                txHash
                  ? 'bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-md text-sm'
                  : 'bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-md text-sm'
              }
            >
              {txHash ? (
                <>
                  <div className="font-semibold">Contract transaction submitted</div>
                  <div className="mt-1 font-mono">{txHash}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Contract transaction failed</div>
                  <div className="mt-1">{error}</div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold">Record #8821-A</h3>
                <p className="text-sm text-slate-500">
                  Technician: Alice | Equipment: Pump-01
                </p>
                <p className="text-xs text-blue-600 font-mono mt-1">
                  Hash: 0x8f2...a1c
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove('REC-8821-A')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {}}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold">Record #9012-B</h3>
                <p className="text-sm text-slate-500">
                  Technician: Bob | Equipment: Valve-04
                </p>
                <p className="text-xs text-blue-600 font-mono mt-1">
                  Hash: 0x1a4...b2d
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove('REC-9012-B')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {}}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

