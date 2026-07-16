import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader } from '@/components/maintchain/ui';

export default function PlaceholderPage({
  title,
  description,
  estimated,
}: {
  title: string;
  description: string;
  estimated?: string;
}) {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="—"
        title={title}
        caption={description}
      />

      <FadeInView direction="up" distance="sm" duration={400} className="glass p-12 text-center">
        <Construction className="mx-auto h-16 w-16 text-[var(--text-tertiary)]" />
        <h2 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">Coming soon</h2>
        <p className="mt-3 max-w-md mx-auto text-[var(--text-secondary)]">
          {estimated
            ? `This page is under development. Estimated completion: ${estimated}.`
            : 'This page is under development and will be available in a future update.'}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </FadeInView>
    </div>
  );
}
