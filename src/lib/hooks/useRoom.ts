'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type {
  Room,
  Participant,
  CardDTO,
  Tag,
  ActionItem,
  RoomJoinedPayload,
  CreateCardPayload,
  UpdateCardPayload,
  CreateTagPayload,
  CreateActionItemPayload,
  UpdateActionItemPayload,
} from '@/lib/types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ParticipantSummary {
  id: string;
  nickname: string;
  isScrumMaster: boolean;
  isOnline: boolean;
}

interface UseRoomReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  room: Room | null;
  participants: ParticipantSummary[];
  cards: CardDTO[];
  tags: Tag[];
  actionItems: ActionItem[];
  isScrumMaster: boolean;
  toastMessage: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearToast: () => void;
  addCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  updateCard: (payload: UpdateCardPayload) => void;
  deleteCard: (cardId: string) => void;
  revealCard: (cardId: string) => void;
  createTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  addActionItem: (payload: Omit<CreateActionItemPayload, 'roomId'>) => void;
  updateActionItem: (payload: UpdateActionItemPayload) => void;
  deleteActionItem: (actionItemId: string) => void;
  closeRoom: () => void;
}

interface UseRoomOptions {
  roomId: string;
  sessionToken: string;
}

export function useRoom({ roomId, sessionToken }: UseRoomOptions): UseRoomReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [cards, setCards] = useState<CardDTO[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [toastMessage, setToastMessage] = useState<UseRoomReturn['toastMessage']>(null);
  const [isScrumMaster, setIsScrumMaster] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sm = sessionStorage.getItem('isScrumMaster');
      setIsScrumMaster(sm === 'true');
    }
  }, []);

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
      setRoom(payload.room);
      setParticipants(payload.participants);
      setCards(payload.cards);
      setTags(payload.tags);
      setActionItems(payload.actionItems);
    });

    socket.on(SOCKET_EVENTS.CARD_CREATED, (card: CardDTO) => {
      setCards((prev) => [...prev, card]);
    });

    socket.on(SOCKET_EVENTS.CARD_UPDATED, (card: CardDTO) => {
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    });

    socket.on(SOCKET_EVENTS.CARD_DELETED, (payload: { cardId: string }) => {
      setCards((prev) => prev.filter((c) => c.id !== payload.cardId));
    });

    socket.on(SOCKET_EVENTS.CARD_REVEALED, (payload: { cardId: string; authorNickname: string }) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === payload.cardId
            ? { ...c, isRevealed: true, authorNickname: payload.authorNickname }
            : c
        )
      );
    });

    socket.on(SOCKET_EVENTS.TAG_CREATED, (tag: Tag) => {
      setTags((prev) => [...prev, tag]);
    });

    socket.on(SOCKET_EVENTS.ACTION_CREATED, (actionItem: ActionItem) => {
      setActionItems((prev) => [...prev, actionItem]);
    });

    socket.on(SOCKET_EVENTS.ACTION_UPDATED, (actionItem: ActionItem) => {
      setActionItems((prev) => prev.map((a) => (a.id === actionItem.id ? actionItem : a)));
    });

    socket.on(SOCKET_EVENTS.ACTION_DELETED, (payload: { actionItemId: string }) => {
      setActionItems((prev) => prev.filter((a) => a.id !== payload.actionItemId));
    });

    socket.on(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, (participant: ParticipantSummary) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === participant.id);
        if (exists) return prev.map((p) => (p.id === participant.id ? { ...p, isOnline: true } : p));
        return [...prev, participant];
      });
    });

    socket.on(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, (payload: { participantId: string }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === payload.participantId ? { ...p, isOnline: false } : p))
      );
    });

    socket.on(SOCKET_EVENTS.ROOM_CLOSED, () => {
      setRoom((prev) => (prev ? { ...prev, status: 'closed' } : prev));
      setToastMessage({ message: 'The room has been closed by the Scrum Master.', type: 'info' });
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
      setToastMessage({ message: payload?.message ?? 'An error occurred.', type: 'error' });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, sessionToken]);

  const clearToast = useCallback(() => setToastMessage(null), []);

  const addCard = useCallback(
    (payload: Omit<CreateCardPayload, 'roomId'>) => {
      socketRef.current?.emit(SOCKET_EVENTS.CARD_CREATE, { ...payload, roomId });
    },
    [roomId]
  );

  const updateCard = useCallback((payload: UpdateCardPayload) => {
    socketRef.current?.emit(SOCKET_EVENTS.CARD_UPDATE, payload);
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CARD_DELETE, { cardId });
  }, []);

  const revealCard = useCallback((cardId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CARD_REVEAL, { cardId });
  }, []);

  const createTag = useCallback(
    (payload: Omit<CreateTagPayload, 'roomId'>) => {
      socketRef.current?.emit(SOCKET_EVENTS.TAG_CREATE, { ...payload, roomId });
    },
    [roomId]
  );

  const addActionItem = useCallback(
    (payload: Omit<CreateActionItemPayload, 'roomId'>) => {
      socketRef.current?.emit(SOCKET_EVENTS.ACTION_CREATE, { ...payload, roomId });
    },
    [roomId]
  );

  const updateActionItem = useCallback((payload: UpdateActionItemPayload) => {
    socketRef.current?.emit(SOCKET_EVENTS.ACTION_UPDATE, payload);
  }, []);

  const deleteActionItem = useCallback((actionItemId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.ACTION_DELETE, { actionItemId });
  }, []);

  const closeRoom = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.ROOM_CLOSE, { roomId });
  }, [roomId]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    room,
    participants,
    cards,
    tags,
    actionItems,
    isScrumMaster,
    toastMessage,
    clearToast,
    addCard,
    updateCard,
    deleteCard,
    revealCard,
    createTag,
    addActionItem,
    updateActionItem,
    deleteActionItem,
    closeRoom,
  };
}
