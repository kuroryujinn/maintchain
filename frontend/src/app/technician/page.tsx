'use client';

import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import WalletConnectPanel from '@/components/WalletConnectPanel';
import { useSoroban } from '@/hooks/useSoroban';
import { api, ApiError } from '@/lib/api';
import type { MaintenanceResponse } from '@/lib/api-types';
import { AlertCircle, CheckCircle2, Camera, ClipboardList, Upload, Wrench } from 'lucide-react';

export default function TechnicianDashboard() {
  const { isConnected, address, connectWallet } = useSoroban();
  const [tasks, setTasks] = useState<MaintenanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    api.listPendingApprovals()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isConnected]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6 px-4">
      <EditorialSectionHeader
        number="01"
        title="Technician Mobile Dashboard"
        caption="Technician · Quick access to assigned tasks, evidence upload, and equipment scanning."
        action={
          <StatusBadge tone={isConnected ? 'verified' : 'pending'}>
            {isConnected ? 'Ready' : 'Connect wallet'}
          </StatusBadge>
        }
      />

      {!isConnected ? (
        <FadeInView direction="up" distance="sm" duration={400} className="glass p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-[var(--primary)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            Welcome, Technician
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Connect your Stellar wallet to access your tasks and submit evidence.
          </p>
          <button
            onClick={connectWallet}
            className="mt-6 rounded-full bg-[var(--primary)] px-8 py-3 text-white font-semibold text-lg"
          >
            Connect Wallet
          </button>
        </FadeInView>
      ) : (
        <>
          {/* Quick Actions - Large touch targets for mobile */}
          <FadeInView direction="up" distance="sm" duration={400} className="glass p-6">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/upload"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--primary)] text-white hover:shadow-lg transition-all duration-200 min-h-[120px]"
              >
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-sm font-semibold">Upload Evidence</span>
              </a>
              <a
                href="/machines"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-emerald-600 text-white hover:shadow-lg transition-all duration-200 min-h-[120px]"
              >
                <Camera className="h-8 w-8 mb-2" />
                <span className="text-sm font-semibold">Scan Equipment</span>
              </a>
            </div>
          </FadeInView>

          {/* Connected Account Info */}
          <FadeInView direction="up" distance="sm" duration={400} delay={60} className="glass p-4">
            <DetailPanel glass label="Technician ID">
              {address ? `${address.slice(0, 12)}...${address.slice(-6)}` : 'Not connected'}
            </DetailPanel>
          </FadeInView>

          {/* Assigned Tasks */}
          <FadeInView direction="up" distance="sm" duration={400} delay={120} className="glass p-6">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
              Your Assigned Tasks
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent mx-auto" />
                <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h4 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                  All caught up!
                </h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No pending tasks assigned to you right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, i) => (
                  <FadeInView
                    key={task.maintenance_id}
                    direction="up"
                    distance="sm"
                    duration={400}
                    delay={i * 80}
                    className="p-4 rounded-xl border border-[var(--border)] bg-white/50 hover:bg-white transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          Record #{task.maintenance_id.slice(0, 8)}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          Equipment: {task.equipment_id.slice(0, 8)}...
                        </div>
                        <div className="mt-1 font-mono text-xs text-[var(--primary)]">
                          Hash: {task.evidence_hash.slice(0, 16)}...
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                          {new Date(task.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <StatusBadge tone={task.status === 'COMPLIANT' ? 'verified' : 'pending'}>
                        {task.status}
                      </StatusBadge>
                    </div>
                    <a
                      href={`/upload`}
                      className="mt-3 block w-full rounded-full bg-[var(--primary)] py-2 text-center text-sm font-semibold text-white hover:shadow-lg transition-all"
                    >
                      Submit Evidence
                    </a>
                  </FadeInView>
                ))}
              </div>
            )}
          </FadeInView>
        </>
      )}
    </div>
  );
}
