import { notFound } from 'next/navigation';

import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { getCertificateById } from '@/data/maintchain';

export default function CertificateDetailPage({ params }: { params: { id: string } }) {
  const certificate = getCertificateById(params.id);
  if (!certificate) notFound();

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="05"
        title={certificate.title}
        caption={certificate.summary}
        action={<StatusBadge tone={certificate.verificationStatus.includes('Pending') ? 'pending' : 'verified'}>{certificate.verificationStatus}</StatusBadge>}
      />

      <FadeInView as="section" direction="up" distance="sm" duration={450} className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailPanel glass label="Certificate ID">{certificate.id}</DetailPanel>
            <DetailPanel glass label="Issuing authority">{certificate.issuingAuthority}</DetailPanel>
            <DetailPanel glass label="Machine">{certificate.machineName}</DetailPanel>
            <DetailPanel glass label="Technician">{certificate.technician}</DetailPanel>
            <DetailPanel glass label="Company">{certificate.company}</DetailPanel>
            <DetailPanel glass label="Repair date">{certificate.repairDate}</DetailPanel>
          </div>
        </div>

        <div className="glass p-6">
          <div className="grid gap-3">
            <DetailPanel glass label="Approval chain">{certificate.approvalChain.join(' • ')}</DetailPanel>
            <DetailPanel glass label="Blockchain record">{certificate.blockchainRecord}</DetailPanel>
            <DetailPanel glass label="Verification status">{certificate.verificationStatus}</DetailPanel>
          </div>
        </div>
      </FadeInView>
    </div>
  );
}
