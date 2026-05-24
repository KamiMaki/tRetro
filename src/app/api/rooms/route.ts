import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

export async function GET(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  try {
    return NextResponse.json(roomRepo.findByTeamId(gate.teamId));
  } catch {
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = requireTeamId(request);
  if ('error' in gate) return gate.error;
  try {
    const body = await request.json();
    const name = body?.name;
    const templateId = typeof body?.templateId === 'string' ? body.templateId : 'classic';
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }
    const isAnonymous = body?.isAnonymous === true;
    const rawCount = body?.participantCount;
    let participantCount: number | null = null;
    if (rawCount != null) {
      const parsed = typeof rawCount === 'number' ? rawCount : Number.parseInt(String(rawCount), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        participantCount = parsed;
      }
    }
    // Anonymous rooms over-count when we fall back to live sessions
    // (every browser tab mints a new Guest-XXX). Force the facilitator
    // to commit a number so consensus ratios stay meaningful.
    if (isAnonymous && (participantCount == null || participantCount <= 0)) {
      return NextResponse.json(
        { error: 'Anonymous rooms require a positive participantCount' },
        { status: 400 },
      );
    }
    const room = roomRepo.create(name.trim(), templateId, gate.teamId, participantCount, isAnonymous);
    return NextResponse.json(
      {
        roomId: room.id,
        // Send users straight into the board — the board page auto-creates
        // a guest participant when no session token is present.
        joinUrl: `/room/${room.id}`,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
