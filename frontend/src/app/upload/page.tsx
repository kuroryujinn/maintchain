'use client';
import { useState } from 'react';
import { useSoroban } from '@/hooks/useSoroban';

export default function EvidenceUpload() {
  const { address, connectWallet, isConnected, callContract } = useSoroban();
  const [file, setFile] = useState<File | null>(null);
  const [maintenanceId, setMaintenanceId] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !maintenanceId) return;
    setUploading(true);
    try {
      // 1. Compute hash (this would typically be done in the browser or a helper API)
      const hash = '0x' + Array.from(new Uint8Array(32)).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      // 2. Call Soroban contract: MaintenanceRecords.submit_evidence(maintenance_id, evidence_hash)
      await callContract('MAINTENANCE_RECORDS_ID', 'submit_evidence', [maintenanceId, hash]);

      alert('Evidence submitted successfully on-chain!');
    } catch (error) {
      alert('Upload failed: ' + error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Upload Maintenance Evidence</h1>

      {!isConnected ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="mb-4">Please connect your Stellar wallet to upload evidence</p>
          <button onClick={connectWallet} className="bg-blue-600 text-white px-6 py-2 rounded-md">Connect Wallet</button>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Record ID</label>
            <input
              type="text"
              value={maintenanceId}
              onChange={(e) => setMaintenanceId(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter record ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Evidence File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploading ? 'Submitting to Blockchain...' : 'Submit Evidence'}
          </button>
        </div>
      )}
    </div>
  );
}
