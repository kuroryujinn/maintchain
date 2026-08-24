// frontend/src/lib/glitchtip.ts
// GlitchTip context utilities for structured error monitoring.
// Provides wallet, Soroban transaction, and verification workflow context
// without modifying business logic.
//
// GlitchTip is Sentry-compatible — uses @sentry/nextjs APIs.

import * as Sentry from "@sentry/nextjs";

// ─── Severity levels (aligned with GlitchTip/Sentry) ────────────

export const Severity = {
  Info: "info" as const,
  Warning: "warning" as const,
  Error: "error" as const,
  Fatal: "fatal" as const,
};

// ─── Application context tags ───────────────────────────────────

/**
 * Set global application context for all subsequent events.
 * Called once after GlitchTip initialization.
 */
export function setAppContext(context: {
  network?: string;
  walletAddress?: string;
  appVersion?: string;
}) {
  Sentry.withScope((scope) => {
    if (context.network) scope.setTag("network", context.network);
    if (context.walletAddress) {
      // Only prefix — do NOT log the full address by default
      scope.setTag("wallet_prefix", context.walletAddress.slice(0, 8));
    }
    if (context.appVersion) scope.setTag("app_version", context.appVersion);
    scope.setTag("application", "maintchain");
  });
}

// ─── Wallet error monitoring ────────────────────────────────────

export type WalletErrorType =
  | "wallet_connect_failed"
  | "wallet_rejected"
  | "wallet_network_mismatch"
  | "wallet_not_installed"
  | "wallet_signing_failed"
  | "wallet_address_unavailable";

/**
 * Capture a wallet-related error with structured context.
 * Expected user cancellations are logged as warnings, not errors.
 */
export function captureWalletError(
  errorType: WalletErrorType,
  error: Error | string,
  context?: {
    walletAddress?: string | null;
    network?: string;
    expected?: boolean; // true for user cancellations
  },
) {
  const severity =
    context?.expected || errorType === "wallet_rejected"
      ? Severity.Warning
      : Severity.Error;

  Sentry.withScope((scope) => {
    scope.setTag("error_category", "wallet");
    scope.setTag("wallet_error_type", errorType);
    if (context?.network) scope.setTag("network", context.network);
    if (context?.walletAddress) {
      scope.setTag("wallet_prefix", context.walletAddress.slice(0, 8));
    }
    scope.setLevel(severity as any);
    Sentry.captureException(
      typeof error === "string" ? new Error(error) : error,
    );
  });
}

// ─── Soroban transaction monitoring ─────────────────────────────

export type TransactionStage =
  | "transaction_prepare"
  | "transaction_simulation"
  | "transaction_signing"
  | "transaction_submission"
  | "transaction_confirmation"
  | "transaction_failure";

/**
 * Capture a Soroban transaction event with structured blockchain context.
 */
export function captureTransactionEvent(
  stage: TransactionStage,
  context: {
    network: string;
    contractType: string;
    contractId?: string | null;
    method?: string;
    status?: string;
    transactionHash?: string | null;
    error?: string;
    simulationStatus?: string;
  },
) {
  Sentry.withScope((scope) => {
    scope.setTag("error_category", "soroban");
    scope.setTag("transaction_stage", stage);
    scope.setTag("network", context.network);
    scope.setTag("contract_type", context.contractType);
    if (context.contractId) {
      scope.setTag("contract_id_prefix", context.contractId.slice(0, 12));
    }
    if (context.method) scope.setTag("contract_method", context.method);
    if (context.status) scope.setTag("tx_status", context.status);
    if (context.transactionHash) {
      scope.setTag("tx_hash_prefix", context.transactionHash.slice(0, 12));
    }
    if (context.simulationStatus) {
      scope.setTag("simulation_status", context.simulationStatus);
    }

    if (stage === "transaction_failure" && context.error) {
      scope.setLevel("error" as any);
      Sentry.captureException(new Error(`Transaction failed: ${context.error}`));
    } else {
      scope.setLevel("info" as any);
      Sentry.captureMessage(`Transaction ${stage}`);
    }
  });
}

// ─── Verification workflow monitoring ────────────────────────────

export type VerificationStage =
  | "verification_started"
  | "wallet_identified"
  | "user_data_loaded"
  | "contract_config_loaded"
  | "contract_id_validated"
  | "transaction_constructed"
  | "simulation_performed"
  | "transaction_signed"
  | "transaction_submitted"
  | "transaction_confirmed"
  | "verification_failed";

/**
 * Capture a verification workflow stage with structured context.
 * Useful for diagnosing where the "Invalid contract ID" error occurs.
 */
export function captureVerificationStage(
  stage: VerificationStage,
  context?: {
    walletAddress?: string | null;
    network?: string;
    contractId?: string;
    method?: string;
    reason?: string;
    error?: string;
  },
) {
  Sentry.withScope((scope) => {
    scope.setTag("error_category", "verification");
    scope.setTag("verification_stage", stage);
    if (context?.network) scope.setTag("network", context.network);
    if (context?.walletAddress) {
      scope.setTag("wallet_prefix", context.walletAddress.slice(0, 8));
    }
    if (context?.contractId) {
      scope.setTag("contract_id_prefix", context.contractId.slice(0, 12));
    }
    if (context?.method) scope.setTag("contract_method", context.method);
    if (context?.reason) scope.setTag("failure_reason", context.reason);

    if (stage === "verification_failed") {
      scope.setLevel("error" as any);
      Sentry.captureException(
        new Error(
          `Verification failed at stage: ${stage}${context?.reason ? ` — ${context.reason}` : ""}${context?.error ? `: ${context.error}` : ""}`,
        ),
      );
    } else {
      scope.setLevel("info" as any);
      Sentry.captureMessage(`Verification: ${stage}`);
    }
  });
}

// ─── API error monitoring ───────────────────────────────────────

/**
 * Capture an API error with structured context.
 * Should be called for 5xx errors and genuine server-side failures.
 */
export function captureApiError(
  error: Error | string,
  context: {
    method: string;
    route: string;
    statusCode: number;
    environment?: string;
    requestId?: string;
  },
) {
  // Only capture server errors (5xx), not client errors (4xx)
  if (context.statusCode < 500) return;

  Sentry.withScope((scope) => {
    scope.setTag("error_category", "api");
    scope.setTag("http_method", context.method);
    scope.setTag("http_route", context.route);
    scope.setTag("http_status_code", String(context.statusCode));
    if (context.environment) scope.setTag("environment", context.environment);
    if (context.requestId) scope.setTag("request_id", context.requestId);
    scope.setLevel("error" as any);
    Sentry.captureException(
      typeof error === "string" ? new Error(error) : error,
    );
  });
}

// ─── Explicit test event ────────────────────────────────────────

/**
 * Send a controlled test event to verify GlitchTip integration.
 * Use only in development or via a protected admin endpoint.
 */
export function sendTestEvent() {
  Sentry.captureException(
    new Error("MaintChain GlitchTip integration test"),
  );
}
