'use client';
import { useSoroban } from '@/hooks/useSoroban';

export default function ApprovalCenter() {
  const { connectWallet, isConnected, callContract } = useSoroban();

  const handleApprove = async (id: string) => {
    try {
      await callContract(
        'MULTI_PARTY_APPROVAL_ID',
        'approve_by_supervisor',
        [id, '1'] // 1 for APPROVED
      );
      alert('Approved successfully!');
    } catch (error) {
      alert('Approval failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Approval Center</h1>

      {!isConnected ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="mb-4">Connect your wallet to manage approvals</p>
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold">Record #8821-A</h3>
              <p className="text-sm text-slate-500">Technician: Alice | Equipment: Pump-01</p>
              <p className="text-xs text-blue-600 font-mono mt-1">Hash: 0x8f2...a1c</p>
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
              <p className="text-sm text-slate-500">Technician: Bob | Equipment: Valve-04</p>
              <p className="text-xs text-blue-600 font-mono mt-1">Hash: 0x1a4...b2d</p>
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
      )}
    </div>
  );
}

