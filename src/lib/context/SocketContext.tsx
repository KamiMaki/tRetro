'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  connectionStatus: 'disconnected',
});

interface SocketProviderProps {
  children: React.ReactNode;
  roomId: string;
  sessionToken: string;
}

export function SocketProvider({ children, roomId, sessionToken }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<SocketContextValue['connectionStatus']>('connecting');

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, sessionToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, connectionStatus }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}
