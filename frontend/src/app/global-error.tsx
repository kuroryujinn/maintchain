'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * global-error.tsx
 *
 * Next.js App Router convention: this file wraps the entire application
 * as the outermost error boundary. It catches errors that occur in the
 * root layout itself, which the inner SentryErrorBoundary cannot reach.
 *
 * This file MUST:
 *   - be a Client Component ('use client')
 *   - define a default export that accepts { error, reset }
 *   - render its own <html> and <body> tags (it replaces the root layout)
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('error-boundary', 'global');
      scope.setExtra('digest', error.digest ?? '');
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f6fa',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center' as const,
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: '24px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 32px rgba(15,23,42,0.07)',
            padding: '48px',
          }}
        >
          <div
            style={{
              margin: '0 auto',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle style={{ width: '32px', height: '32px', color: '#dc2626' }} />
          </div>

          <h2 style={{ marginTop: '24px', fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
            Application error
          </h2>

          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.6', color: '#64748b' }}>
            A critical error occurred. The team has been automatically notified.
            Please try refreshing the page.
          </p>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                borderRadius: '9999px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '9999px',
                border: 'none',
                background: '#2563eb',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
