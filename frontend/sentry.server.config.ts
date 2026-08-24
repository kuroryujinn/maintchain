// GlitchTip server config (server components, API routes)
// Captures errors thrown during server-side rendering and API route execution.
// GlitchTip is Sentry-compatible — uses the same @sentry/nextjs SDK.
// Reference: https://glitchtip.com/sdkdocs/node/

import * as Sentry from "@sentry/nextjs";

// Support both GlitchTip and legacy Sentry DSN env vars during migration
const dsn =
  process.env.GLITCHTIP_DSN ||
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_GLITCHTIP_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  try {
    Sentry.init({
      dsn,

      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
      release: process.env.SENTRY_RELEASE || undefined,

      // Performance monitoring — 1% sample rate (GlitchTip recommends low rates)
      tracesSampleRate: 0.01,

      // Disable auto session tracking (GlitchTip does not support sessions)
      autoSessionTracking: false,

      debug: false,
    });
  } catch (error) {
    // Monitoring must NEVER break the application
    console.warn("GlitchTip server initialization failed:", error);
  }
}
