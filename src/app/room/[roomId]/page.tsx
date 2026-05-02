'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SocketProvider } from '@/lib/context/SocketContext';
import { RoomBoard } from '@/components/room/RoomBoard';
import { AuroraBg, Logo } from '@/components/ui/Aurora';

/** Generate a short anonymous guest nickname like "Guest-A8K3X". */
function generateGuestNickname(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return `Guest-${s}`;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joiningRef = useRef(false);

  useEffect(() => {
    const existingToken = sessionStorage.getItem('sessionToken');
    const storedRoomId = sessionStorage.getItem('roomId');

    if (existingToken && storedRoomId === roomId) {
      setSessionToken(existingToken);
      setReady(true);
      return;
    }

    // No (or stale) session — auto-join with a guest nickname.
    if (joiningRef.current) return;
    joiningRef.current = true;

    const nickname = sessionStorage.getItem('nickname') || generateGuestNickname();

    fetch(`/api/rooms/${roomId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
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
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('isScrumMaster', String(data.isScrumMaster ?? false));
        setSessionToken(data.sessionToken);
        setReady(true);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not join the retro';
        setError(message);
        joiningRef.current = false;
      });
  }, [roomId, router]);

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
            Joining retro…
          </div>
        </div>
      </main>
    );
  }

  return (
    <SocketProvider roomId={roomId} sessionToken={sessionToken}>
      <RoomBoard roomId={roomId} />
    </SocketProvider>
  );
}
