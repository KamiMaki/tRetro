import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { authMiddleware } from './middleware';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerCardHandlers } from './handlers/card.handler';
import { registerTagHandlers } from './handlers/tag.handler';
import { registerActionItemHandlers } from './handlers/action-item.handler';
import { registerCommentHandlers } from './handlers/comment.handler';
import { registerReactionHandlers } from './handlers/reaction.handler';
import { registerVoteHandlers } from './handlers/vote.handler';
import { registerDrawingHandlers } from './handlers/drawing.handler';
import { SOCKET_EVENTS } from './events';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'development' ? '*' : undefined,
      methods: ['GET', 'POST'],
    },
  });

  io.use(authMiddleware);

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    registerRoomHandlers(io!, socket);
    registerCardHandlers(io!, socket);
    registerTagHandlers(io!, socket);
    registerActionItemHandlers(io!, socket);
    registerCommentHandlers(io!, socket);
    registerReactionHandlers(io!, socket);
    registerVoteHandlers(io!, socket);
    registerDrawingHandlers(io!, socket);
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
