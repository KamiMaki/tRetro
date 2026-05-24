import { NextResponse } from 'next/server';
import { joinOrCreateParticipant } from '@/lib/services/joinOrCreateParticipant';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { requireTeamId } from '@/lib/utils/teamAuth';

/**
 * Idempotent join. Always called by the board page on mount. If the request
 * carries a still-valid `sessionToken` for this room, the same participant
 * is returned (200); otherwise a fresh one is minted (201). Stale tokens
 * from a wiped DB silently recover by minting a new participant — that's
 * the whole point of routing this through the server every visit.
 *
 * Team gates: the caller must hold a team cookie matching `room.team_id`.
 * Unclaimed rooms (`team_id IS NULL`) reject all joins with 409 so that
 * two teams cannot accidentally co-occupy a legacy room mid-claim.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const gate = requireTeamId(request);
    if ('error' in gate) return gate.error;
    const { roomId } = await params;

    const room = roomRepo.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    if (room.teamId === null) {
      return NextResponse.json(
        { error: 'Room is unclaimed. Claim it from the dashboard first.' },
        { status: 409 },
      );
    }
    if (room.teamId !== gate.teamId) {
      return NextResponse.json(
        { error: 'Room belongs to a different team' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const nickname = typeof body?.nickname === 'string' ? body.nickname : undefined;
    const sessionToken =
      typeof body?.sessionToken === 'string' && body.sessionToken.length > 0
        ? body.sessionToken
        : null;

    const result = joinOrCreateParticipant(roomId, nickname, sessionToken);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const p = result.participant;
    return NextResponse.json(
      {
        participantId: p.id,
        sessionToken: p.sessionToken,
        isScrumMaster: p.isScrumMaster,
        nickname: p.nickname,
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
