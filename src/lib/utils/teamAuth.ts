import { NextResponse } from 'next/server';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import {
  TEAM_COOKIE_NAME,
  TEAM_COOKIE_MAX_AGE,
  parseTeamIdFromCookieHeader,
} from '@/lib/utils/teamCookie';

// Re-export so existing call sites keep working without a path change.
export { TEAM_COOKIE_NAME, TEAM_COOKIE_MAX_AGE, parseTeamIdFromCookieHeader };

/**
 * Parse `tretro-team` cookie value from a Fetch Request. Returns the team
 * ID string, or null when the cookie is absent or empty.
 */
export function getTeamIdFromRequest(request: Request): string | null {
  return parseTeamIdFromCookieHeader(request.headers.get('cookie'));
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
