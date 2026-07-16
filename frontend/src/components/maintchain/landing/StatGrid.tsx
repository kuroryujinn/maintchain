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
          <MetricCard {...metric} glass />
        </FadeInView>
      ))}
    </div>
  );
}
