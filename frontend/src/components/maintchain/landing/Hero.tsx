'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import FadeInView from '@/components/maintchain/FadeInView';

export default function Hero() {
  return (
    <section aria-label="Hero" className="relative mx-auto max-w-7xl px-4">
      {/* Industrial grid backdrop (no color scheme change) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Left: copy only (no paragraphs) */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]" style={{
            border: '1px solid rgba(37, 99, 235, 0.2)',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px)',
            color: 'var(--primary)',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.08)',
          }}>
            <span className="glow-dot-blue" />
            Global reputation network
          </div>

          <h1 className="text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-[56px]" style={{ letterSpacing: '-0.03em' }}>
            <span className="text-gradient-blue">Verified work,</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>engineered into trust</span>
          </h1>

          <h2 className="text-lg leading-8 sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
            Every repair builds trust.
            <br />
            Every verification builds reputation.
          </h2>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/workers"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.45)]"
            >
              Find Trusted Experts <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/50 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-blue-400/30 hover:shadow-[0_0_24px_rgba(37,99,235,0.12)]"
            >
              Become Verified
            </Link>
          </div>
        </div>

        {/* Right: visual trust network with dramatic glow */}
        <FadeInView direction="right" distance="md" duration={500} delay={80} className="relative overflow-hidden glass-glow-blue p-6">
          {/* Blue glow behind the panel */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          {/* Top gradient edge */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-px w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.5) 20%, rgba(37,99,235,0.8) 50%, rgba(37,99,235,0.5) 80%, transparent 100%)',
            }}
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                Trust network
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                Evidence-first connections
              </div>
            </div>
            <div className="rounded-full bg-[var(--nav)] px-3 py-1 text-xs font-semibold text-white">
              Live
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="glass p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--nav)] text-white">
                  W
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Connected workers
                </div>
              </div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                Reputation follows verified outcomes
              </div>
            </div>
            <div className="glass p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
                  M
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Machines + passports
                </div>
              </div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                Lifelong history with certificates
              </div>
            </div>
          </div>

          {/* Network graphic */}
          <div className="relative mt-6 h-[250px]">
            <div className="pointer-events-none absolute inset-0">
              {/* Subtle scan lines */}
              <div
                className="absolute inset-0 opacity-[0.3]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, rgba(148,163,184,0.24) 0px, rgba(148,163,184,0.24) 1px, transparent 1px, transparent 6px)',
                }}
              />
              {/* Soft grid */}
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />
            </div>

            {/* Nodes */}
            <div className="absolute left-6 top-10">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Worker
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Elena</div>
              </div>
            </div>

            <div className="absolute right-10 top-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Certificate
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">CERT</div>
              </div>
            </div>

            <div className="absolute left-10 bottom-8">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Machine
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">HP-2207</div>
              </div>
            </div>

            <div className="absolute right-6 bottom-14">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Reputation
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">+0.02</div>
              </div>
            </div>

            {/* Connections */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 420 250"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="mc-conn" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgba(37,99,235,0.55)" />
                  <stop offset="1" stopColor="rgba(22,163,74,0.35)" />
                </linearGradient>
              </defs>

              <path
                d="M60 70 C140 40, 190 40, 260 55"
                fill="none"
                stroke="url(#mc-conn)"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.9"
              />
              <path
                d="M95 185 C165 155, 210 150, 290 175"
                fill="none"
                stroke="rgba(37,99,235,0.35)"
                strokeWidth="2"
                strokeDasharray="5 7"
                opacity="0.8"
              />
              <path
                d="M70 120 C140 145, 220 140, 330 95"
                fill="none"
                stroke="rgba(22,163,74,0.28)"
                strokeWidth="2"
                strokeDasharray="7 5"
                opacity="0.85"
              />

              <circle cx="90" cy="90" r="4" fill="rgba(37,99,235,0.9)" />
              <circle cx="320" cy="60" r="4" fill="rgba(37,99,235,0.75)" />
              <circle cx="115" cy="195" r="4" fill="rgba(22,163,74,0.85)" />
              <circle cx="315" cy="165" r="4" fill="rgba(22,163,74,0.75)" />
            </svg>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="glass p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Workers
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Trusted
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Evidence
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Attached
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Certificates
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Verifiable
              </div>
            </div>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
