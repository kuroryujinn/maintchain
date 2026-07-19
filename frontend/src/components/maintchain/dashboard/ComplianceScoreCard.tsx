'use client';

interface ComplianceScoreCardProps {
  score: number;
}

export function ComplianceScoreCard({ score }: ComplianceScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-emerald-600';
    if (s >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = (s: number) => {
    if (s >= 90) return 'bg-emerald-500';
    if (s >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="glass p-6">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
        Compliance Score
      </div>
      <div className={`mt-3 text-4xl font-bold ${getScoreColor(score)}`}>
        {score.toFixed(1)}%
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {score >= 90 ? 'Excellent compliance rate' : score >= 70 ? 'Needs improvement' : 'Critical: low compliance'}
      </p>
    </div>
  );
}
