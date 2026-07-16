import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, ShieldAlert, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import type { LeaderboardGroup, StatusTone, Worker } from '@/data/maintchain';

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

/**
 * Editorial section header (v2).
 * Numbered mono-blue prefix, Inter Tight display title, optional mono caption,
 * optional right-side action slot.
 */
export function EditorialSectionHeader({
  number,
  title,
  caption,
  action,
}: {
  number: string;
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="section-number">{number}</div>
        <h2 className="mt-2 text-display-sm font-heading text-[var(--text-primary)]">
          {title}
        </h2>
        {caption ? (
          <p className="mt-3 max-w-3xl font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            {caption}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Masthead strip (v2). 40px sticky strip rendered directly below the nav on
 * public pages only. Hidden on workflow pages — see layout.tsx.
 */
export function MastheadStrip({
  edition,
  date,
  center,
  right = 'ledger.soroban · mainnet',
}: {
  edition: string;
  date: string;
  center: ReactNode;
  right?: string;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <span>{edition}</span>
          <span aria-hidden="true">·</span>
          <span>{date}</span>
        </div>
        <div className="hidden flex-1 justify-center font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] md:flex">
          {center}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          {right}
        </div>
      </div>
    </div>
  );
}

/**
 * Deprecated: kept for backwards compatibility during the v1 → v2 migration.
 * New code uses EditorialSectionHeader. Internal callsites are migrated over time.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  glass = false,
}: {
  label: string;
  value: string;
  helper: string;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-6 shadow-sm',
        glass
          ? 'glass'
          : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]'
      )}
    >
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-3 text-sm text-[var(--text-secondary)]">{helper}</div>
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  const iconMap = {
    verified: <CheckCircle2 className="h-4 w-4" />,
    pending: <Clock3 className="h-4 w-4" />,
    critical: <ShieldAlert className="h-4 w-4" />,
    info: <Sparkles className="h-4 w-4" />,
  };

  const toneMap: Record<StatusTone, string> = {
    verified: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    critical: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-chip border px-3 py-1 text-xs font-semibold',
        toneMap[tone]
      )}
    >
      {iconMap[tone]}
      {children}
    </span>
  );
}

export function FilterBar({
  items,
  active,
  onSelect,
}: {
  items: string[];
  active: string;
  onSelect?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect?.(item)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition',
            active === item
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function DetailPanel({
  label,
  children,
  tone,
  glass = false,
}: {
  label: string;
  children: ReactNode;
  tone?: StatusTone;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 shadow-sm',
        glass
          ? 'glass'
          : cn(
              'rounded-xl border',
              tone === 'verified' && 'border-emerald-200 bg-emerald-50/70',
              tone === 'pending' && 'border-amber-200 bg-amber-50/70',
              tone === 'critical' && 'border-red-200 bg-red-50/70',
              tone === 'info' && 'border-blue-200 bg-blue-50/70',
              !tone && 'border-[var(--border)] bg-[var(--surface)]'
            )
      )}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

export function TimelineBlock({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: StatusTone;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <span
        className={cn(
          'mt-0.5 h-3 w-3 rounded-full',
          status === 'verified' && 'bg-emerald-500',
          status === 'pending' && 'bg-amber-500',
          status === 'critical' && 'bg-red-500',
          status === 'info' && 'bg-blue-500'
        )}
      />
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <div className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</div>
      </div>
    </div>
  );
}

export function ProfileCard({ worker, glass = false }: { worker: Worker; glass?: boolean }) {
  return (
    <article
      className={cn(
        'p-6 shadow-sm',
        glass
          ? 'glass'
          : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]'
      )}
    >
      <div className="flex items-start gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--nav)] text-xl font-semibold text-white">
          {worker.name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">{worker.name}</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">{worker.specialization}</div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">{worker.location}</div>
            </div>
            <StatusBadge tone="verified">Trust {worker.trustScore}</StatusBadge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <DetailPanel glass={glass} label="Verified repairs">{String(worker.verifiedRepairs)}</DetailPanel>
        <DetailPanel glass={glass} label="Global rank">#{worker.globalRank}</DetailPanel>
        <DetailPanel glass={glass} label="Availability">{worker.availability}</DetailPanel>
        <DetailPanel glass={glass} label="Industry">{worker.industry}</DetailPanel>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{worker.summary}</p>

      <Link
        href={`/workers/${worker.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-90"
      >
        View profile <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function EvidenceGallery({
  items,
  glass = false,
}: {
  items: Array<{ kind: string; label: string }>;
  glass?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={`${item.kind}-${item.label}`}
          className={cn(
            'p-4 shadow-sm',
            glass
              ? 'glass'
              : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]'
          )}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{item.kind}</div>
          <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function RankList({ group, glass = false }: { group: LeaderboardGroup; glass?: boolean }) {
  return (
    <section className={cn('p-6 shadow-sm', glass ? 'glass' : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]')}>
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{group.title}</div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{group.description}</p>
      <div className="mt-5 space-y-3">
        {group.entries.map((entry) => (
          <div
            key={`${group.id}-${entry.rank}-${entry.label}`}
            className={cn('p-4', glass ? 'glass' : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">#{entry.rank}</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{entry.label}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{entry.supportingText}</div>
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{entry.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
