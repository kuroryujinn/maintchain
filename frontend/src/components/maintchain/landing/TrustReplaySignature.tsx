'use client';

import FadeInView from '@/components/maintchain/FadeInView';
import TrustReplay from '@/components/maintchain/TrustReplay';

export default function TrustReplaySignature() {
  return (
    <FadeInView as="section" direction="up" distance="md" duration={500}
      aria-label="Trust Replay"
      className="relative overflow-hidden bg-[#111827] py-14"
    >
      {/* Signature background: industrial scan + calm gradient */}
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
      {/* Glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Editorial masthead-style blue gradient line */}
        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="flex flex-col gap-10">
          {/* Header with editorial section number */}
          <div className="flex items-start gap-6">
            <div className="hidden sm:block font-mono text-sm text-blue-500 tracking-[0.15em] font-semibold mt-1">
              01
            </div>
            <div className="space-y-4 flex-1">
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
            <div className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 self-start mt-2 whitespace-nowrap">
              Soroban · stage 04 of 09
            </div>
          </div>

          {/* Signature Experience */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_24px_72px_rgba(0,0,0,0.3)]">
            <TrustReplay />
          </div>
        </div>
      </div>
    </FadeInView>
  );
}
