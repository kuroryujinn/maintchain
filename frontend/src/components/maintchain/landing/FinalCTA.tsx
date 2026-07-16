import FadeInView from '@/components/maintchain/FadeInView';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="rounded-[2rem] bg-blue-600 p-6 text-white shadow-sm sm:p-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-[0.24em] text-white/80">
            Final call
          </div>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Start Building Trust Through Verified Work
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Become Verified <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/live-network"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Explore Network <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </FadeInView>
  );
}
