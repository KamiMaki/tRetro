import { NextResponse } from 'next/server';
import { teamRepo } from '@/lib/db/repositories/team.repo';

const MAX_NAME_LEN = 40;
const MIN_PASSWORD_LEN = 4;

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
