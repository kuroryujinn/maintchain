'use client';
import { useSoroban } from '@/hooks/useSoroban';

export default function AuditTimeline() {
  const { connectWallet, isConnected, callContract } = useSoroban();

  const handleCertify = async (id: string) => {
    try {
      await callContract('ATTESTATION_CONTRACT_ID', 'issue_certificate', [
        id,
        'on_chain_cert_hash',
      ]);
      alert('Compliance Certificate issued on-chain!');
    } catch (error) {
      alert('Certification failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Audit Timeline</h1>

      {!isConnected ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="mb-4">Connect your wallet to perform audit certification</p>
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Maintenance Event #REC-8821-A</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-600">Technician Uploaded Evidence (S-441)</span>
                    <span className="text-slate-400 ml-auto">2026-06-10 10:00</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-600">Supervisor Approved (S-102)</span>
                    <span className="text-slate-400 ml-auto">2026-06-11 14:30</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm opacity-50">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <span className="text-slate-600">Auditor Certification</span>
                    <span className="text-slate-400 ml-auto">Pending...</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCertify('REC-8821-A')}
                  className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Issue Compliance Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

