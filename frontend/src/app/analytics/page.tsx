'use client';

import { useEffect, useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { BarChart3, Server, Activity, Shield, FileCheck } from 'lucide-react';

interface MetricsData {
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  timestamp: string;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(setMetrics)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <FadeInView direction="up" distance="sm" duration={450}>
      <div className="space-y-8">
        <EditorialSectionHeader
          number="01"
          title="Analytics & Performance"
          caption="Internal metrics dashboard · Server health and integration status."
        />

        {/* Live Server Metrics */}
        <div className="glass p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-heading text-[var(--text-primary)]">
            <Server className="h-5 w-5" />
            Server Health
            <StatusBadge tone="info">Live</StatusBadge>
          </h3>
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg bg-white/50" />
          ) : error ? (
            <p className="text-sm text-[var(--text-secondary)]">Unable to load server metrics</p>
          ) : metrics ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="Uptime" value={formatUptime(metrics.uptime)} />
              <MetricCard label="Heap Used" value={`${metrics.memory.heapUsed} MB`} />
              <MetricCard label="Heap Total" value={`${metrics.memory.heapTotal} MB`} />
              <MetricCard label="RSS" value={`${metrics.memory.rss} MB`} />
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Metrics unavailable</p>
          )}
        </div>

        {/* Product Configuration — static info, clearly labeled */}
        <div className="glass p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-heading text-[var(--text-primary)]">
            <Activity className="h-5 w-5" />
            Product Configuration
          </h3>
          <p className="mb-4 text-xs text-[var(--text-secondary)]">
            Static product information — not live analytics data.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ConfigCard
              icon={<Shield className="h-5 w-5 text-emerald-600" />}
              label="Smart Contracts"
              value="5"
              detail="Soroban contracts deployed to Testnet"
            />
            <ConfigCard
              icon={<FileCheck className="h-5 w-5 text-blue-600" />}
              label="Feedback Channels"
              value="2"
              detail="Google Form + in-app widget"
            />
            <ConfigCard
              icon={<BarChart3 className="h-5 w-5 text-violet-600" />}
              label="Compliance Stages"
              value="6"
              detail="Detection → Certificate workflow"
            />
          </div>
        </div>

        {/* Integration Status */}
        <div className="glass p-6">
          <h3 className="mb-4 text-lg font-heading text-[var(--text-primary)]">Integration Status</h3>
          <div className="flex flex-wrap gap-3">
            <StatusBadge tone="verified">GlitchTip Monitoring</StatusBadge>
            <StatusBadge tone="verified">PostHog Analytics</StatusBadge>
            <StatusBadge tone="verified">Lighthouse CI</StatusBadge>
            <StatusBadge tone="verified">Web Vitals Tracking</StatusBadge>
          </div>
        </div>
      </div>
    </FadeInView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/40 p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-heading text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ConfigCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/20 bg-white/40 p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
        <div className="mt-1 text-2xl font-heading text-[var(--text-primary)]">{value}</div>
        <div className="text-xs text-[var(--text-secondary)]">{detail}</div>
      </div>
    </div>
  );
}
