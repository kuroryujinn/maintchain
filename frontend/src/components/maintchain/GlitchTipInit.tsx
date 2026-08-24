'use client';

import { useEffect } from 'react';
import { setAppContext } from '@/lib/glitchtip';

/**
 * GlitchTipInit
 *
 * Sets global application context for GlitchTip error tracking on mount.
 * Place this inside the root layout to ensure context is available for all errors.
 */
export default function GlitchTipInit() {
  useEffect(() => {
    setAppContext({
      network: 'testnet',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
    });
  }, []);

  return null;
}
