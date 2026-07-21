// Sentry edge config (middleware, edge runtime)
// Captures errors thrown in Edge Runtime (e.g., Next.js Middleware).

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  debug: false,
});
