import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { nickname } = await request.json();

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    const room = roomRepo.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'closed') {
      return NextResponse.json({ error: 'Room is closed' }, { status: 410 });
    }

    const participant = participantRepo.create(roomId, nickname.trim());

    return NextResponse.json({
      participantId: participant.id,
      sessionToken: participant.sessionToken,
      isScrumMaster: participant.isScrumMaster,
      nickname: participant.nickname,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
