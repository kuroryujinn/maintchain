// PostHog analytics wrapper for MaintChain.
// Provides structured event tracking for user flows, conversions, and engagement.
//
// PostHog is configured via NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST.
// In development, analytics are disabled.
//
// Privacy: Wallet addresses are NEVER tracked in analytics events.
// Only anonymized prefixes or boolean flags are used for user identification.
// No private keys, signing secrets, or authentication tokens are ever captured.

import posthog from 'posthog-js';

const isProd = process.env.NODE_ENV === 'production';
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

/** Initialize PostHog — call once on app load */
export function initAnalytics() {
  if (!POSTHOG_KEY || !isProd) return;

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
    });
  } catch {
    // Analytics must never break the app
  }
}

/** Track a named event with optional properties */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
) {
  if (!POSTHOG_KEY || !isProd) return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    // Silent fail
  }
}

/** Track page view manually */
export function trackPageView(url: string, properties?: Record<string, string>) {
  if (!POSTHOG_KEY || !isProd) return;
  try {
    posthog.capture('$pageview', { $current_url: url, ...properties });
  } catch {
    // Silent fail
  }
}

// ─── Get Verified funnel ───────────────────────────────────

export function trackVerificationPageEntered() {
  trackEvent('verification_page_entered');
}

export function trackWalletConnectionInitiated() {
  trackEvent('wallet_connection_initiated');
}

export function trackWalletConnectionCompleted(properties?: { network?: string }) {
  trackEvent('wallet_connection_completed', properties);
}

export function trackVerificationStarted(properties?: { network?: string }) {
  trackEvent('verification_started', properties);
}

export function trackVerificationCompleted(properties?: { transactionHash?: string }) {
  trackEvent('verification_completed', properties);
}

export function trackVerificationFailed(properties?: { reason?: string }) {
  trackEvent('verification_failed', properties);
}

// ─── Upload / Evidence funnel ──────────────────────────────

export function trackUploadPageEntered() {
  trackEvent('upload_page_entered');
}

export function trackEvidenceFileSelected(properties?: { hasFile?: boolean }) {
  trackEvent('evidence_file_selected', properties);
}

export function trackEvidenceSubmitInitiated() {
  trackEvent('evidence_submit_initiated');
}

export function trackEvidenceSubmitted(properties?: { recordId?: string }) {
  trackEvent('evidence_submitted', properties);
}

export function trackEvidenceSubmitFailed(properties?: { error?: string }) {
  trackEvent('evidence_submit_failed', properties);
}

// ─── Approval funnel ───────────────────────────────────────

export function trackApprovalPageEntered() {
  trackEvent('approval_page_entered');
}

export function trackApprovalRecordsLoaded(properties?: { count?: number }) {
  trackEvent('approval_records_loaded', properties);
}

export function trackApprovalInitiated(properties?: { action?: 'approve' | 'reject' }) {
  trackEvent('approval_initiated', properties);
}

export function trackApprovalAction(properties?: { role?: string; action?: 'approve' | 'reject' }) {
  trackEvent('approval_action', properties);
}

export function trackApprovalFailed(properties?: { action?: 'approve' | 'reject'; error?: string }) {
  trackEvent('approval_failed', properties);
}

// ─── Feedback funnel ───────────────────────────────────────

export function trackFeedbackSubmitted(properties?: { category?: string; rating?: number }) {
  trackEvent('feedback_submitted', properties);
}
