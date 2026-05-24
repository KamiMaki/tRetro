import { NextResponse } from 'next/server';
import { requireTeamId } from '@/lib/utils/teamAuth';
import { teamRepo } from '@/lib/db/repositories/team.repo';

/**
 * Return the currently-selected team — id, name, createdAt only. Used by
 * the dashboard to:
 *   - decide whether to render the team picker (403) or the rooms grid
 *     (200);
 *   - display the active team name in the header;
 *   - title the trends page ("Trends for [Team Name]").
 *
 * When the cookie references a deleted team, `requireTeamId` returns
 * 403 with a `Set-Cookie` that clears the stale cookie immediately.
 */
export async function GET(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;

  const team = teamRepo.findById(gate.teamId);
  if (!team) {
    // Defensive: requireTeamId already verified existence, but a race
    // (team deleted between the two lookups) is technically possible.
    const res = NextResponse.json({ error: 'Team not found' }, { status: 403 });
    res.cookies.set({ name: 'tretro-team', value: '', path: '/', maxAge: 0 });
    return res;
  }
  return NextResponse.json(team);
}
