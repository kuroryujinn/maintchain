'use client';

import { useMemo, useState } from 'react';

import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, FilterBar, StatusBadge } from '@/components/maintchain/ui';
import { countries, liveNetworkEvents } from '@/data/maintchain';

export default function LiveNetworkPage() {
  const [activeCountry, setActiveCountry] = useState('Global');

  const visibleEvents = useMemo(() => {
    if (activeCountry === 'Global') return liveNetworkEvents;
    return liveNetworkEvents.filter((event) => event.country === activeCountry);
  }, [activeCountry]);

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Globally distributed verification activity"
        caption="Live network · Track ongoing repairs, approvals, and certificate issuance without turning the interface into a noisy operations board."
      />

      <section className="glass p-6">
        <FilterBar items={countries} active={activeCountry} onSelect={setActiveCountry} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {visibleEvents.map((event, idx) => (
              <FadeInView key={event.id} as="article" direction="up" distance="sm" duration={400} delay={idx * 60} className="glass p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                      {event.city}, {event.country} • {event.timeWindow}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{event.title}</h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {event.industry} • {event.equipment} • {event.repairType}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{event.trustCue}</p>
                  </div>
                  <StatusBadge tone={event.statusTone}>{event.status}</StatusBadge>
                </div>
              </FadeInView>
            ))}
          </div>

          <div className="space-y-4">
            {[
              ['Fresh approvals', '18 in the last hour'],
              ['Pending reviews', '7 need verification'],
              ['Critical jobs', '4 fast-track repairs'],
              ['New certificates', '12 issued today'],
            ].map(([label, value], index) => (
              <div key={label} className="glass p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{label}</div>
                <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
                <div className={`mt-3 h-1.5 rounded-full ${index % 2 === 0 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
