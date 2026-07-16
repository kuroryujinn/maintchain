import { Factory, ArrowRight } from 'lucide-react';

import Link from 'next/link';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader } from '@/components/maintchain/ui';
import { industries } from '@/data/maintchain';

export default function IndustriesGrid() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
      <div className="glass p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <EditorialSectionHeader
            number="06"
            title="Trusted maintenance across heavy-duty sectors"
            caption="Industries · Simple coverage—evidence-first."
          />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry) => (
            <div
              key={industry.slug}
              className="glass p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(2,6,23,0.08)]"
            >
              <div className="flex items-center gap-3">
                <Factory className="h-5 w-5 text-[var(--primary)]" />
                <div className="text-sm font-semibold text-[var(--text-primary)]">{industry.name}</div>
              </div>
              <div className="mt-3 text-sm text-[var(--text-secondary)]">{industry.trustFocus}</div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--primary)] transition hover:opacity-90"
          >
            Explore industry coverage <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </FadeInView>
  );
}
