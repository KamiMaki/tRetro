import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

/**
 * Claim an unclaimed legacy room into the requesting team.
 *
 * Responses:
 *   200 — claim succeeded; returns the updated room.
 *   403 — no team cookie (or team deleted; cookie cleared in response).
 *   404 — room id does not exist.
 *   409 — room already belongs to a team (lost the race or stale UI).
 *
 * The underlying UPDATE is atomic (`WHERE team_id IS NULL`); two
 * concurrent claims on the same room produce exactly one winner.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;

  const { roomId } = await params;
  const existing = roomRepo.findById(roomId);
  if (!existing) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (existing.teamId !== null) {
    // Either we lost the race OR the requesting client had a stale UI.
    // Distinguish from 403 cross-team — caller's claim flow may want to
    // show "already claimed" vs. "permission denied" copy.
    return NextResponse.json(
      { error: 'Room already belongs to a team' },
      { status: 409 },
    );
  }

  const ok = roomRepo.claim(roomId, gate.teamId);
  if (!ok) {
    // Lost the race after the optimistic check above.
    return NextResponse.json(
      { error: 'Room already belongs to a team' },
      { status: 409 },
    );
  }
  // eslint-disable-next-line no-console
  console.info(`[claim] room=${roomId} team=${gate.teamId}`);

  const updated = roomRepo.findById(roomId)!;
  return NextResponse.json({ ok: true, room: updated });
}
