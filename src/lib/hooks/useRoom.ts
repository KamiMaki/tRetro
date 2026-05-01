'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type {
  Room,
  Participant,
  CardDTO,
  CardDTOv2,
  Comment,
  Reaction,
  Drawing,
  Tag,
  ActionItem,
  RoomJoinedPayload,
  CreateCardPayload,
  UpdateCardPayload,
  CreateTagPayload,
  CreateActionItemPayload,
  UpdateActionItemPayload,
  MetricAggregate,
  OwnMetricScores,
} from '@/lib/types';
import { METRIC_KEYS } from '@/lib/types';

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
  cards: CardDTOv2[];
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
  reopenRoom: () => void;
  addComment: (cardId: string, content: string) => void;
  toggleReaction: (cardId: string, emoji: string) => void;
  toggleVote: (cardId: string) => void;
  addDrawing: (cardId: string, data: string) => void;
  metricsAggregate: MetricAggregate[];
  ownMetricScores: OwnMetricScores;
  submitMetrics: (scores: OwnMetricScores) => void;
}

interface UseRoomOptions {
  roomId: string;
  sessionToken: string;
}

function toCardDTOv2(card: CardDTOv2 | CardDTO): CardDTOv2 {
  const v2 = card as Partial<CardDTOv2>;
  return {
    ...card,
    comments: v2.comments ?? [],
    reactions: v2.reactions ?? [],
    voteCount: v2.voteCount ?? 0,
    hasVoted: v2.hasVoted ?? false,
    drawings: v2.drawings ?? [],
  };
}

export function useRoom({ roomId, sessionToken }: UseRoomOptions): UseRoomReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [cards, setCards] = useState<CardDTOv2[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [toastMessage, setToastMessage] = useState<UseRoomReturn['toastMessage']>(null);
  const [isScrumMaster, setIsScrumMaster] = useState(false);
  const [metricsAggregate, setMetricsAggregate] = useState<MetricAggregate[]>(() =>
    METRIC_KEYS.map((metricKey) => ({ metricKey, average: null, submissions: 0 })),
  );
  const [ownMetricScores, setOwnMetricScores] = useState<OwnMetricScores>({});

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
      socket.emit(SOCKET_EVENTS.ROOM_JOIN);
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
      setCards(payload.cards.map(toCardDTOv2));
      setTags(payload.tags);
      setActionItems(payload.actionItems);
      if (Array.isArray(payload.metricsAggregate)) {
        setMetricsAggregate(payload.metricsAggregate);
      }
      if (payload.ownMetricScores && typeof payload.ownMetricScores === 'object') {
        setOwnMetricScores(payload.ownMetricScores);
      }
    });

    socket.on(SOCKET_EVENTS.CARD_CREATED, (card: CardDTOv2) => {
      setCards((prev) => [...prev, toCardDTOv2(card)]);
    });

    socket.on(SOCKET_EVENTS.CARD_UPDATED, (card: CardDTOv2) => {
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...toCardDTOv2(card), comments: c.comments, reactions: c.reactions, voteCount: c.voteCount, hasVoted: c.hasVoted, drawings: c.drawings } : c)));
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

    socket.on(SOCKET_EVENTS.ROOM_REOPENED, () => {
      setRoom((prev) => (prev ? { ...prev, status: 'active', closedAt: null } : prev));
      setToastMessage({ message: 'The room has been reopened.', type: 'success' });
    });

    // V2: Comments
    socket.on(SOCKET_EVENTS.COMMENT_CREATED, (comment: Comment) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === comment.cardId
            ? { ...c, comments: [...c.comments, comment] }
            : c
        )
      );
    });

    // V2: Reactions
    socket.on(SOCKET_EVENTS.REACTION_UPDATED, (payload: { cardId: string; reactions: Reaction[] }) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === payload.cardId
            ? { ...c, reactions: payload.reactions }
            : c
        )
      );
    });

    // V2: Votes
    socket.on(SOCKET_EVENTS.VOTE_UPDATED, (payload: { cardId: string; voteCount: number; hasVoted: boolean }) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === payload.cardId
            ? { ...c, voteCount: payload.voteCount, hasVoted: payload.hasVoted }
            : c
        )
      );
    });

    // V2: Drawings
    socket.on(SOCKET_EVENTS.DRAWING_CREATED, (drawing: Drawing) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === drawing.cardId
            ? { ...c, drawings: [...c.drawings, drawing] }
            : c
        )
      );
    });

    // V2: Sprint metrics — anonymous team aggregate broadcast
    socket.on(
      SOCKET_EVENTS.METRICS_AGGREGATE_UPDATED,
      (payload: { metrics: MetricAggregate[] }) => {
        if (Array.isArray(payload?.metrics)) setMetricsAggregate(payload.metrics);
      },
    );

    // V2: Sprint metrics — submitter's own scores echoed back privately
    socket.on(
      SOCKET_EVENTS.METRICS_OWN_UPDATED,
      (payload: { scores: OwnMetricScores }) => {
        if (payload?.scores && typeof payload.scores === 'object') {
          setOwnMetricScores(payload.scores);
          setToastMessage({ message: 'Your scores were saved anonymously.', type: 'success' });
        }
      },
    );

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

  const reopenRoom = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.ROOM_REOPEN, { roomId });
  }, [roomId]);

  const addComment = useCallback((cardId: string, content: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.COMMENT_CREATE, { cardId, content });
  }, []);

  const toggleReaction = useCallback((cardId: string, emoji: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.REACTION_TOGGLE, { cardId, emoji });
  }, []);

  const toggleVote = useCallback((cardId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.VOTE_TOGGLE, { cardId });
  }, []);

  const addDrawing = useCallback((cardId: string, data: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.DRAWING_CREATE, { cardId, data });
  }, []);

  const submitMetrics = useCallback((scores: OwnMetricScores) => {
    socketRef.current?.emit(SOCKET_EVENTS.METRICS_SUBMIT, { scores });
  }, []);

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
    reopenRoom,
    addComment,
    toggleReaction,
    toggleVote,
    addDrawing,
    metricsAggregate,
    ownMetricScores,
    submitMetrics,
  };
}
