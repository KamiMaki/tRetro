import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

/**
 * List the legacy rooms whose `team_id IS NULL`. Visible to any user who
 * has cleared Ring-1 (daily password) AND Ring-2 (team cookie) — they
 * need to be discoverable so a team can claim them. The dashboard
 * renders them in a read-only section with a "Claim to [Team Name]"
 * button per row.
 */
export async function GET(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  try {
    return NextResponse.json(roomRepo.findUnclaimed());
  } catch {
    return NextResponse.json({ error: 'Failed to list unclaimed rooms' }, { status: 500 });
  }
}
