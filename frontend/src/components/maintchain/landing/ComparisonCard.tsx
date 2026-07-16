import FadeInView from '@/components/maintchain/FadeInView';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

const leftTitle = 'Traditional Maintenance';
const rightTitle = 'MaintChain';

const traditional = ['Paper records', 'Editable history', 'Manual verification', 'Difficult audits'];
const maintchain = ['Immutable records', 'Verified workers', 'Portable reputation', 'Blockchain verification'];

export default function ComparisonCard() {
  return (
    <div className="space-y-6">
      {/* Editorial masthead-style gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeInView direction="up" distance="sm" duration={400} className="glass p-6 border-amber-200/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{leftTitle}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">What breaks in audits</div>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {traditional.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 shrink-0">
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] pt-0.5">{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 h-px bg-gradient-to-r from-amber-200/40 to-transparent" />
          <div className="mt-4 text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-[0.15em]">
            Fragile audit trails
          </div>
        </FadeInView>

        <FadeInView direction="up" distance="sm" duration={400} delay={80} className="glass-glow-green p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{rightTitle}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Built for verifiability</div>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {maintchain.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] pt-0.5">{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 h-px bg-gradient-to-r from-emerald-300/40 to-transparent" />
          <div className="mt-4 text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-[0.15em]">
            Verifiable on Soroban
          </div>
        </FadeInView>
      </div>
    </div>
  );
}
