// MaintChain API Smoke Tests
// Uses vitest to test critical API endpoints against a live deployment.
//
// Run: SMOKE_BASE_URL=https://your-app.vercel.app npx vitest run tests/smoke/api-health.test.ts

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.SMOKE_BASE_URL;

describe.skipIf(!BASE_URL)('API Smoke Tests', () => {
  const timeout = parseInt(process.env.SMOKE_TIMEOUT || '30000', 10);

  describe('GET /api/metrics', () => {
    it('returns 200 or 401 (protected endpoint)', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`, { signal: AbortSignal.timeout(timeout) });
      // 200 = direct access, 401 = behind auth proxy (expected in production)
      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    it('contains uptime when accessible', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`, { signal: AbortSignal.timeout(timeout) });
      if (response.status === 200) {
        const data = await response.json();
        expect(typeof data.uptime).toBe('number');
        expect(data.uptime).toBeGreaterThanOrEqual(0);
      } else {
        // 401 = behind auth proxy, skip content checks
        expect(response.status).toBe(401);
      }
    });

    it('contains memory metrics when accessible', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`, { signal: AbortSignal.timeout(timeout) });
      if (response.status === 200) {
        const data = await response.json();
        expect(data.memory).toBeDefined();
        expect(typeof data.memory.heapUsed).toBe('number');
        expect(typeof data.memory.heapTotal).toBe('number');
        expect(typeof data.memory.rss).toBe('number');
      } else {
        expect(response.status).toBe(401);
      }
    });

    it('responds within 5 seconds', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/metrics`, { signal: AbortSignal.timeout(timeout) });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Homepage', () => {
    it('returns 200', async () => {
      const response = await fetch(BASE_URL!, { signal: AbortSignal.timeout(timeout) });
      expect(response.status).toBe(200);
    });

    it('contains MaintChain content', async () => {
      const response = await fetch(BASE_URL!, { signal: AbortSignal.timeout(timeout) });
      const html = await response.text();
      expect(html.toLowerCase()).toContain('maintchain');
    });

    it('has no catastrophic errors', async () => {
      const response = await fetch(BASE_URL!, { signal: AbortSignal.timeout(timeout) });
      const html = await response.text();
      expect(html).not.toContain('Application error');
      expect(html).not.toContain('Unhandled Runtime Error');
    });
  });

  describe('Critical Routes', () => {
    const routes = [
      '/get-verified',
      '/upload',
      '/approve',
      '/audit',
      '/certificates',
      '/feedback',
      '/register',
    ];

    for (const route of routes) {
      it(`${route} returns 200`, async () => {
        const response = await fetch(`${BASE_URL}${route}`, { signal: AbortSignal.timeout(timeout) });
        expect(response.status).toBe(200);
      });
    }
  });

  describe('Security', () => {
    it('homepage uses HTTPS', () => {
      expect(BASE_URL).toMatch(/^https:\/\//);
    });

    it('no secrets in homepage HTML', async () => {
      const response = await fetch(BASE_URL!, { signal: AbortSignal.timeout(timeout) });
      const html = await response.text();
      expect(html).not.toMatch(/private[_\s]?key/i);
      expect(html).not.toMatch(/seed[_\s]?phrase/i);
      expect(html).not.toContain('MAINTCHAIN_API_KEY');
      expect(html).not.toContain('AUTH_SECRET');
    });
  });
});
