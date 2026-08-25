'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

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

export default function LandingBelowFold() {
  // Defer wallet detection to after first paint — avoids blocking LCP.
  const [walletAlert, setWalletAlert] = useState<{ message: string } | null>(null);

  useEffect(() => {
    // Lazy-import wallet logic only after the page has painted
    import('@/hooks/useSoroban').then(() => {
      const checkWallet = async () => {
        try {
          const { isConnected } = await import('@stellar/freighter-api');
          const result = await isConnected();
          if (!result.isConnected) {
            // Wallet not connected — no alert needed on landing page
          }
        } catch {
          // Freighter not installed — expected on landing page
        }
      };
      checkWallet();
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* Wallet attention (deferred — only shows if wallet has issues) */}
      {walletAlert && (
        <div className="mx-auto max-w-7xl px-4">
          <div className="glass p-4 text-sm text-red-800" style={{ background: 'rgba(254, 242, 242, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(254, 202, 202, 0.6)' }}>
            <div className="font-semibold">Wallet attention required</div>
            <div className="mt-1">{walletAlert.message}</div>
          </div>
        </div>
      )}

      {/* 2 — Trust Replay (signature) — section 01 */}
      <TrustReplaySignature />

      {/* 3 — Network Statistics — section 02 */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="glass p-6 sm:p-10">
          <div className="section-number">02</div>
          <h2 className="mt-2 text-display-sm font-heading text-[var(--text-primary)]">
            Global trust, measured in proof
          </h2>
          <p className="mt-3 max-w-3xl font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Network statistics · Four trust signals that stay verifiable as the network evolves.
          </p>
          <div className="mt-6">
            <StatGrid />
          </div>
        </div>
      </div>

      {/* 4 — Why MaintChain? — section 03 */}
      <div className="mx-auto max-w-7xl px-4">
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
      </div>

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
    </>
  );
}
