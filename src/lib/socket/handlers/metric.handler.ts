import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { metricRepo } from '../../db/repositories/metric.repo';
import type { SocketData } from '../middleware';
import type { SubmitMetricsPayload } from '../../types';

export function registerMetricHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.METRICS_SUBMIT, (payload: SubmitMetricsPayload) => {
    try {
      if (!payload || typeof payload !== 'object' || !payload.scores) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Invalid metrics payload',
          code: 'INVALID_PAYLOAD',
        });
        return;
      }

      const written = metricRepo.submit(data.roomId, data.participantId, payload.scores);
      if (written.length === 0) return;

      // 1. Echo private own-scores back to the submitter only.
      const ownScores = metricRepo.getOwnScores(data.roomId, data.participantId);
      socket.emit(SOCKET_EVENTS.METRICS_OWN_UPDATED, { scores: ownScores });

      // 2. Broadcast updated team aggregate to everyone in the room
      //    (including the submitter). The aggregate carries no identity info.
      const aggregate = metricRepo.getAggregateByRoomId(data.roomId);
      io.to(data.roomId).emit(SOCKET_EVENTS.METRICS_AGGREGATE_UPDATED, {
        metrics: aggregate,
      });
    } catch (err) {
      void err;
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'Failed to submit metrics',
        code: 'SUBMIT_FAILED',
      });
    }
  });
}
