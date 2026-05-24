import { NextResponse } from 'next/server';
import { joinOrCreateParticipant } from '@/lib/services/joinOrCreateParticipant';

/**
 * Idempotent join. Always called by the board page on mount. If the request
 * carries a still-valid `sessionToken` for this room, the same participant
 * is returned (200); otherwise a fresh one is minted (201). Stale tokens
 * from a wiped DB silently recover by minting a new participant — that's
 * the whole point of routing this through the server every visit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
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
