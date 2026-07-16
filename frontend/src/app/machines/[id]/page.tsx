import { notFound } from 'next/navigation';

import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge, TimelineBlock } from '@/components/maintchain/ui';
import { getMachineById } from '@/data/maintchain';

export default function MachineDetailPage({ params }: { params: { id: string } }) {
  const machine = getMachineById(params.id);
  if (!machine) notFound();

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="03"
        title={machine.name}
        caption={machine.overview}
        action={<StatusBadge tone={machine.status.includes('pending') ? 'pending' : machine.status.includes('review') ? 'info' : 'verified'}>{machine.status}</StatusBadge>}
      />

      <FadeInView as="section" direction="up" distance="sm" duration={450} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailPanel glass label="Serial">{machine.serial}</DetailPanel>
            <DetailPanel glass label="Installed">{machine.installedAt}</DetailPanel>
            <DetailPanel glass label="Industry">{machine.industry}</DetailPanel>
            <DetailPanel glass label="Site">{machine.site}</DetailPanel>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DetailPanel glass label="Technicians">{machine.technicians.join(', ')}</DetailPanel>
            <DetailPanel glass label="Certificates">{machine.certificates.join(', ')}</DetailPanel>
            <DetailPanel glass label="Inspection reports">{machine.inspectionReports.join(', ')}</DetailPanel>
            <DetailPanel glass label="Machine ID">{machine.id}</DetailPanel>
          </div>
        </div>

        <div className="glass p-6">
          <EditorialSectionHeader number="04" title="Events attached to the asset for life" />
          <div className="mt-5 space-y-3">
            {machine.events.map((event) => (
              <TimelineBlock key={event.id} title={`${event.title} • ${event.date}`} subtitle={event.summary} status={event.status} />
            ))}
          </div>
        </div>
      </FadeInView>
    </div>
  );
}
