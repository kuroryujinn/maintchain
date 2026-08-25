import Hero from '@/components/maintchain/landing/Hero';
import LandingBelowFold from '@/components/maintchain/landing/LandingBelowFold';

/**
 * MaintChain Landing Page
 *
 * This is a SERVER COMPONENT. The Hero section renders entirely server-side
 * with zero client JS, ensuring the fastest possible LCP. Client-specific
 * wallet detection and below-the-fold interactive sections are extracted
 * into LandingBelowFold (code-split automatically).
 */
export default function MaintChainHome() {
  return (
    <div className="space-y-12 py-6">
      {/* 1 — Hero: server-rendered, no client JS, fastest LCP */}
      <Hero />

      {/* Below-the-fold: client component with deferred dynamic imports */}
      <LandingBelowFold />
    </div>
  );
}
