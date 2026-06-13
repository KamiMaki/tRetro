import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { commentRepo } from '../../db/repositories/comment.repo';
import { roomRepo } from '../../db/repositories/room.repo';
import { toCommentDTO } from '../dto';
import type { SocketData } from '../middleware';
import type { CreateCommentPayload, DeleteCommentPayload, UpdateCommentPayload, Comment } from '../../types';
import { MAX_CONTENT_CHARS, MAX_IMAGE_CHARS, isValidImageData } from './limits';

/**
 * Fan a comment out per-socket so each recipient gets a viewer-correct
 * `isOwnComment` flag (the same pattern card create uses for `isOwnCard`).
 * The caller supplies the event name so create and update can reuse the same
 * broadcast logic (COMMENT_CREATED vs COMMENT_UPDATED).
 */
function broadcastComment(
  io: Server,
  roomId: string,
  comment: Comment,
  isAnonymousRoom: boolean,
  event: string = SOCKET_EVENTS.COMMENT_CREATED,
): void {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;
  for (const socketId of sockets) {
    const targetSocket = io.sockets.sockets.get(socketId);
    if (!targetSocket) continue;
    const targetData = targetSocket.data as SocketData;
    targetSocket.emit(
      event,
      toCommentDTO(comment, isAnonymousRoom, targetData.participantId),
    );
  }
}

export function registerCommentHandlers(io: Server, socket: Socket): void {
  const data = socket.data as SocketData;

  socket.on(SOCKET_EVENTS.COMMENT_CREATE, (payload: CreateCommentPayload) => {
    try {
      const rawContent = payload.content ?? '';
      if (rawContent.length > MAX_CONTENT_CHARS) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: `Comment is too long (max ${MAX_CONTENT_CHARS} characters)`, code: 'BAD_INPUT' });
        return;
      }
      const content = rawContent.trim();
      const rawImage = payload.imageData;
      const hasImage = rawImage != null && rawImage !== '';

      if (hasImage && !isValidImageData(rawImage)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unsupported image format', code: 'BAD_INPUT' });
        return;
      }
      if (hasImage && (rawImage as string).length > MAX_IMAGE_CHARS) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Image is too large (max ~2MB)', code: 'BAD_INPUT' });
        return;
      }
      // A comment must carry text, an image, or both — never nothing.
      if (!content && !hasImage) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Comment is empty', code: 'BAD_INPUT' });
        return;
      }

      const comment = commentRepo.create(
        payload.cardId,
        data.roomId,
        data.participantId,
        content,
        hasImage ? (rawImage as string) : null,
      );
      const room = roomRepo.findById(data.roomId);
      broadcastComment(io, data.roomId, comment, room?.isAnonymous ?? false);
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to create comment', code: 'CREATE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.COMMENT_DELETE, (payload: DeleteCommentPayload) => {
    try {
      const comment = commentRepo.findById(payload.commentId);
      if (!comment) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Comment not found', code: 'NOT_FOUND' });
        return;
      }
      // Permission: comment author or any SM (mirrors card delete).
      if (comment.authorId !== data.participantId && !data.isScrumMaster) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'No permission to delete this comment', code: 'FORBIDDEN' });
        return;
      }
      commentRepo.delete(comment.id);
      io.to(data.roomId).emit(SOCKET_EVENTS.COMMENT_DELETED, {
        commentId: comment.id,
        cardId: comment.cardId,
      });
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete comment', code: 'DELETE_FAILED' });
    }
  });

  socket.on(SOCKET_EVENTS.COMMENT_UPDATE, (payload: UpdateCommentPayload) => {
    try {
      const comment = commentRepo.findById(payload.commentId);
      if (!comment) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Comment not found', code: 'NOT_FOUND' });
        return;
      }
      // Permission: only the original author or an SM may edit.
      if (comment.authorId !== data.participantId && !data.isScrumMaster) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'No permission to edit this comment', code: 'FORBIDDEN' });
        return;
      }

      // --- same validation as COMMENT_CREATE ---
      const rawContent = payload.content ?? '';
      if (rawContent.length > MAX_CONTENT_CHARS) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: `Comment is too long (max ${MAX_CONTENT_CHARS} characters)`, code: 'BAD_INPUT' });
        return;
      }
      const content = rawContent.trim();
      const rawImage = payload.imageData;
      const hasImage = rawImage != null && rawImage !== '';

      if (hasImage && !isValidImageData(rawImage)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unsupported image format', code: 'BAD_INPUT' });
        return;
      }
      if (hasImage && (rawImage as string).length > MAX_IMAGE_CHARS) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Image is too large (max ~2MB)', code: 'BAD_INPUT' });
        return;
      }
      if (!content && !hasImage) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Comment is empty', code: 'BAD_INPUT' });
        return;
      }
      // ----------------------------------------

      const updated = commentRepo.update(
        comment.id,
        content,
        hasImage ? (rawImage as string) : null,
      );
      if (!updated) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to update comment', code: 'UPDATE_FAILED' });
        return;
      }
      const room = roomRepo.findById(data.roomId);
      broadcastComment(io, data.roomId, updated, room?.isAnonymous ?? false, SOCKET_EVENTS.COMMENT_UPDATED);
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to update comment', code: 'UPDATE_FAILED' });
    }
  });
}
