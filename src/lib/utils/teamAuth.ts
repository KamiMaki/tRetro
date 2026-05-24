import { NextResponse } from 'next/server';
import { teamRepo } from '@/lib/db/repositories/team.repo';

export const TEAM_COOKIE_NAME = 'tretro-team';
export const TEAM_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Parse `tretro-team` cookie value from a Fetch Request. Returns the team
 * ID string, or null when the cookie is absent or empty.
 *
 * Browser cookies are URL-encoded by some libraries; we decode defensively
 * so a value like `abc%2Bdef` is normalised before lookup.
 */
export function getTeamIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
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

export type RequireTeamResult =
  | { teamId: string }
  | { error: NextResponse };

/**
 * Ring-2 auth helper. Returns `{ teamId }` when the request carries a
 * valid `tretro-team` cookie that maps to an existing team row. Otherwise
 * returns `{ error }` carrying a 403 NextResponse the route handler can
 * return directly.
 *
 * When the cookie references a deleted team (Pre-Mortem Scenario 5), the
 * error response also clears the stale cookie so the browser drops it on
 * the next request.
 */
export function requireTeamId(request: Request): RequireTeamResult {
  const teamId = getTeamIdFromRequest(request);
  if (!teamId) {
    return {
      error: NextResponse.json({ error: 'No team selected' }, { status: 403 }),
    };
  }
  const team = teamRepo.findById(teamId);
  if (!team) {
    const res = NextResponse.json({ error: 'Team not found' }, { status: 403 });
    // Clearing on the response signals the browser to drop the stale
    // cookie immediately, regardless of its remaining maxAge.
    res.cookies.set({
      name: TEAM_COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
    });
    return { error: res };
  }
  return { teamId };
}
