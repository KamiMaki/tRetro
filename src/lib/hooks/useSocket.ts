'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { RoomJoinedPayload } from '@/lib/types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSocketOptions {
  roomId: string;
  sessionToken: string;
  onRoomJoined?: (payload: RoomJoinedPayload) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}

export function useSocket({ roomId, sessionToken, onRoomJoined }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!roomId || !sessionToken) return;

    const socket = io({
      auth: { sessionToken, roomId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    setConnectionStatus('connecting');

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setConnectionStatus('error');
    });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (payload: RoomJoinedPayload) => {
      onRoomJoined?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, sessionToken]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
  };
}
