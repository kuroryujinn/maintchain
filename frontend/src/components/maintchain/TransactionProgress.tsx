// frontend/src/components/maintchain/TransactionProgress.tsx
// Visual progress indicator for the transaction lifecycle.

'use client';
import { TxState, TX_STATE_MESSAGES, useTransactionState, FAILURE_STATES } from '@/hooks/useTransactionState';
import { Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';

interface TransactionProgressProps {
  stateMachine: ReturnType<typeof useTransactionState>;
  explorerUrl?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const STATE_ICONS: Record<string, React.ReactNode> = {
  [TxState.PREPARING]: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  [TxState.SIMULATING]: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  [TxState.WAITING_FOR_SIGNATURE]: <Clock className="h-5 w-5 animate-pulse text-amber-500" />,
  [TxState.SUBMITTING]: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  [TxState.PENDING]: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  [TxState.CONFIRMED]: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  [TxState.DATABASE_SYNC]: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  [TxState.COMPLETE]: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  [TxState.SIMULATION_FAILED]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.SIGNATURE_REJECTED]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.RPC_ERROR]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.INSUFFICIENT_BALANCE]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.CONTRACT_REVERT]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.TIMEOUT]: <AlertCircle className="h-5 w-5 text-red-500" />,
  [TxState.DATABASE_SYNC_FAILED]: <AlertCircle className="h-5 w-5 text-red-500" />,
};

const STATE_COLORS: Record<string, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'border-gray-200 bg-gray-50 text-gray-800',
};

export function TransactionProgress({
  stateMachine,
  explorerUrl,
  onRetry,
  onDismiss,
}: TransactionProgressProps) {
  const { state, isCompleted, isFailed, isRetryable, retryCount, maxRetries, transactionHash } = stateMachine;

  if (state === TxState.IDLE) return null;

  const msg = TX_STATE_MESSAGES[state];
  const icon = STATE_ICONS[state] || <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  const colorClass = STATE_COLORS[msg.tone];

  return (
    <div className={`rounded-xl border p-4 text-sm transition-all motion-safe:animate-[fadeSlideUp_0.3s_ease-out] ${colorClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{msg.title}</p>
          <p className="mt-0.5 text-xs opacity-80">{msg.description}</p>

          {/* Retry counter */}
          {retryCount > 0 && (
            <p className="mt-1 text-xs opacity-70">
              Attempt {retryCount + 1} of {maxRetries + 1}
            </p>
          )}

          {/* Transaction hash + explorer link */}
          {transactionHash && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-xs">{transactionHash.slice(0, 16)}...</span>
              {explorerUrl && (
                <a
                  href={`${explorerUrl}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline hover:opacity-80"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Retry button */}
          {isFailed && isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium hover:bg-white transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1 inline" />
              Retry
            </button>
          )}

          {/* Dismiss button on terminal states */}
          {(isCompleted || (isFailed && !isRetryable)) && onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium hover:bg-white transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progressive step indicator ──

const PROGRESSIVE_STEPS = [
  { state: TxState.PREPARING, label: 'Prepare' },
  { state: TxState.SIMULATING, label: 'Simulate' },
  { state: TxState.WAITING_FOR_SIGNATURE, label: 'Sign' },
  { state: TxState.SUBMITTING, label: 'Submit' },
  { state: TxState.PENDING, label: 'Confirm' },
  { state: TxState.DATABASE_SYNC, label: 'Sync' },
  { state: TxState.COMPLETE, label: 'Done' },
];

export function TransactionSteps({ currentState }: { currentState: TxState }) {
  const currentIdx = PROGRESSIVE_STEPS.findIndex(s => s.state === currentState);

  return (
    <div className="flex items-center gap-2 py-2">
      {PROGRESSIVE_STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isPending = i > currentIdx;

        return (
          <div key={step.state} className="flex items-center gap-1">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
              ${isDone ? 'bg-emerald-500 text-white' : ''}
              ${isCurrent ? 'bg-blue-500 text-white ring-2 ring-blue-300 animate-pulse' : ''}
              ${isPending ? 'bg-gray-200 text-gray-400' : ''}
            `}>
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < PROGRESSIVE_STEPS.length - 1 && (
              <div className={`h-0.5 w-5 transition-colors ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
