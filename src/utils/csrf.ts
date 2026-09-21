import { NextResponse } from 'next/server';

/**
 * Safely parses a raw header string (Origin or Referer) into its URL origin
 * (e.g. "https://tulipguestrooms.com" or "http://localhost:3000").
 * Returns null if the string is empty or cannot be parsed as a valid URL.
 */
function toOrigin(rawUrl: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const url = new URL(rawUrl.trim());
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Allowed origins for state-changing API requests.
 *
 * In production this is derived from NEXT_PUBLIC_SITE_URL.
 * In development we also allow localhost origins so `next dev` works.
 *
 * Never falls back to a wildcard '*' — if the env var is missing in prod we fail safe.
 */
function getAllowedOrigins(): string[] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origins: string[] = [];

  if (siteUrl) {
    const siteOrigin = toOrigin(siteUrl);
    if (siteOrigin) origins.push(siteOrigin);
  }

  // Always permit localhost origins during local development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * Validate that a POST/PUT/DELETE request originates strictly from an allowed origin.
 * Performs exact URL origin comparison (prevents sub-domain / prefix spoofing like
 * https://tulipguestrooms.com.evil.com).
 *
 * Returns `null` when the request passes.
 * Returns a 403 NextResponse when the request should be rejected.
 */
export function validateOrigin(request: Request): NextResponse | null {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    console.error(
      '[CSRF] NEXT_PUBLIC_SITE_URL is not set and NODE_ENV is production. ' +
      'All state-changing requests will be blocked.'
    );
  }

  const originHeader  = request.headers.get('origin')  ?? '';
  const refererHeader = request.headers.get('referer') ?? '';

  // Prefer Origin header (it's authoritative); fall back to Referer
  const sourceHeader = originHeader || refererHeader;

  if (!sourceHeader) {
    console.warn('[CSRF] Rejected: no Origin or Referer header present.');
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  const requestOrigin = toOrigin(sourceHeader);

  if (!requestOrigin) {
    console.warn(`[CSRF] Rejected: invalid Origin or Referer header value "${sourceHeader}".`);
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  // Exact origin matching
  const isAllowed = allowedOrigins.includes(requestOrigin);

  if (!isAllowed) {
    console.warn(`[CSRF] Rejected: origin "${requestOrigin}" is not in allowed list ${JSON.stringify(allowedOrigins)}.`);
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  return null; // request is allowed
}
