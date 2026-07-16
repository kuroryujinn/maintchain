import FadeInView from '@/components/maintchain/FadeInView';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { workers } from '@/data/maintchain';

const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardPreview() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="rounded-[2rem] bg-[#111827] p-6 text-white shadow-sm sm:p-10">
      <div className="space-y-4">
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

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {workers.slice(0, 3).map((worker, idx) => (
          <article
            key={worker.slug}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/8"
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

            <div className="mt-4 text-sm text-slate-200">
              {worker.verifiedRepairs.toLocaleString()} verified repairs
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/leaderboard"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
        >
          View Full Leaderboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </FadeInView>
  );
}
