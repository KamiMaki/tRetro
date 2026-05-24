import { NextResponse } from 'next/server';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { TEAM_COOKIE_NAME, TEAM_COOKIE_MAX_AGE } from '@/lib/utils/teamAuth';
import { teamAuthLimiter, getClientIp } from '@/lib/utils/rateLimit';

/**
 * Authenticate to an existing team. On success, sets the long-lived
 * `tretro-team` cookie that subsequent room/metric API calls consult via
 * `requireTeamId()`.
 *
 * Rate limited: 5 failed attempts from the same IP within 60 seconds
 * triggers a 5-minute 429 block. Successful auth clears the counter so a
 * legitimate user mistyping once doesn't accumulate state.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  const gate = teamAuthLimiter.check(ip);
  if (!gate.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[team-auth] rate-limited ip=${ip} retryAfter=${gate.retryAfterSec}s`);
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } },
    );
  }

  let body: { teamId?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!teamId || !password) {
    return NextResponse.json({ error: 'teamId and password are required' }, { status: 400 });
  }

  const team = teamRepo.findById(teamId);
  if (!team) {
    // Treat unknown team the same as wrong password for rate-limit
    // bookkeeping but return distinct 404 so the UI can react.
    teamAuthLimiter.recordFailure(ip);
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const ok = await teamRepo.verifyPassword(teamId, password);
  if (!ok) {
    teamAuthLimiter.recordFailure(ip);
    // eslint-disable-next-line no-console
    console.warn(`[team-auth] failed ip=${ip} team=${teamId}`);
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  teamAuthLimiter.recordSuccess(ip);

  const res = NextResponse.json({ ok: true, team });
  res.cookies.set({
    name: TEAM_COOKIE_NAME,
    value: team.id,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TEAM_COOKIE_MAX_AGE,
  });
  return res;
}

/**
 * Clear the team cookie. The Ring-1 daily-password cookie is untouched.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: TEAM_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return res;
}
