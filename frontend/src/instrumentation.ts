// Instrumentation for GlitchTip server-side initialization.
// Next.js automatically runs this file on server startup.
// GlitchTip is Sentry-compatible — uses the same @sentry/nextjs SDK.
// https://glitchtip.com/sdkdocs/javascript-react/

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
