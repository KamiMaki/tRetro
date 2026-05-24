import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

/** A room owned by another team must never be returned. Unclaimed rooms
 *  (team_id IS NULL) remain visible to any logged-in user — they need
 *  to be discoverable so somebody can claim them. */
function teamCanAccess(roomTeamId: string | null, requesterTeamId: string): boolean {
  return roomTeamId === null || roomTeamId === requesterTeamId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  const { roomId } = await params;
  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (!teamCanAccess(room.teamId, gate.teamId)) {
    return NextResponse.json({ error: 'Room belongs to a different team' }, { status: 403 });
  }
  return NextResponse.json(room);
}

/**
 * Permanently delete a room and all its data. The route is gated by the
 * daily-password proxy plus the team cookie. For claimed rooms only the
 * owning team can delete; unclaimed rooms (team_id IS NULL) keep the
 * pre-team-spaces behavior — anyone authenticated may delete them.
 *
 * Idempotent: deleting a non-existent room returns 404 once and 404
 * forever, no exception thrown.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  const { roomId } = await params;
  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (!teamCanAccess(room.teamId, gate.teamId)) {
    return NextResponse.json({ error: 'Room belongs to a different team' }, { status: 403 });
  }
  const ok = roomRepo.delete(roomId);
  if (!ok) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
