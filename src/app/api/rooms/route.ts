import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }
    const room = roomRepo.create(name.trim());
    return NextResponse.json({
      roomId: room.id,
      joinUrl: `/room/${room.id}/join`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
