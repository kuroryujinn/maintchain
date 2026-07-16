import FadeInView from '@/components/maintchain/FadeInView';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

const leftTitle = 'Traditional Maintenance';
const rightTitle = 'MaintChain';

const traditional = ['Paper records', 'Editable history', 'Manual verification', 'Difficult audits'];
const maintchain = ['Immutable records', 'Verified workers', 'Portable reputation', 'Blockchain verification'];

export default function ComparisonCard() {
  return (
    <FadeInView as="section" direction="up" distance="sm" duration={450} className="glass p-6 sm:p-10" style={{ background: 'linear-gradient(180deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.03) 100%)' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{leftTitle}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">What breaks in audits</div>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {traditional.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass p-6" style={{ borderColor: 'rgba(37, 99, 235, 0.3)' }}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[var(--primary)]" />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{rightTitle}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Built for verifiability</div>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {maintchain.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FadeInView>
  );
}
