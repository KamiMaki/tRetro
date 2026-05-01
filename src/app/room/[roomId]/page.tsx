'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SocketProvider } from '@/lib/context/SocketContext';
import { RoomBoard } from '@/components/room/RoomBoard';
import { AuroraBg, Logo } from '@/components/ui/Aurora';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('sessionToken');
    const storedRoomId = sessionStorage.getItem('roomId');

    if (!token || storedRoomId !== roomId) {
      router.replace(`/room/${roomId}/join`);
      return;
    }

    setSessionToken(token);
    setReady(true);
  }, [roomId, router]);

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
            Connecting to retro…
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
