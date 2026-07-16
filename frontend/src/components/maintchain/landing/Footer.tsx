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
    <footer className="mt-14 bg-[#0b1220] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                {col.title}
              </div>
              <ul className="mt-5 space-y-3 text-sm text-white/80">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="transition hover:text-white hover:opacity-90"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
          © {new Date().getFullYear()} MaintChain. Evidence-first trust for industrial maintenance.
        </div>
      </div>
    </footer>
  );
}
