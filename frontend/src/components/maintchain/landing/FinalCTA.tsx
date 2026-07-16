import FadeInView from '@/components/maintchain/FadeInView';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-[0_20px_60px_rgba(37,99,235,0.25)] sm:p-10"
    >
      {/* Soft glow overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Scan-line overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 6px)',
        }}
      />
      {/* Top gradient edge */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-px w-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 80%, transparent)',
        }}
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-blue-200">
            <span className="inline-block h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            Final call
          </div>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Start Building Trust Through Verified Work
          </h2>
          <p className="text-sm text-blue-200 max-w-lg">
            Join thousands of verified professionals building reputation through real, evidence-backed repairs.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:-translate-y-0.5"
          >
            Become Verified <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/live-network"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:-translate-y-0.5"
          >
            Explore Network <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </FadeInView>
  );
}
