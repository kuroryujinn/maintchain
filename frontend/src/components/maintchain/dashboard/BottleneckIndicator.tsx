'use client';

interface BottleneckIndicatorProps {
  averageApprovalTime?: string;
  pendingCount?: number;
}

export function BottleneckIndicator({
  averageApprovalTime = '2.3 days',
  pendingCount = 0,
}: BottleneckIndicatorProps) {
  return (
    <div className="glass p-6">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
        Approval Bottleneck
      </div>
      <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
        {pendingCount > 0 ? `${pendingCount} pending` : 'No bottlenecks'}
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        Average approval time: {averageApprovalTime}
      </p>
    </div>
  );
}
