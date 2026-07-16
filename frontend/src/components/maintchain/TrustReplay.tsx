'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import FadeInView from '@/components/maintchain/FadeInView';
import { DetailPanel, StatusBadge, cn } from '@/components/maintchain/ui';
import { trustReplayStages } from '@/data/maintchain';

type StageStatus = 'completed' | 'current' | 'upcoming';

function stageUiTone(status: StageStatus) {
  switch (status) {
    case 'completed':
      return 'verified' as const;
    case 'current':
      return 'info' as const;
    case 'upcoming':
    default:
      return 'pending' as const;
  }
}

function stageUiColor(status: StageStatus) {
  switch (status) {
    case 'completed':
      return {
        chipBg: 'bg-[rgba(22,163,74,0.15)]',
        chipBorder: 'border-[rgba(22,163,74,0.35)]',
        chipText: 'text-[#15803d]',
        dotBg: 'bg-[var(--success)]',
        iconBg: 'bg-[var(--success)]',
        iconText: 'text-white',
      };
    case 'current':
      return {
        chipBg: 'bg-[rgba(37,99,235,0.12)]',
        chipBorder: 'border-[rgba(37,99,235,0.35)]',
        chipText: 'text-[var(--primary)]',
        dotBg: 'bg-[var(--primary)]',
        iconBg: 'bg-[var(--primary)]',
        iconText: 'text-white',
      };
    case 'upcoming':
    default:
      return {
        chipBg: 'bg-[rgba(107,114,128,0.08)]',
        chipBorder: 'border-[var(--border)]',
        chipText: 'text-[var(--text-secondary)]',
        dotBg: 'bg-[var(--border)]',
        iconBg: 'bg-[var(--border)]',
        iconText: 'text-[var(--text-secondary)]',
      };
  }
}

export default function TrustReplay() {
  const initialIndex = useMemo(
    () =>
      Math.max(
        0,
        trustReplayStages.findIndex(
          (stage) => stage.status === 'current'
        )
      ),
    []
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeStage = trustReplayStages[activeIndex];

  const activeStageStatus = (activeStage?.status ?? 'upcoming') as StageStatus;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="glass p-6">
        {/* Horizontal timeline */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {trustReplayStages.map((stage, index) => {
            const isActive = index === activeIndex;
            const status = stage.status as StageStatus;

            const ui = stageUiColor(status);
            const label =
              status === 'completed'
                ? 'Completed'
                : status === 'current'
                  ? 'Current'
                  : 'Upcoming';

            const badgeTone = stageUiTone(status);

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="min-w-[14rem] flex-1 text-left transition hover:opacity-95"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={cn(
                    'rounded-2xl border px-4 py-4 motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-200',
                    ui.chipBg,
                    ui.chipBorder,
                    isActive && 'shadow-[0_8px_20px_rgba(2,6,23,0.06)]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold',
                        ui.iconBg,
                        ui.iconText
                      )}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <StatusBadge tone={badgeTone}>
                      {label}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                    {stage.title}
                  </div>

                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {isActive ? 'Selected' : 'Tap to expand'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expand inline stage details */}
        <div className="mt-6 glass p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={stageUiTone(activeStageStatus)}>
              Stage {activeIndex + 1} of {trustReplayStages.length}
            </StatusBadge>
            <StatusBadge tone="verified">Audit trail ready</StatusBadge>
          </div>

          <h3 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            {activeStage.title}
          </h3>

          <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">
            {activeStage.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {activeStage.details.map((detail) => (
              <DetailPanel key={detail.label} label={detail.label}>
                {detail.value}
              </DetailPanel>
            ))}
          </div>

          {/* Smooth progress animation (subtle) */}
          <div className="mt-6">
            <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] motion-safe:transition-[width] motion-safe:duration-300"
                style={{
                  width: `${((activeIndex + 1) / trustReplayStages.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <FadeInView direction="up" distance="sm" duration={400} delay={120} className="grid gap-4">
        <DetailPanel label="Trust Replay rule" tone="info">
          The flow keeps pending actions visible without giving them more visual weight than verified history.
        </DetailPanel>
        <DetailPanel label="What expands inline" tone="verified">
          Photos, videos, parts replaced, customer review, technician context, and blockchain verification stay attached to the selected stage.
        </DetailPanel>
        <DetailPanel label="Why it matters">
          MaintChain does not ask users to trust a claim. It lets them inspect how trust was earned.
        </DetailPanel>
      </FadeInView>
    </div>
  );
}
