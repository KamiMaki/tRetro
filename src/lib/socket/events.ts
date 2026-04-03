export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Room
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_CLOSE: 'room:close',
  ROOM_CLOSED: 'room:closed',

  // Cards
  CARD_CREATE: 'card:create',
  CARD_CREATED: 'card:created',
  CARD_UPDATE: 'card:update',
  CARD_UPDATED: 'card:updated',
  CARD_DELETE: 'card:delete',
  CARD_DELETED: 'card:deleted',
  CARD_REVEAL: 'card:reveal',
  CARD_REVEALED: 'card:revealed',

  // Tags
  TAG_CREATE: 'tag:create',
  TAG_CREATED: 'tag:created',

  // Action Items
  ACTION_CREATE: 'action:create',
  ACTION_CREATED: 'action:created',
  ACTION_UPDATE: 'action:update',
  ACTION_UPDATED: 'action:updated',
  ACTION_DELETE: 'action:delete',
  ACTION_DELETED: 'action:deleted',

  // Error
  ERROR: 'error',
} as const;
