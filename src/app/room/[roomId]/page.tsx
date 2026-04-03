'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SocketProvider } from '@/lib/context/SocketContext';
import { RoomBoard } from '@/components/room/RoomBoard';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-400 dark:text-gray-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <SocketProvider roomId={roomId} sessionToken={sessionToken}>
      <RoomBoard roomId={roomId} />
    </SocketProvider>
  );
}
