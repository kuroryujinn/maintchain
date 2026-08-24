'use client';

import dynamic from 'next/dynamic';
import { useSoroban } from '@/hooks/useSoroban';
import Hero from '@/components/maintchain/landing/Hero';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader } from '@/components/maintchain/ui';

// Lazy-load below-the-fold sections (code-split automatically)
const TrustReplaySignature = dynamic(
  () => import('@/components/maintchain/landing/TrustReplaySignature'),
  { loading: () => <div className="h-64 animate-pulse bg-white/50 rounded-2xl" /> }
);
const StatGrid = dynamic(
  () => import('@/components/maintchain/landing/StatGrid'),
  { loading: () => <div className="h-48 animate-pulse bg-white/50 rounded-2xl" /> }
);
const ComparisonCard = dynamic(
  () => import('@/components/maintchain/landing/ComparisonCard'),
  { loading: () => <div className="h-64 animate-pulse bg-white/50 rounded-2xl" /> }
);
const ActivityFeed = dynamic(
  () => import('@/components/maintchain/landing/ActivityFeed'),
  { loading: () => <div className="h-96 animate-pulse bg-white/50 rounded-2xl" /> }
);
const WorkerProfileCardPreview = dynamic(
  () => import('@/components/maintchain/landing/WorkerProfileCardPreview'),
  { loading: () => <div className="h-64 animate-pulse bg-white/50 rounded-2xl" /> }
);
const MachinePassportPreview = dynamic(
  () => import('@/components/maintchain/landing/MachinePassportPreview'),
  { loading: () => <div className="h-64 animate-pulse bg-white/50 rounded-2xl" /> }
);
const IndustriesGrid = dynamic(
  () => import('@/components/maintchain/landing/IndustriesGrid'),
  { loading: () => <div className="h-48 animate-pulse bg-white/50 rounded-2xl" /> }
);
const LeaderboardPreview = dynamic(
  () => import('@/components/maintchain/landing/LeaderboardPreview'),
  { loading: () => <div className="h-64 animate-pulse bg-white/50 rounded-2xl" /> }
);
const FinalCTA = dynamic(
  () => import('@/components/maintchain/landing/FinalCTA'),
  { loading: () => <div className="h-48 animate-pulse bg-white/50 rounded-2xl" /> }
);
const Footer = dynamic(
  () => import('@/components/maintchain/landing/Footer'),
  { loading: () => <div className="h-32 animate-pulse bg-white/50 rounded-2xl" /> }
);

export default function MaintChainHome() {
  const { walletError, networkError } = useSoroban();

  return (
    <div className="space-y-12 py-6">
      {/* 1 — Hero */}
      <Hero />

      {/* Wallet attention (operational errors only; no landing operational widgets) */}
      {(walletError || networkError) && (
        <div className="mx-auto max-w-7xl px-4">
          <div className="glass p-4 text-sm text-red-800" style={{ background: 'rgba(254, 242, 242, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(254, 202, 202, 0.6)' }}>
            <div className="font-semibold">Wallet attention required</div>
            <div className="mt-1">{walletError?.message ?? networkError?.message}</div>
          </div>
        </div>
      )}

      {/* 2 — Trust Replay (signature) — section 01 */}
      <TrustReplaySignature />

      {/* 3 — Network Statistics — section 02 */}
      <FadeInView direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
        <div className="glass p-6 sm:p-10">
          <EditorialSectionHeader
            number="02"
            title="Global trust, measured in proof"
            caption="Network statistics · Four trust signals that stay verifiable as the network evolves."
          />
          <StatGrid />
        </div>
      </FadeInView>

      {/* 4 — Why MaintChain? — section 03 */}
      <FadeInView direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
        <div className="space-y-4">
          <div className="section-number">03</div>
          <h2 className="mt-2 text-display-sm font-heading text-[var(--text-primary)]">
            Trust that travels with every repair
          </h2>
          <p className="mt-3 max-w-3xl font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Why MaintChain? · A quick scan comparison—built for auditors and hiring teams.
          </p>
        </div>
        <div className="mt-6">
          <ComparisonCard />
        </div>
      </FadeInView>

      {/* 5 — Live Network — section 04 */}
      <ActivityFeed />

      {/* 6 — Featured Workers — section 05 */}
      <WorkerProfileCardPreview />

      {/* 7 — Machine Passport — section 06 */}
      <MachinePassportPreview />

      {/* 8 — Industries — section 07 */}
      <IndustriesGrid />

      {/* 9 — Leaderboard Preview — section 08 */}
      <LeaderboardPreview />

      {/* 10 — Final CTA */}
      <FinalCTA />

      <Footer />
    </div>
  );
}
