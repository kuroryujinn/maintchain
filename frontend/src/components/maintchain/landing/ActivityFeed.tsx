'use client';

import Link from 'next/link';
import { ArrowRight, Globe2 } from 'lucide-react';

import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { liveNetworkEvents } from '@/data/maintchain';

export default function ActivityFeed() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
      <div className="glass p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <EditorialSectionHeader
            number="03"
            title="A living ecosystem of verified maintenance"
            caption="Live network · A live activity feed that highlights verified outcomes."
          />
          <Link
            href="/live-network"
            className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-[var(--primary)] transition hover:opacity-90"
          >
            Open full network <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div className="glass p-5">
            <div className="flex items-center gap-3 text-[var(--text-primary)]">
              <Globe2 className="h-5 w-5 text-[var(--primary)]" />
              <div className="text-sm font-semibold">Network activity</div>
            </div>

            <div className="mt-6 max-h-[380px] space-y-4 overflow-auto pr-2">
              {liveNetworkEvents.map((entry) => (
                <div
                  key={entry.id}
                  className="group glass p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(2,6,23,0.06)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        {entry.timeWindow}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                        {entry.equipment}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        {entry.city} • {entry.country}
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge tone={entry.statusTone}>{entry.status}</StatusBadge>
                      <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        Trust {entry.trustCue}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-[var(--text-secondary)]">{entry.repairType}</div>

                  <div className="mt-4 text-xs font-medium text-[var(--text-secondary)] opacity-0 transition group-hover:opacity-100">
                    Evidence-first event record
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="glass p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Designed for clarity</div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Verified events stand out; pending steps stay visible without overwhelming the feed.
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                Common filters
              </div>
              <div className="flex flex-wrap gap-2">
                {['Country', 'Industry', 'Machine', 'Time'].map((filter) => (
                  <span
                    key={filter}
                    className="glass px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    {filter}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 glass p-4" style={{ borderColor: 'rgba(37, 99, 235, 0.25)' }}>
              <div className="text-sm font-semibold text-[var(--primary)]">Live trust signals</div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                Evidence quality and approval outcomes move reputation.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </FadeInView>
  );
}
