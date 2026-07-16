'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { MastheadStrip } from '@/components/maintchain/ui';

const PUBLIC_ROUTES = new Set<string>([
  '/',
  '/live-network',
  '/workers',
  '/machines',
  '/leaderboard',
  '/certificates',
  '/industries',
]);

const PUBLIC_DYNAMIC_PREFIXES = ['/workers/', '/machines/', '/certificates/'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_DYNAMIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function RouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const showMasthead = isPublicRoute(pathname);

  return (
    <>
      {showMasthead ? <MastheadStrip
        edition="Edition 47"
        date="11 July 2026"
        center={
          <>
            <span>1,284 verified today</span>
            <span aria-hidden="true">·</span>
            <span>96.4 network index</span>
            <span aria-hidden="true">·</span>
            <span>47 countries</span>
          </>
        }
      /> : null}
      {children}
    </>
  );
}
