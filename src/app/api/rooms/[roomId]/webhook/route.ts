import { NextResponse } from 'next/server';
import { roomRepo } from '@/lib/db/repositories/room.repo';
import { participantRepo } from '@/lib/db/repositories/participant.repo';
import { isAllowedWebhookUrl } from '@/lib/integrations/digest';

/**
 * Read or update the per-room webhook URL.
 *
 * Anyone in the room (everyone is SM by default) can update it. We
 * authenticate with sessionToken from a header so the URL never leaks
 * into a query string.
 */
function authParticipantForRoom(req: Request, roomId: string) {
  const token = req.headers.get('x-session-token') ?? '';
  if (!token) return null;
  const p = participantRepo.findBySessionToken(token);
  if (!p || p.roomId !== roomId) return null;
  return p;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const participant = authParticipantForRoom(request, roomId);
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const room = roomRepo.findById(roomId);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  return NextResponse.json({
    webhookUrl: room.webhookUrl,
    masked: room.webhookUrl ? maskUrl(room.webhookUrl) : null,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const participant = authParticipantForRoom(request, roomId);
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const room = roomRepo.findById(roomId);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const rawUrl = (body as { webhookUrl?: unknown })?.webhookUrl;

  if (rawUrl == null || rawUrl === '') {
    const updated = roomRepo.updateWebhook(roomId, null);
    return NextResponse.json({ webhookUrl: null, masked: null, room: updated });
  }
  if (typeof rawUrl !== 'string') {
    return NextResponse.json({ error: 'webhookUrl must be a string' }, { status: 400 });
  }
  if (!isAllowedWebhookUrl(rawUrl)) {
    return NextResponse.json(
      { error: 'webhook URL must be http(s) and not localhost' },
      { status: 400 },
    );
  }
  const updated = roomRepo.updateWebhook(roomId, rawUrl);
  return NextResponse.json({
    webhookUrl: rawUrl,
    masked: maskUrl(rawUrl),
    room: updated,
  });
}

/** Show only protocol+host+last-segment for display; keeps secrets out. */
function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split('/').filter(Boolean).pop();
    return `${u.protocol}//${u.host}/…/${tail ? `${tail.slice(0, 4)}****` : '****'}`;
  } catch {
    return '****';
  }
}
