// Sentry server config (server components, API routes)
// Captures errors thrown during server-side rendering and API route execution.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  debug: false,
});
