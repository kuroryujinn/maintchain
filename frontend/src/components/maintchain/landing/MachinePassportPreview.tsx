import Link from 'next/link';
import { ArrowRight, Cpu, ChevronRight } from 'lucide-react';

import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader } from '@/components/maintchain/ui';
import { machines } from '@/data/maintchain';

function Step({ index, label }: { index: number; label: string }) {
  const isDone = index >= 2;
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
          isDone
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]'
        }`}
      >
        <span className="text-sm font-semibold">{index + 1}</span>
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
    </div>
  );
}

export default function MachinePassportPreview() {
  const machine = machines[0];

  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="mx-auto max-w-7xl px-4">
      <div className="glass p-6 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-[var(--text-primary)]">
              <Cpu className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                Machine Passport
              </span>
            </div>

            <EditorialSectionHeader
              number="05"
              title="A permanent maintenance history for every machine"
              caption="Machine Passport · Every machine carries a verifiable timeline."
            />

            <div className="glass p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                Passport timeline
              </div>

              <div className="mt-6 space-y-4">
                <Step index={0} label="Installed" />
                <ChevronRight className="mx-auto h-4 w-4 text-[var(--text-secondary)]" />
                <Step index={1} label="Maintenance" />
                <ChevronRight className="mx-auto h-4 w-4 text-[var(--text-secondary)]" />
                <Step index={2} label="Inspection" />
                <ChevronRight className="mx-auto h-4 w-4 text-[var(--text-secondary)]" />
                <Step index={3} label="Certificate" />
                <ChevronRight className="mx-auto h-4 w-4 text-[var(--text-secondary)]" />
                <Step index={4} label="Recorded on Stellar" />
              </div>
            </div>

            <div>
              <Link
                href={`/machines/${machine.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                View Machine History <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="glass p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Machine</div>
              <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{machine.name}</div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">{machine.industry}</div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="glass p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Status</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{machine.status}</div>
                </div>
                <div className="glass p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Site</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{machine.site}</div>
                </div>
              </div>

              <div className="mt-6 glass p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Certificates</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {machine.certificates.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="glass px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </FadeInView>
  );
}
