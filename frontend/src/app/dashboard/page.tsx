import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { dashboardSnapshot } from '@/data/maintchain';

export default function DashboardPage() {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Professional growth without gamification"
        caption="Worker dashboard · A first-pass dashboard that keeps trust, workload, reviews, and verification status visible in one calm workspace."
        action={<StatusBadge tone="verified">{dashboardSnapshot.verificationStatus}</StatusBadge>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FadeInView direction="up" distance="sm" duration={400} delay={0 * 60}>
          <DetailPanel glass label="Today's trust score">{dashboardSnapshot.trustScoreToday}</DetailPanel>
        </FadeInView>
        <FadeInView direction="up" distance="sm" duration={400} delay={1 * 60}>
          <DetailPanel glass label="Weekly rank">{dashboardSnapshot.weeklyRank}</DetailPanel>
        </FadeInView>
        <FadeInView direction="up" distance="sm" duration={400} delay={2 * 60}>
          <DetailPanel glass label="Monthly repairs">{dashboardSnapshot.monthlyRepairs}</DetailPanel>
        </FadeInView>
        <FadeInView direction="up" distance="sm" duration={400} delay={3 * 60}>
          <DetailPanel glass label="Certificates earned">{dashboardSnapshot.certificatesEarned}</DetailPanel>
        </FadeInView>
        <FadeInView direction="up" distance="sm" duration={400} delay={4 * 60}>
          <DetailPanel glass label="Trust growth">{dashboardSnapshot.trustGrowth}</DetailPanel>
        </FadeInView>
        <FadeInView direction="up" distance="sm" duration={400} delay={5 * 60}>
          <DetailPanel glass label="Verification status">{dashboardSnapshot.verificationStatus}</DetailPanel>
        </FadeInView>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <FadeInView className="glass p-6" direction="up" distance="sm" duration={400} delay={100}>
          <EditorialSectionHeader number="02" title="What needs attention next" />
          <div className="mt-5 grid gap-3">
            {dashboardSnapshot.upcomingJobs.map((job) => (
              <DetailPanel glass key={job} label="Scheduled work">
                {job}
              </DetailPanel>
            ))}
          </div>
        </FadeInView>

        <FadeInView className="glass p-6" direction="up" distance="sm" duration={400} delay={180}>
          <EditorialSectionHeader number="03" title="Recent feedback tied to completed work" />
          <div className="mt-5 grid gap-3">
            {dashboardSnapshot.latestReviews.map((review) => (
              <DetailPanel glass key={review} label="Verified customer review">
                {review}
              </DetailPanel>
            ))}
          </div>
        </FadeInView>
      </section>
    </div>
  );
}
