import Link from 'next/link';

import { ArrowRight } from 'lucide-react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { machines } from '@/data/maintchain';

export default function MachinesPage() {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="03"
        title="Every machine carries a permanent digital passport"
        caption="Machines · Browse assets by industry and status, then open each passport to inspect repair history, technicians, evidence, and certificates."
      />

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {machines.map((machine, idx) => (
          <FadeInView key={machine.id} as="article" direction="up" distance="sm" duration={400} delay={idx * 80} className="glass p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{machine.id}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{machine.name}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{machine.overview}</p>
              </div>
              <StatusBadge tone={machine.status.includes('pending') ? 'pending' : machine.status.includes('review') ? 'info' : 'verified'}>
                {machine.status}
              </StatusBadge>
            </div>

            <div className="mt-5 flex-1 grid gap-3">
              <DetailPanel glass label="Industry">{machine.industry}</DetailPanel>
              <DetailPanel glass label="Site">{machine.site}</DetailPanel>
              <DetailPanel glass label="Serial">{machine.serial}</DetailPanel>
            </div>

            <Link href={`/machines/${machine.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
              View passport <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeInView>
        ))}
      </section>
    </div>
  );
}
