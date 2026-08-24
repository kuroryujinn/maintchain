// scripts/synthetic-users/utils/http.mjs
// HTTP helpers with retry logic for Stellar Testnet Friendbot and RPC calls.

/**
 * Sleep for the specified number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST JSON with retry logic. Handles rate limits (429) and transient errors.
 *
 * @param {string} url
 * @param {object} body
 * @param {{ retries?: number, backoffMs?: number, label?: string }} options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function postJsonWithRetry(url, body, options = {}) {
  const { retries = 3, backoffMs = 2000, label = 'POST' } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return await res.json();
      }

      // Rate limit — wait and retry
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : backoffMs * attempt;
        console.warn(
          `  ⏳ ${label}: rate limited (429), waiting ${waitMs}ms before retry ${attempt}/${retries}`
        );
        await sleep(waitMs);
        continue;
      }

      // Server error — retry
      if (res.status >= 500) {
        const text = await res.text().catch(() => '');
        console.warn(
          `  ⚠️  ${label}: server error ${res.status}, retry ${attempt}/${retries}: ${text.slice(0, 100)}`
        );
        await sleep(backoffMs * attempt);
        continue;
      }

      // Client error — don't retry
      const text = await res.text().catch(() => '');
      throw new Error(`${label} failed (${res.status}): ${text.slice(0, 200)}`);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(
        `  ⚠️  ${label}: attempt ${attempt}/${retries} failed: ${err.message}`
      );
      await sleep(backoffMs * attempt);
    }
  }
}

/**
 * GET JSON with retry logic.
 *
 * @param {string} url
 * @param {{ retries?: number, backoffMs?: number, label?: string }} options
 * @returns {Promise<any>}
 */
export async function getJsonWithRetry(url, options = {}) {
  const { retries = 3, backoffMs = 1000, label = 'GET' } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 429) {
        const waitMs = backoffMs * attempt * 2;
        await sleep(waitMs);
        continue;
      }
      if (res.status >= 500 && attempt < retries) {
        await sleep(backoffMs * attempt);
        continue;
      }
      return null; // 404 or non-retryable client error
    } catch {
      if (attempt === retries) return null;
      await sleep(backoffMs * attempt);
    }
  }
  return null;
}
