/**
 * Pure cookie helpers for the `tretro-team` cookie. NO Next.js imports
 * here — this module is consumed both by route handlers (which run
 * inside a Next.js request context and CAN safely import NextResponse)
 * and by the Socket.io middleware (which runs at server-startup time
 * and CANNOT pull in Next.js's app-render AsyncLocalStorage shim
 * without crashing on Node 22 / Next.js 16).
 *
 * If you find yourself adding an import from `next/*` here, STOP and
 * move that logic to `teamAuth.ts` instead.
 */

export const TEAM_COOKIE_NAME = 'tretro-team';
export const TEAM_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Parse the `tretro-team` cookie value out of a raw `Cookie` header.
 * Returns the team ID, or null when the cookie is absent or empty.
 * Percent-decodes defensively so a value like `abc%2Bdef` round-trips.
 */
export function parseTeamIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const pattern = new RegExp(`(?:^|; )${TEAM_COOKIE_NAME}=([^;]*)`);
  const match = cookieHeader.match(pattern);
  if (!match) return null;
  const raw = match[1];
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return raw;
  }
}
