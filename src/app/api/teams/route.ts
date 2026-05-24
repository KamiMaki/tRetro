import { NextResponse } from 'next/server';
import { teamRepo } from '@/lib/db/repositories/team.repo';
import { teamCreateLimiter, getClientIp } from '@/lib/utils/rateLimit';

const MAX_NAME_LEN = 40;
// scrypt is CPU-bound (~50-100ms) and runs on every team-auth too —
// any one-word dictionary password remains brute-forceable in seconds
// without a network round-trip. Eight characters raises the search
// space high enough that the rate limiter actually matters.
const MIN_PASSWORD_LEN = 8;

/**
 * List teams (id + name + createdAt only — never password material).
 * Used by the team-picker dropdown on the dashboard. Accessible to any
 * Ring-1 (daily-password) authenticated user; team membership is
 * established separately via POST /api/teams/auth.
 */
export async function GET() {
  try {
    return NextResponse.json(teamRepo.findAll());
  } catch {
    return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 });
  }
}

/**
 * Create a new team space. Anyone with the daily password can create a
 * team — there is no separate admin role. The caller picks the name and
 * password; the password is scrypt-hashed before storage and never
 * recoverable (no password-reset flow — see plan section 1, Scenario 4).
 */
export async function POST(request: Request) {
  // Rate-limit team creation: each create is a scrypt computation that
  // blocks the single Node thread. An insider running a tight loop
  // could otherwise saturate the server.
  const ip = getClientIp(request);
  const gate = teamCreateLimiter.check(ip);
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Too many teams created. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } },
    );
  }

  let body: { name?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (name.length === 0) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json(
      { error: `Team name must be ${MAX_NAME_LEN} characters or fewer` },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LEN} characters` },
      { status: 400 },
    );
  }

  // Pre-check for nicer 409 vs. relying on the UNIQUE-violation exception.
  if (teamRepo.findByName(name)) {
    return NextResponse.json({ error: 'A team with that name already exists' }, { status: 409 });
  }

  try {
    const team = await teamRepo.create(name, password);
    // Count the create against the limiter only on success — duplicate
    // and validation failures already returned above.
    teamCreateLimiter.recordFailure(ip);
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    // Race: another concurrent POST won the UNIQUE constraint between
    // our pre-check and INSERT. Translate to 409 too.
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('unique')) {
      return NextResponse.json(
        { error: 'A team with that name already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
