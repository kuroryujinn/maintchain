'use client';

import { useState, useEffect } from 'react';
import { X, FlaskConical, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const BANNER_DISMISSED_KEY = 'maintchain:tech-preview-banner-dismissed';

export default function TechnicalPreviewBanner() {
  // Start with a neutral state — no layout shift in either direction.
  // We mount nothing on SSR, then check localStorage on the client.
  // This avoids CLS from a banner that appears then disappears.
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      // localStorage unavailable — show banner by default (safe fallback)
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(BANNER_DISMISSED_KEY, '1'); } catch { /* noop */ }
  };

  // Reserve the same space as the banner even when hidden, to prevent CLS
  // from the banner appearing/disappearing after hydration.
  if (!mounted || !visible) return <div className="h-[52px]" aria-hidden="true" />;

  return (
    <div
      className="relative border-b text-xs sm:text-sm"
      style={{
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        borderColor: 'rgba(180, 120, 0, 0.3)',
        color: '#1c1917',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <FlaskConical className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <span className="font-medium">
            <strong>Technical Preview</strong> — This is a live test of MaintChain&apos;s
            multi-party approval and compliance certificate system on{' '}
            <strong>Stellar Testnet</strong>. We&apos;re looking for bugs, confusing flows,
            and feedback — not production data.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/technical-preview"
            className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition hover:bg-black/20 sm:text-xs"
          >
            What to test <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            onClick={dismiss}
            className="rounded-full p-1 transition hover:bg-black/10"
            aria-label="Dismiss technical preview notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
