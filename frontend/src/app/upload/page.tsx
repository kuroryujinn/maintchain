'use client';
import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';

export default function EvidenceUpload() {
  const { address, connectWallet, isConnected } = useSoroban();
  const [file, setFile] = useState<File | null>(null);
  const [maintenanceId, setMaintenanceId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || !maintenanceId) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      // 1. Compute hash via the backend's hash utility
      const hash = await api.computeHash({
        payload: `${file.name}-${Date.now()}-${file.size}`,
      });

      // 2. Submit evidence hash to backend
      const result = await api.submitEvidence(maintenanceId, {
        evidence_hash: hash.evidence_hash,
      });

      setUploadResult(`Evidence submitted! Status: ${result.status}`);
    } catch (error) {
      const message = error instanceof ApiError ? `${error.code}: ${error.message}` : 'Upload failed';
      setUploadError(message);
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
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
                placeholder="Enter record ID (e.g., REC-DE-4471)"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Evidence File</label>
              <div
                className={`
                  relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200
                  ${file
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/40 hover:bg-white'
                  }
                `}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) setFile(droppedFile);
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="pointer-events-none">
                  <Upload className="mx-auto h-10 w-10 text-[var(--text-secondary)]" />
                  <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                    {file ? file.name : 'Drop evidence file here or click to browse'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : 'Photos, videos, PDFs — max 50 MB'
                    }
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !maintenanceId}
              className={`
                w-full rounded-full py-3 text-sm font-semibold text-white
                transition-all duration-200
                ${uploading || !file || !maintenanceId
                  ? 'bg-[var(--text-tertiary)] cursor-not-allowed'
                  : 'bg-[var(--primary)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:-translate-y-0.5'
                }
              `}
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting to blockchain...
                </span>
              ) : (
                'Submit Evidence'
              )}
            </button>
          </div>

          {uploadResult && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 motion-safe:animate-[fadeSlideUp_0.3s_ease-out]">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Evidence submitted
              </div>
              <p className="mt-1 font-mono text-xs">{uploadResult}</p>
            </div>
          )}
          {uploadError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 motion-safe:animate-[fadeSlideUp_0.3s_ease-out]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Submission failed
              </div>
              <p className="mt-1">{uploadError}</p>
            </div>
          )}
        </FadeInView>
      )}
    </div>
  );
}
