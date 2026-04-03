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
