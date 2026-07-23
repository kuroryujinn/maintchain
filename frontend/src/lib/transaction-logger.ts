// frontend/src/lib/transaction-logger.ts
// Logs transaction lifecycle events to both localStorage (offline) and backend (when connected).

const LOG_KEY = 'maintchain:tx-log';

export interface TxLogEvent {
  id: string;
  walletAddress: string;
  contractId: string;
  method: string;
  state: string;
  transactionHash?: string;
  error?: string;
  rpcLatencyMs?: number;
  timestamp: string;
}

function getLog(): TxLogEvent[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLog(events: TxLogEvent[]) {
  try {
    // Keep only last 100 events
    localStorage.setItem(LOG_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    // localStorage full — clear and try again
    localStorage.removeItem(LOG_KEY);
  }
}

export function addTxLogEvent(event: Omit<TxLogEvent, 'id' | 'timestamp'>) {
  const log = getLog();
  log.push({
    ...event,
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
  });
  saveLog(log);

  // Also post to backend if available
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
  fetch(`${apiBase}/api/tx-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {
    // Silently fail — localStorage is the fallback
  });
}

export function getTxLog(): TxLogEvent[] {
  return getLog();
}

export function clearTxLog() {
  localStorage.removeItem(LOG_KEY);
}
