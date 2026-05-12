import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = roomRepo.findById(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json(room);
}

/**
 * Permanently delete a room and all its data. The route is gated by the
 * daily-password proxy (no anonymous access) and there's no second
 * authorisation check beyond that — anyone with today's password can
 * delete any room. That matches the rest of tRetro's "anonymous
 * insider" trust model: the team trusts whoever they shared the
 * password with.
 *
 * Idempotent: deleting a non-existent room returns 404 once and 404
 * forever, no exception thrown.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const ok = roomRepo.delete(roomId);
  if (!ok) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
