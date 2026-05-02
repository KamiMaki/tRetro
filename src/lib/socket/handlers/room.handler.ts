import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { roomRepo } from '../../db/repositories/room.repo';
import { participantRepo } from '../../db/repositories/participant.repo';
import { cardRepo } from '../../db/repositories/card.repo';
import { tagRepo } from '../../db/repositories/tag.repo';
import { actionItemRepo } from '../../db/repositories/action-item.repo';
import { metricRepo } from '../../db/repositories/metric.repo';
import { toCardDTOv2 } from '../dto';
import type { SocketData } from '../middleware';
import { sendActionItemDigest } from '../../integrations/digest';
import { getPhaseState, setPhaseState } from '../phase-store';
import type { RoomPhase } from '../../types';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  // Join room - send full state
  socket.on(SOCKET_EVENTS.ROOM_JOIN, () => {
    const { roomId, participantId } = data;

    socket.join(roomId);
    participantRepo.setOnline(participantId, true);

    const room = roomRepo.findById(roomId);
    const participant = participantRepo.findById(participantId);
    const participants = participantRepo.findByRoomId(roomId).map(p => ({
      id: p.id,
      nickname: p.nickname,
      isScrumMaster: p.isScrumMaster,
      isOnline: p.isOnline,
    }));
    const cardsDB = cardRepo.findByRoomId(roomId);
    const cards = cardsDB.map(c => toCardDTOv2(c, participantId));
    const tags = tagRepo.findByRoomId(roomId);
    const actionItems = actionItemRepo.findByRoomId(roomId);
    const metricsAggregate = metricRepo.getAggregateByRoomId(roomId);
    const ownMetricScores = metricRepo.getOwnScores(roomId, participantId);
    const phaseState = getPhaseState(roomId);

    socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
      room,
      participant,
      participants,
      cards,
      tags,
      actionItems,
      metricsAggregate,
      ownMetricScores,
      phaseState,
    });

    // Notify others
    socket.to(roomId).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, {
      id: participant!.id,
      nickname: participant!.nickname,
      isScrumMaster: participant!.isScrumMaster,
      isOnline: true,
    });
  });

  // Close room (SM only)
  socket.on(SOCKET_EVENTS.ROOM_CLOSE, () => {
    if (!data.isScrumMaster) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can close the room', code: 'FORBIDDEN' });
      return;
    }
    const room = roomRepo.close(data.roomId);
    io.to(data.roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { room });

    // Fire-and-forget action-item digest webhook. Errors are logged
    // server-side only so a flaky webhook never blocks the close.
    if (room && room.webhookUrl) {
      const items = actionItemRepo.findByRoomId(data.roomId);
      sendActionItemDigest(room, items)
        .then((r) => {
          if (!r.ok) {
            console.warn(`[webhook] digest failed room=${data.roomId} status=${r.status} err=${r.error ?? ''}`);
          }
        })
        .catch((err) => {
          console.warn('[webhook] digest exception', err);
        });
    }
  });

  // Reopen room (SM only) — undo a close
  socket.on(SOCKET_EVENTS.ROOM_REOPEN, () => {
    if (!data.isScrumMaster) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can reopen the room', code: 'FORBIDDEN' });
      return;
    }
    const room = roomRepo.reopen(data.roomId);
    io.to(data.roomId).emit(SOCKET_EVENTS.ROOM_REOPENED, { room });
  });

  // Phase change (advisory). Anyone with SM rights can advance the
  // phase — phase is a UI hint and does not gate any action.
  socket.on(
    SOCKET_EVENTS.PHASE_SET,
    (payload: { phase?: RoomPhase; durationSec?: number | null } | undefined) => {
      if (!data.isScrumMaster) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only Scrum Master can change phase', code: 'FORBIDDEN' });
        return;
      }
      const phase = payload?.phase;
      if (!phase) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Phase is required', code: 'BAD_INPUT' });
        return;
      }
      const next = setPhaseState(data.roomId, {
        phase,
        durationSec: payload?.durationSec ?? null,
      });
      io.to(data.roomId).emit(SOCKET_EVENTS.PHASE_UPDATED, { phaseState: next });
    },
  );

  // Disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    participantRepo.setOnline(data.participantId, false);
    socket.to(data.roomId).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, {
      participantId: data.participantId,
    });
  });
}
