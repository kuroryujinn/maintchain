'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Menu, Search, X } from 'lucide-react';
import WalletConnectPanel from '@/components/WalletConnectPanel';

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
  { href: '/technician', label: 'My Tasks' },
];

export default function Nav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 text-white"
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.2), 0 0 0 1px rgba(37,99,235,0.06)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white"
                style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.35), 0 0 0 1px rgba(37,99,235,0.2)' }}
              >
                MC
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-semibold tracking-wide">MaintChain</span>
                <span className="block text-[11px] uppercase tracking-[0.28em] text-slate-400">
                  Verifiable trust network
                </span>
              </span>
            </Link>
            <div className="hidden items-center gap-4 text-sm text-slate-300 xl:flex">
              {primaryNav.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-white xl:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
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

      {/* Mobile navigation slide-out panel */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-[#0f172a] border-l border-white/10 shadow-2xl lg:hidden motion-safe:animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-sm font-semibold text-white">Navigation</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              {[...primaryNav, ...workflowNav].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
