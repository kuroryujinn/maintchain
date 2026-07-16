import { notFound } from 'next/navigation';

import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, EvidenceGallery, StatusBadge, TimelineBlock } from '@/components/maintchain/ui';
import { getWorkerBySlug } from '@/data/maintchain';

export default function WorkerProfilePage({ params }: { params: { slug: string } }) {
  const worker = getWorkerBySlug(params.slug);
  if (!worker) notFound();

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="02"
        title={worker.name}
        caption={worker.summary}
        action={<StatusBadge tone="verified">Trust {worker.trustScore}</StatusBadge>}
      />

      <FadeInView as="section" direction="up" distance="sm" duration={450} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailPanel glass label="Specialization">{worker.specialization}</DetailPanel>
            <DetailPanel glass label="Location">{worker.location}</DetailPanel>
            <DetailPanel glass label="Global rank">#{worker.globalRank}</DetailPanel>
            <DetailPanel glass label="Availability">{worker.availability}</DetailPanel>
          </div>

          <div className="mt-6 space-y-4">
            {worker.reputation.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>{metric.label}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{metric.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--border)]">
                  <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Skills earned through verified work</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {worker.skills.map((skill) => (
              <DetailPanel glass key={skill.label} label={skill.label}>
                {skill.level}
              </DetailPanel>
            ))}
          </div>

          <div className="mt-6 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Certificates</div>
          <div className="mt-4 grid gap-3">
            {worker.certificates.map((certificate) => (
              <DetailPanel glass key={certificate.certificateId} label={certificate.title}>
                {certificate.issuedAt} • {certificate.authority}
              </DetailPanel>
            ))}
          </div>
        </div>
      </FadeInView>

      <FadeInView as="section" direction="up" distance="sm" duration={450} delay={60} className="glass p-6">
        <EditorialSectionHeader number="03" title="Every repair becomes durable history" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {worker.repairs.map((repair) => (
              <TimelineBlock
                key={repair.id}
                title={`${repair.title} • ${repair.completedAt}`}
                subtitle={`${repair.location} • ${repair.review}`}
                status={repair.status}
              />
            ))}
          </div>

          <div className="glass p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{worker.repairs[0].title}</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{worker.repairs[0].review}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailPanel glass label="Parts replaced">{worker.repairs[0].partsReplaced.join(', ')}</DetailPanel>
              <DetailPanel glass label="Approval chain">{worker.repairs[0].approvalChain.join(' • ')}</DetailPanel>
              <DetailPanel glass label="Blockchain verification">{worker.repairs[0].blockchainHash}</DetailPanel>
              <DetailPanel glass label="Repair ID">{worker.repairs[0].id}</DetailPanel>
            </div>
            <div className="mt-5">
              <EvidenceGallery items={worker.repairs[0].evidence} glass />
            </div>
          </div>
        </div>
      </FadeInView>

      <FadeInView as="section" direction="up" distance="sm" duration={450} delay={120} className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <EditorialSectionHeader number="04" title="Verified feedback linked to real jobs" />
          <div className="mt-5 space-y-3">
            {worker.reviews.map((review) => (
              <DetailPanel glass key={review.id} label={`${review.company} • ${review.createdAt}`}>
                {review.quote}
              </DetailPanel>
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <EditorialSectionHeader number="05" title="Uploaded proof stays attached to the work" />
          <div className="mt-5">
            <EvidenceGallery items={worker.repairs.flatMap((repair) => repair.evidence)} glass />
          </div>
        </div>
      </FadeInView>
    </div>
  );
}
