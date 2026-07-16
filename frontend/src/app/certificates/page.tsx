import Link from 'next/link';

import { ArrowRight } from 'lucide-react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { certificates } from '@/data/maintchain';

export default function CertificatesPage() {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="05"
        title="Public verification lookup for completed work"
        caption="Certificates · Each certificate ties together the machine, technician, company, repair date, approval chain, and blockchain record."
      />

      <section className="grid gap-4">
        {certificates.map((certificate, idx) => (
          <FadeInView key={certificate.id} as="article" direction="up" distance="sm" duration={400} delay={idx * 80} className="glass p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{certificate.id}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{certificate.title}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{certificate.summary}</p>
              </div>
              <StatusBadge tone={certificate.verificationStatus.includes('Pending') ? 'pending' : 'verified'}>
                {certificate.verificationStatus}
              </StatusBadge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailPanel glass label="Machine">{certificate.machineName}</DetailPanel>
              <DetailPanel glass label="Technician">{certificate.technician}</DetailPanel>
              <DetailPanel glass label="Company">{certificate.company}</DetailPanel>
              <DetailPanel glass label="Repair date">{certificate.repairDate}</DetailPanel>
            </div>

            <Link href={`/certificates/${certificate.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
              View certificate detail <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeInView>
        ))}
      </section>
    </div>
  );
}
