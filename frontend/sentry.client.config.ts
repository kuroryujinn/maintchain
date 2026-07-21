// Sentry client config (browser-side)
// Captures JavaScript errors, unhandled promise rejections, and performance data.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: 0.1,

  // Session replay — sample 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Uncomment to enable Spotlight for local debugging
  // spotlight: process.env.NODE_ENV === 'development',

  // Disable Sentry's internal logging in production
  debug: false,
});
