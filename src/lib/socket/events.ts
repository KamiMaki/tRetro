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
  ROOM_REOPEN: 'room:reopen',
  ROOM_REOPENED: 'room:reopened',
  PHASE_SET: 'phase:set',
  PHASE_UPDATED: 'phase:updated',

  // Cards
  CARD_CREATE: 'card:create',
  CARD_CREATED: 'card:created',
  CARD_UPDATE: 'card:update',
  CARD_UPDATED: 'card:updated',
  CARD_DELETE: 'card:delete',
  CARD_DELETED: 'card:deleted',
  CARD_REVEAL: 'card:reveal',
  CARD_REVEALED: 'card:revealed',
  CARD_UNREVEAL: 'card:unreveal',
  CARD_UNREVEALED: 'card:unrevealed',
  CARD_MOVE: 'card:move',
  CARD_PARK: 'card:park',

  // Tags
  TAG_CREATE: 'tag:create',
  TAG_CREATED: 'tag:created',
  TAG_SET_DEFAULT: 'tag:set-default',
  TAG_UPDATED: 'tag:updated',

  // Action Items
  ACTION_CREATE: 'action:create',
  ACTION_CREATED: 'action:created',
  ACTION_UPDATE: 'action:update',
  ACTION_UPDATED: 'action:updated',
  ACTION_DELETE: 'action:delete',
  ACTION_DELETED: 'action:deleted',

  // Comments
  COMMENT_CREATE: 'comment:create',
  COMMENT_CREATED: 'comment:created',

  // Reactions
  REACTION_TOGGLE: 'reaction:toggle',
  REACTION_UPDATED: 'reaction:updated',

  // Votes
  VOTE_TOGGLE: 'vote:toggle',
  VOTE_UPDATED: 'vote:updated',

  // Drawings
  DRAWING_CREATE: 'drawing:create',
  DRAWING_CREATED: 'drawing:created',

  // Sprint metrics (anonymous, team-aggregate only)
  METRICS_SUBMIT: 'metrics:submit',
  METRICS_AGGREGATE_UPDATED: 'metrics:aggregate-updated',
  METRICS_OWN_UPDATED: 'metrics:own-updated',

  // Error
  ERROR: 'error',
} as const;
