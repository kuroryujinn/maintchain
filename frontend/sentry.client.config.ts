// GlitchTip client config (browser-side)
// Captures JavaScript errors, unhandled promise rejections, and performance data.
// GlitchTip is Sentry-compatible — uses the same @sentry/nextjs SDK.
// Reference: https://glitchtip.com/sdkdocs/javascript-react/

import * as Sentry from "@sentry/nextjs";

// Support both GlitchTip and legacy Sentry DSN env vars during migration
const dsn =
  process.env.NEXT_PUBLIC_GLITCHTIP_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  try {
    Sentry.init({
      dsn,

      environment: process.env.NODE_ENV || "production",
      release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,

      // Performance monitoring — 1% sample rate (GlitchTip recommends low rates)
      tracesSampleRate: 0.01,

      // Disable auto session tracking (GlitchTip does not support sessions)
      autoSessionTracking: false,

      // Session replay — NOT supported by GlitchTip, disable entirely
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,

      // Disable Sentry's internal logging in production
      debug: false,
    });
  } catch (error) {
    // Monitoring must NEVER break the application
    console.warn("GlitchTip client initialization failed:", error);
  }
}
