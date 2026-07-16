'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { workers } from '@/data/maintchain';

export default function WorkerProfileCardPreview() {
  return (
    <FadeInView as="section" aria-label="Featured workers" direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
      <div className="glass p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <EditorialSectionHeader
            number="04"
            title="Built reputations from verified work"
            caption="Featured workers · Three professional previews—no dashboard noise."
          />
          <Link
            href="/workers"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--text-secondary)]"
          >
            View all workers <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {workers.slice(0, 3).map((worker) => (
            <article
              key={worker.slug}
              className="glass p-6 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(2,6,23,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nav)] text-white text-xl font-semibold">
                    {worker.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">{worker.name}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{worker.specialization}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Trust</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{worker.trustScore}%</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="glass p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Repairs</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{worker.verifiedRepairs.toLocaleString()}</div>
                </div>
                <div className="glass p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Industry</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{worker.industry}</div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={`/workers/${worker.slug}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--text-secondary)]"
                >
                  View Profile <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </FadeInView>
  );
}
