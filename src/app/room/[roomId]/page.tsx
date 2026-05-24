'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RoomBoard } from '@/components/room/RoomBoard';
import { AuroraBg, Logo } from '@/components/ui/Aurora';
import { NicknamePromptModal } from '@/components/room/NicknamePromptModal';

/** Generate a short anonymous guest nickname like "Guest-A8K3X". */
function generateGuestNickname(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return `Guest-${s}`;
}

const GUEST_NICK_RE = /^Guest-[A-Z0-9]+$/;

/** Decide whether a stored nickname is a generated guest name (so we
 *  should re-prompt in a NAMED room) or a real one the user picked. */
function isGuestPlaceholder(nick: string | null | undefined): boolean {
  if (!nick) return true;
  return GUEST_NICK_RE.test(nick);
}

interface RoomMeta {
  id: string;
  name: string;
  status: 'active' | 'closed';
  isAnonymous: boolean;
  teamId: string | null;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomMeta | null>(null);
  const [needsNickname, setNeedsNickname] = useState(false);
  const [pendingReuseToken, setPendingReuseToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  // Stage 1: fetch room metadata so we know isAnonymous before we
  // decide whether to prompt for a nickname.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${roomId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            res.status === 403
              ? 'This retro belongs to a different team.'
              : res.status === 404
                ? 'Retro not found.'
                : body.error ?? 'Could not load the retro.';
          setError(msg);
          return;
        }
        const data: RoomMeta = await res.json();
        setRoom(data);

        const existingToken = sessionStorage.getItem('sessionToken');
        const storedRoomId = sessionStorage.getItem('roomId');
        const reuse = existingToken && storedRoomId === roomId ? existingToken : null;
        setPendingReuseToken(reuse);

        // Anonymous rooms: skip prompt entirely; auto-Guest preserves
        // the "no identity" property. Named rooms: prompt only if we
        // do not already have a real (non-Guest) nickname saved.
        const storedNick = sessionStorage.getItem('nickname');
        if (data.isAnonymous) {
          // Fire join immediately with auto-Guest or stored Guest.
          runJoin(reuse, storedNick && storedNick.length > 0 ? storedNick : generateGuestNickname());
        } else if (isGuestPlaceholder(storedNick)) {
          setNeedsNickname(true);
        } else {
          // Real saved nickname — reuse silently.
          runJoin(reuse, storedNick!);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the retro.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Stage 2: actually POST to /participants. Idempotent — guarded by
  // joinedRef so the modal submit + the prompt-bypass path can't
  // both race.
  function runJoin(reuseToken: string | null, nickname: string) {
    if (joinedRef.current) return;
    joinedRef.current = true;

    fetch(`/api/rooms/${roomId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, sessionToken: reuseToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to join retro');
        }
        return res.json();
      })
      .then((data) => {
        sessionStorage.setItem('sessionToken', data.sessionToken);
        sessionStorage.setItem('participantId', data.participantId);
        sessionStorage.setItem('roomId', roomId);
        sessionStorage.setItem('nickname', data.nickname ?? nickname);
        sessionStorage.setItem('isScrumMaster', String(data.isScrumMaster ?? false));
        setSessionToken(data.sessionToken);
        setReady(true);
        setNeedsNickname(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not join the retro';
        setError(message);
        joinedRef.current = false;
      });
  }

  if (error) {
    return (
      <main
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          isolation: 'isolate',
        }}
      >
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 360, padding: 16 }}>
          <Logo size={28} />
          <div
            className="text-display"
            style={{ fontSize: 18, fontWeight: 600, marginTop: 18, color: 'oklch(0.85 0.14 25)' }}
          >
            Could not join the retro
          </div>
          <div className="fg-2" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn"
            style={{ marginTop: 18, padding: '8px 16px' }}
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  // Show nickname prompt when needed — sits above the spinner.
  if (needsNickname) {
    return (
      <main
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          isolation: 'isolate',
        }}
      >
        <AuroraBg />
        <NicknamePromptModal
          initial={(() => {
            const s = sessionStorage.getItem('nickname');
            return s && !isGuestPlaceholder(s) ? s : '';
          })()}
          onSubmit={(nick) => runJoin(pendingReuseToken, nick)}
          onUseGuest={() => runJoin(pendingReuseToken, generateGuestNickname())}
        />
      </main>
    );
  }

  if (!ready || !sessionToken) {
    return (
      <main
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          isolation: 'isolate',
        }}
      >
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Logo size={28} />
          <div className="text-mono fg-2" style={{ fontSize: 12, marginTop: 14 }}>
            <span className="live-dot" style={{ marginRight: 8 }} />
            {room ? `Joining ${room.name}…` : 'Loading retro…'}
          </div>
        </div>
      </main>
    );
  }

  return <RoomBoard roomId={roomId} />;
}
