'use client';

import { useEffect } from 'react';
import { initAnalytics, trackPageView } from '@/lib/analytics';
import { usePathname } from 'next/navigation';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageView(window.location.href, { path: pathname });
    }
  }, [pathname]);

  return <>{children}</>;
}
