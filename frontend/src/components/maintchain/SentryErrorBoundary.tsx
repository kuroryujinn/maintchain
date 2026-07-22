'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * SentryErrorBoundary
 *
 * Wraps the application to catch unhandled React errors, report them to
 * Sentry, and display a polished fallback UI instead of a white screen.
 *
 * Usage:
 *   <SentryErrorBoundary>
 *     <App />
 *   </SentryErrorBoundary>
 */
export default class SentryErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report the error to Sentry with component stack trace
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', errorInfo.componentStack ?? '');
      scope.setTag('error-boundary', 'root');
      Sentry.captureException(error);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default polished fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6fa] p-8">
          <div
            className="mx-auto max-w-md text-center"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              borderRadius: '24px',
              boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 32px rgba(15,23,42,0.07)',
              padding: '48px',
            }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
              Something went wrong
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              An unexpected error occurred. Our team has been automatically notified.
              Please try refreshing the page.
            </p>

            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4 text-left">
                <p className="mb-1 text-xs font-semibold text-red-700">Error details (dev only):</p>
                <pre className="max-h-32 overflow-auto text-xs text-red-600">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--text-secondary)]"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)]"
              >
                <RefreshCw className="h-4 w-4" />
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
