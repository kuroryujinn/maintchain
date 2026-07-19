'use client';

import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { ComplianceScoreCard } from '@/components/maintchain/dashboard/ComplianceScoreCard';
import { BottleneckIndicator } from '@/components/maintchain/dashboard/BottleneckIndicator';
import { dashboardSnapshot } from '@/data/maintchain';

interface ComplianceDashboardData {
  total_equipment: number;
  compliant_records: number;
  pending_records: number;
  rejected_records: number;
  compliance_score: number;
  overdue_count: number;
}

export default function DashboardPage() {
  const [compliance, setCompliance] = useState<ComplianceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/compliance/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setCompliance(data);
        }
      } catch {
        // Backend unavailable — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchCompliance();
  }, []);

  const trustValue = parseFloat(dashboardSnapshot.trustScoreToday);
  const trustPercent = Math.min(trustValue, 100);

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="01"
        title="Professional growth without gamification"
        caption="Worker dashboard · A first-pass dashboard that keeps trust, workload, reviews, and verification status visible in one calm workspace."
        action={<StatusBadge tone="verified">{dashboardSnapshot.verificationStatus}</StatusBadge>}
      />

      {/* Compliance Dashboard Section */}
      <section className="space-y-4">
        <EditorialSectionHeader number="02" title="Compliance Overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FadeInView direction="up" distance="sm" duration={400} delay={0}>
            <ComplianceScoreCard score={compliance?.compliance_score ?? 0} />
          </FadeInView>
          <FadeInView direction="up" distance="sm" duration={400} delay={60}>
            <DetailPanel glass label="Total Equipment">
              {loading ? '...' : String(compliance?.total_equipment ?? 0)}
            </DetailPanel>
          </FadeInView>
          <FadeInView direction="up" distance="sm" duration={400} delay={120}>
            <DetailPanel glass label="Pending Review">
              {loading ? '...' : String(compliance?.pending_records ?? 0)}
            </DetailPanel>
          </FadeInView>
          <FadeInView direction="up" distance="sm" duration={400} delay={180}>
            <BottleneckIndicator pendingCount={compliance?.pending_records ?? 0} />
          </FadeInView>
        </div>
      </section>

      {/* Worker Metrics Section */}
      <section className="space-y-4">
        <EditorialSectionHeader number="03" title="Worker Metrics" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FadeInView direction="up" distance="sm" duration={400} delay={0 * 60}>
            <div className="glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Today&apos;s trust score</div>
                  <div className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{dashboardSnapshot.trustScoreToday}</div>
                </div>
                <div className="relative h-16 w-16">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="16" fill="none" stroke="var(--primary)" strokeWidth="2.5"
                      strokeDasharray={`${trustPercent} ${100 - trustPercent}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[var(--primary)]">{dashboardSnapshot.trustScoreToday}</span>
                </div>
              </div>
            </div>
          </FadeInView>
          <FadeInView direction="up" distance="sm" duration={400} delay={1 * 60}>
            <div className="glass p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Weekly rank</div>
              <div className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{dashboardSnapshot.weeklyRank}</div>
              <div className="mt-3 h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: '80%' }} />
              </div>
            </div>
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
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <FadeInView className="glass p-6" direction="up" distance="sm" duration={400} delay={100}>
          <EditorialSectionHeader number="04" title="What needs attention next" />
          <div className="mt-5 grid gap-3">
            {dashboardSnapshot.upcomingJobs.map((job) => (
              <DetailPanel glass key={job} label="Scheduled work">
                {job}
              </DetailPanel>
            ))}
          </div>
        </FadeInView>

        <FadeInView className="glass p-6" direction="up" distance="sm" duration={400} delay={180}>
          <EditorialSectionHeader number="05" title="Recent feedback tied to completed work" />
          <div className="mt-5 grid gap-3">
            {dashboardSnapshot.latestReviews.map((review) => (
              <DetailPanel glass key={review} label="Verified customer review">
                {review}
              </DetailPanel>
            ))}
          </div>
        </FadeInView>
      </section>

      {/* Mini activity chart */}
      <FadeInView className="glass p-6" direction="up" distance="sm" duration={400} delay={200}>
        <EditorialSectionHeader number="06" title="Monthly activity" />
        <div className="mt-6 flex items-end gap-2 h-32">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-full bg-gradient-to-t from-[var(--primary)] to-blue-400 transition-all duration-300 hover:opacity-80 cursor-pointer"
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
              </span>
            </div>
          ))}
        </div>
      </FadeInView>
    </div>
  );
}
