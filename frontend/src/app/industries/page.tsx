import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader } from '@/components/maintchain/ui';
import { industries } from '@/data/maintchain';

export default function IndustriesPage() {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="06"
        title="Evidence-based trust for multiple heavy-duty sectors"
        caption="Industries · Each sector keeps the same calm, readable system while highlighting the kinds of proof and approval context that matter most there."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {industries.map((industry, idx) => (
          <FadeInView key={industry.slug} as="section" direction="up" distance="sm" duration={400} delay={idx * 60} className="glass p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{industry.name}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{industry.summary}</p>
            <div className="mt-5 grid gap-3">
              <DetailPanel glass label="Trust focus">{industry.trustFocus}</DetailPanel>
              <DetailPanel glass label="Typical evidence">{industry.evidenceExamples.join(' • ')}</DetailPanel>
            </div>
          </FadeInView>
        ))}
      </div>
    </div>
  );
}
