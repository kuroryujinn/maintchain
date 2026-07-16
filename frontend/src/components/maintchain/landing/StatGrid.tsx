import FadeInView from '@/components/maintchain/FadeInView';
import { MetricCard } from '@/components/maintchain/ui';
import { homepageMetrics } from '@/data/maintchain';

const fallbackCompanies = '4,821';

export default function StatGrid() {
  const stats = [
    ...(homepageMetrics ?? []),
    {
      label: 'Companies',
      value: fallbackCompanies,
      helper: 'Hiring through trust',
    },
  ].slice(0, 4);

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((metric, idx) => (
        <FadeInView key={metric.label} direction="up" distance="sm" duration={400} delay={idx * 80}>
          <div className="glass p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--glass-shadow-hover)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{metric.label}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{metric.value}</div>
            <div className="mt-3 text-sm text-[var(--text-secondary)]">{metric.helper}</div>
            {/* Subtle gradient line at bottom */}
            <div className="mt-4 h-px w-1/3 bg-gradient-to-r from-[var(--primary)]/30 to-transparent" />
          </div>
        </FadeInView>
      ))}
    </div>
  );
}
