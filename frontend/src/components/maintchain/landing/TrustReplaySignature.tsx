'use client';

import FadeInView from '@/components/maintchain/FadeInView';
import TrustReplay from '@/components/maintchain/TrustReplay';

export default function TrustReplaySignature() {
  return (
    <FadeInView as="section" direction="up" distance="md" duration={500}
      aria-label="Trust Replay"
      className="relative overflow-hidden bg-[#111827] py-14"
    >
      {/* Signature background: industrial scan + calm gradient (no new color scheme) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.22), transparent 45%), radial-gradient(circle at 80% 10%, rgba(22,163,74,0.14), transparent 40%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 55%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 1px, transparent 1px, transparent 7px)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-10">
          {/* Header (no paragraph) */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Trust Replay
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Machine Fault → Verified → Certified
            </h2>
            <div className="text-sm font-medium text-slate-300">
              Evidence-first, approvals visible, reputation updated on chain.
            </div>
          </div>

          {/* Signature Experience */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <TrustReplay />
          </div>
        </div>
      </div>
    </FadeInView>
  );
}

