import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';

export async function GET() {
  try {
    const rooms = roomRepo.findAll();
    return NextResponse.json(rooms);
  } catch {
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body?.name;
    const templateId = typeof body?.templateId === 'string' ? body.templateId : 'classic';
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }
    const room = roomRepo.create(name.trim(), templateId);
    return NextResponse.json({
      roomId: room.id,
      // Send users straight into the board — the board page auto-creates
      // a guest participant when no session token is present.
      joinUrl: `/room/${room.id}`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
