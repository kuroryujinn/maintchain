'use client';

import { useSoroban } from '@/hooks/useSoroban';
import Hero from '@/components/maintchain/landing/Hero';
import TrustReplaySignature from '@/components/maintchain/landing/TrustReplaySignature';
import StatGrid from '@/components/maintchain/landing/StatGrid';
import ComparisonCard from '@/components/maintchain/landing/ComparisonCard';
import ActivityFeed from '@/components/maintchain/landing/ActivityFeed';
import WorkerProfileCardPreview from '@/components/maintchain/landing/WorkerProfileCardPreview';
import MachinePassportPreview from '@/components/maintchain/landing/MachinePassportPreview';
import LeaderboardPreview from '@/components/maintchain/landing/LeaderboardPreview';
import IndustriesGrid from '@/components/maintchain/landing/IndustriesGrid';
import FinalCTA from '@/components/maintchain/landing/FinalCTA';
import Footer from '@/components/maintchain/landing/Footer';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader } from '@/components/maintchain/ui';

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

      {/* 2 — Trust Replay (signature) */}
      <TrustReplaySignature />

      {/* 3 — Network Statistics */}
      <FadeInView direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
        <div className="glass p-6 sm:p-10">
          <EditorialSectionHeader
            number="01"
            title="Global trust, measured in proof"
            caption="Network statistics · Four trust signals that stay verifiable as the network evolves."
          />
          <StatGrid />
        </div>
      </FadeInView>

      {/* 4 — Why MaintChain? */}
      <FadeInView direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
        <div className="space-y-4">
          <div className="section-number">02</div>
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

      {/* 5 — Live Network */}
      <ActivityFeed />

      {/* 6 — Featured Workers */}
      <WorkerProfileCardPreview />

      {/* 7 — Machine Passport */}
      <MachinePassportPreview />

      {/* 8 — Leaderboard Preview */}
      <LeaderboardPreview />

      {/* 9 — Industries */}
      <IndustriesGrid />

      {/* 10 — Final CTA */}
      <FinalCTA />

      <Footer />
    </div>
  );
}

