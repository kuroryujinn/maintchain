import Link from 'next/link';

const columns = [
  {
    title: 'About',
    items: [
      { label: 'MaintChain Overview', href: '/' },
      { label: 'How Trust Works', href: '/live-network' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Documentation', href: '/docs' },
      { label: 'GitHub', href: 'https://github.com/' },
    ],
  },
  {
    title: 'Network',
    items: [
      { label: 'Stellar', href: 'https://www.stellar.org/' },
      { label: 'Certificates', href: '/certificates' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-14 overflow-hidden bg-[var(--nav)]">
      {/* Subtle scan-line overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(148,163,184,0.3) 0px, rgba(148,163,184,0.3) 1px, transparent 1px, transparent 8px)',
        }}
      />
      {/* Soft glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.3), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Editorial masthead-style border */}
        <div className="mb-10 h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
                {col.title}
              </div>
              <ul className="mt-5 space-y-3 text-sm text-white/60">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="transition-all duration-200 hover:text-white hover:opacity-90"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs text-white/40 sm:flex-row">
          <div className="flex items-center gap-3 font-mono uppercase tracking-[0.2em]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
            Ethering verified
          </div>
          <div>
            © {new Date().getFullYear()} MaintChain. Evidence-first trust for industrial maintenance.
          </div>
        </div>
      </div>
    </footer>
  );
}
