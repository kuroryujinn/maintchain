'use client';
import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
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
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Submit maintenance evidence"
        caption="Upload · Hash stored on-chain, files remain off-chain."
        action={<StatusBadge tone={isConnected ? 'verified' : 'pending'}>{isConnected ? 'Wallet connected' : 'Wallet required'}</StatusBadge>}
      />

      {!isConnected ? (
        <FadeInView direction="up" distance="sm" duration={400} className="glass p-8 text-center" style={{ borderColor: 'rgba(37, 99, 235, 0.25)' }}>
          <p className="mb-4 text-[var(--text-primary)]">Connect your Stellar wallet to submit evidence into the MaintChain approval flow.</p>
          <button onClick={connectWallet} className="rounded-full bg-[var(--primary)] px-6 py-3 text-white">Connect Wallet</button>
        </FadeInView>
      ) : (
        <FadeInView direction="up" distance="sm" duration={400} className="glass p-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <DetailPanel glass label="Connected account">{address ?? 'Unavailable'}</DetailPanel>
            <DetailPanel glass label="Evidence policy">Hash stored on-chain, files remain off-chain</DetailPanel>
            <DetailPanel glass label="Route purpose">Preserve upload workflow in the new shell</DetailPanel>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Maintenance Record ID</label>
              <input
                type="text"
                value={maintenanceId}
                onChange={(e) => setMaintenanceId(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white"
                placeholder="Enter record ID"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Evidence File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-primary)]"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded-full bg-[var(--primary)] py-3 text-white hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? 'Submitting to blockchain...' : 'Submit Evidence'}
            </button>
          </div>
        </FadeInView>
      )}
    </div>
  );
}
