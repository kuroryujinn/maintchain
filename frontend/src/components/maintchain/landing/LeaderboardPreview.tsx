import FadeInView from '@/components/maintchain/FadeInView';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { workers } from '@/data/maintchain';

const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardPreview() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450}
      className="relative overflow-hidden rounded-[2rem] bg-[#111827] p-6 text-white shadow-sm sm:p-10"
    >
      {/* Scan-line overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(148,163,184,0.3) 0px, rgba(148,163,184,0.3) 1px, transparent 1px, transparent 8px)',
        }}
      />
      {/* Blue glow accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative">
        {/* Editorial masthead-style gradient line */}
        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />

        <div className="flex items-start gap-6">
          <div className="hidden sm:block font-mono text-sm text-blue-500 tracking-[0.15em] font-semibold mt-1">
            08
          </div>
          <div className="space-y-4 flex-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Leaderboard preview
            </div>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Global trust rankings
            </h2>
            <div className="text-sm font-medium text-slate-300">
              Top verified workers—ranked by evidence depth.
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {workers.slice(0, 3).map((worker, idx) => (
            <article
              key={worker.slug}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-2xl">{medals[idx] ?? '🏅'}</div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Trust</div>
                  <div className="mt-2 text-3xl font-semibold">{worker.trustScore}%</div>
                </div>
              </div>

              <div className="mt-4 text-lg font-semibold">{worker.name}</div>
              <div className="mt-1 text-sm text-slate-300">{worker.industry}</div>

              <div className="mt-4 h-px bg-white/10" />

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-200">
                  {worker.verifiedRepairs.toLocaleString()} verified repairs
                </span>
                <span className="text-xs font-mono text-slate-500">
                  #{idx + 1}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/leaderboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.15)] sm:w-auto"
          >
            View Full Leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </FadeInView>
  );
}
