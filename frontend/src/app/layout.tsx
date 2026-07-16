import './globals.css';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { Bell, Menu, Search } from 'lucide-react';

import WalletConnectPanel from '@/components/WalletConnectPanel';
import RouteShell from '@/components/maintchain/RouteShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export const metadata = {
  title: 'MaintChain | Verifiable reputation for industrial maintenance',
  description: 'A global trust network for verified repairs, machine history, certificates, and worker reputation.',
};

const primaryNav = [
  { href: '/', label: 'Home' },
  { href: '/live-network', label: 'Live Network' },
  { href: '/workers', label: 'Discover Workers' },
  { href: '/machines', label: 'Machines' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/industries', label: 'Industries' },
  { href: '/dashboard', label: 'Dashboard' },
];

const workflowNav = [
  { href: '/upload', label: 'Upload' },
  { href: '/approve', label: 'Approve' },
  { href: '/audit', label: 'Audit' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${interTight.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <nav className="fixed inset-x-0 top-0 z-50 text-white" style={{ background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(15,23,42,0.2), 0 0 0 1px rgba(37,99,235,0.06)' }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white" style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.35), 0 0 0 1px rgba(37,99,235,0.2)' }}>MC</span>
                <span className="leading-tight">
                  <span className="block text-lg font-semibold tracking-wide">MaintChain</span>
                  <span className="block text-[11px] uppercase tracking-[0.28em] text-slate-400">Verifiable trust network</span>
                </span>
              </Link>

              <div className="hidden items-center gap-4 text-sm text-slate-300 xl:flex">
                {primaryNav.map((item) => (
                  <Link key={item.href} href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="hidden items-center gap-2 text-xs text-slate-400 lg:flex xl:hidden">
                <Menu className="h-4 w-4" />
                Browse routes below
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/10 md:inline-flex"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </button>
              <button
                type="button"
                className="hidden rounded-full border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:border-white/30 hover:bg-white/10 md:inline-flex"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/10 sm:inline-flex"
              >
                User Profile
              </button>
              <WalletConnectPanel compact className="text-white" />
            </div>
          </div>
          {/* Gradient keyline divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 text-sm text-slate-300 sm:px-6 lg:px-8">
              {[...primaryNav, ...workflowNav].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition-all duration-200 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <RouteShell>
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
            {children}
          </main>
        </RouteShell>
      </body>
    </html>
  );
}
