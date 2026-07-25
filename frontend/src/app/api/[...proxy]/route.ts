// frontend/src/app/api/[...proxy]/route.ts
// Catch-all API proxy with per-user session validation (option (c)).
//
// Architecture:
//   Browser ─► /api/* ─► Next.js proxy ─► BACKEND_URL (Rust backend)
//
// The proxy enforces a two-layer auth model:
//   Layer 1 (server-to-server): MAINTCHAIN_API_KEY is injected as Bearer
//   Layer 2 (per-user):        HMAC-signed session cookie validated on
//                               every request EXCEPT /api/auth/*.
//
// Auth endpoints (/api/auth/challenge, /api/auth/verify, /api/auth/logout)
// are exempt from session validation — they are the entry point for auth.
//
// On successful /api/auth/verify, the proxy creates an httpOnly Secure
// session cookie containing:
//   base64(stellar_address "|" expires_at_iso "|" HMAC-SHA256(secret, stellar_address "|" expires_at_iso))
//
// On every other request, the proxy validates this cookie, extracts the
// stellar_address, and adds it as an X-User-Address header when forwarding
// to the backend.
//
// Env vars (server-side only — NO NEXT_PUBLIC_ prefix):
//   BACKEND_URL           — Rust backend URL (e.g. http://localhost:8081)
//   MAINTCHAIN_API_KEY    — Bearer token sent to the Rust backend
//   AUTH_SECRET           — HMAC key for signing session cookies
//
// The backend does NOT need AUTH_SECRET — the proxy handles session
// issuance and validation independently.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

// ─── Constants ───────────────────────────────────────────

const SESSION_COOKIE_NAME = 'maintchain-session';
const SESSION_MAX_AGE_SECONDS = 86400; // 24 hours
const AUTH_EXEMPT_PREFIXES = ['/api/auth/'];

// Routes exempt from the API-key injection (auth endpoints need to be
// reachable without knowing the key — they're entry points).
const NO_API_KEY_PREFIXES = ['/api/auth/'];

// ─── Helpers ─────────────────────────────────────────────

function getBackendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:8081';
}

function getApiKey(): string | undefined {
  const key = process.env.MAINTCHAIN_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Dev fallback — always warn. Production MUST set AUTH_SECRET.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[proxy] AUTH_SECRET is not set — using insecure dev fallback. ' +
          'Set AUTH_SECRET in production to enable session validation.',
      );
      return 'maintchain-dev-auth-secret-change-in-production';
    }
    throw new Error('AUTH_SECRET must be set in production.');
  }
  return secret.trim();
}

/** Check if a path is exempt from session validation. */
function isAuthExempt(pathname: string): boolean {
  return AUTH_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Check if a path should NOT get the API-key injected. */
function isApiKeyExempt(pathname: string): boolean {
  return NO_API_KEY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Strip the `/api` prefix from the pathname and preserve query params.
 * Example:  /api/compliance/dashboard?foo=1 → /compliance/dashboard?foo=1
 */
function buildTargetUrl(request: NextRequest): string {
  const backendUrl = getBackendUrl().replace(/\/+$/, '');
  const pathname = request.nextUrl.pathname.replace(/^\/api/, '') || '/';
  const search = request.nextUrl.search;
  return `${backendUrl}${pathname}${search}`;
}

// ─── Session Token Helpers ───────────────────────────────

interface SessionPayload {
  stellarAddress: string;
  expiresAt: string; // ISO 8601
}

/**
 * Create an HMAC-SHA256 signature for a session payload.
 */
function signSession(stellarAddress: string, expiresAt: string): string {
  const secret = getAuthSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${stellarAddress}|${expiresAt}`);
  return hmac.digest('hex');
}

/**
 * Build the raw cookie value from session data.
 */
function encodeSessionCookie(stellarAddress: string): string {
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();
  const sig = signSession(stellarAddress, expiresAt);
  const payload = `${stellarAddress}|${expiresAt}|${sig}`;
  return Buffer.from(payload, 'utf-8').toString('base64url');
}

/**
 * Decode and validate a session cookie value.
 * Returns the stellarAddress if valid, null otherwise.
 */
function validateSessionCookie(cookieValue: string): string | null {
  try {
    const decoded = Buffer.from(cookieValue, 'base64url').toString('utf-8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;

    const [stellarAddress, expiresAt, sig] = parts;

    // Check expiry
    if (new Date(expiresAt).getTime() < Date.now()) return null;

    // Verify HMAC
    const expectedSig = signSession(stellarAddress, expiresAt);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }

    return stellarAddress;
  } catch {
    return null;
  }
}

/**
 * Build outgoing headers for the proxied request.
 * - Drops hop-by-hop headers
 * - Conditionally injects the API-key Bearer token (not for auth endpoints)
 * - Adds X-User-Address header if session is valid
 */
function buildProxyHeaders(
  request: NextRequest,
  userAddress?: string,
): Headers {
  const headers = new Headers();

  const hopByHop = new Set([
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'upgrade',
    'proxy-authorization',
    'proxy-authenticate',
  ]);

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!hopByHop.has(lower) && !lower.startsWith('proxy-') && lower !== 'content-length') {
      headers.set(key, value);
    }
  });

  // Inject API key (except for auth endpoints which are public)
  if (!isApiKeyExempt(request.nextUrl.pathname)) {
    const apiKey = getApiKey();
    if (apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
  }

  // Forward authenticated user's Stellar address
  if (userAddress) {
    headers.set('X-User-Address', userAddress);
  }

  return headers;
}

/**
 * Build the response headers from the backend response (filter hop-by-hop).
 */
function buildResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  const exclude = new Set([
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'content-encoding',
    'content-length',
  ]);

  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!exclude.has(lower)) {
      headers.set(key, value);
    }
  });

  return headers;
}

// ─── Auth-specific handlers ──────────────────────────────

/**
 * POST /api/auth/verify — special handler that intercepts the backend's
 * success response and attaches the session cookie.
 */
async function handleAuthVerify(request: NextRequest): Promise<NextResponse> {
  try {
    const targetUrl = buildTargetUrl(request);
    const proxyHeaders = buildProxyHeaders(request);

    const body = request.body ? await request.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: body ?? null,
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = buildResponseHeaders(response);

    // If verification succeeded, create a session cookie
    if (response.ok) {
      let stellarAddress: string | null = null;

      // Parse the response body to extract stellar_address
      try {
        const text = Buffer.from(responseBody).toString('utf-8');
        const json = JSON.parse(text);
        stellarAddress = json.stellar_address ?? null;
      } catch {
        // If we can't parse the body, still let the response through
        // but log a warning.
        console.warn('[proxy] /auth/verify: could not parse backend response body');
      }

      if (stellarAddress) {
        const cookieValue = encodeSessionCookie(stellarAddress);
        const expiresDate = new Date(
          Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
        );

        responseHeaders.set(
          'Set-Cookie',
          `${SESSION_COOKIE_NAME}=${cookieValue}; ` +
            `HttpOnly; Secure; SameSite=Lax; Path=/api; ` +
            `Max-Age=${SESSION_MAX_AGE_SECONDS}; ` +
            `Expires=${expiresDate.toUTCString()}`,
        );

        console.log(`[proxy] session created for ${stellarAddress}`);
      }
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: `Backend proxy failed: ${message}`,
        },
      },
      { status: 502 },
    );
  }
}

/**
 * POST /api/auth/logout — clears the session cookie.
 */
async function handleAuthLogout(): Promise<NextResponse> {
  return NextResponse.json(
    { status: 'ok', message: 'Session cleared' },
    {
      status: 200,
      headers: {
        'Set-Cookie':
          `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/api; ` +
          `Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      },
    },
  );
}

/**
 * GET /api/auth/me — returns the current session info if authenticated.
 */
async function handleAuthMe(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return NextResponse.json(
      { authenticated: false, stellar_address: null },
      { status: 200 },
    );
  }

  const stellarAddress = validateSessionCookie(cookie.value);
  if (!stellarAddress) {
    // Clear stale cookie
    return NextResponse.json(
      { authenticated: false, stellar_address: null },
      {
        status: 200,
        headers: {
          'Set-Cookie':
            `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/api; ` +
            `Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        },
      },
    );
  }

  return NextResponse.json(
    { authenticated: true, stellar_address: stellarAddress },
    { status: 200 },
  );
}

// ─── Generic proxy request handler ──────────────────────

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate session cookie for non-auth endpoints
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    const userAddress = cookie?.value
      ? validateSessionCookie(cookie.value)
      : null;

    if (!isAuthExempt(request.nextUrl.pathname) && !userAddress) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message:
              'Authentication required. Connect your Freighter wallet to get a session token.',
          },
        },
        { status: 401 },
      );
    }

    const targetUrl = buildTargetUrl(request);
    const proxyHeaders = buildProxyHeaders(request, userAddress ?? undefined);

    const body = request.body ? await request.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: body ?? null,
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = buildResponseHeaders(response);

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: `Backend proxy failed: ${message}`,
        },
      },
      { status: 502 },
    );
  }
}

// ─── Route handlers ─────────────────────────────────────

export async function GET(request: NextRequest) {
  return routeRequest(request);
}

export async function POST(request: NextRequest) {
  return routeRequest(request);
}

export async function PUT(request: NextRequest) {
  return routeRequest(request);
}

export async function DELETE(request: NextRequest) {
  return routeRequest(request);
}

export async function PATCH(request: NextRequest) {
  return routeRequest(request);
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

/**
 * Route request to the appropriate handler based on path.
 * - /api/auth/verify → special handler that attaches session cookie
 * - /api/auth/logout → clears session cookie
 * - /api/auth/me     → returns session info
 * - /api/auth/*      → forwarded as-is (challenge, etc.)
 * - everything else  → session-validated proxy request
 */
async function routeRequest(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/api/auth/verify') {
    return handleAuthVerify(request);
  }

  if (pathname === '/api/auth/logout') {
    return handleAuthLogout();
  }

  if (pathname === '/api/auth/me') {
    return handleAuthMe(request);
  }

  return proxyRequest(request);
}
