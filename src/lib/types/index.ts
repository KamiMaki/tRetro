// Section types.
//
// Sections are now per-room data (see room_sections / team_sections). A
// section is identified by a free-form `section_key`, so SectionType is a
// plain string. The four values below are only the built-in DEFAULT seed
// used when a room/team has not customised its board.
export type SectionType = string;

/** The four built-in default section keys (seed for a brand-new board). */
export type DefaultSectionKey = 'went-well' | 'to-improve' | 'thanks' | 'deep-dive';

/** Accent tones a section can use. Mirrors the template accent palette. */
export type SectionTone = 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';

/** Fallbacks for a section_key with no matching room_sections row. */
export const DEFAULT_SECTION_TONE: SectionTone = 'violet';
export const DEFAULT_SECTION_EMOJI = '🗒️';

export const SECTION_LABELS: Record<string, string> = {
  'went-well': 'Went Well',
  'to-improve': "Didn't Go Well",
  'thanks': 'Thanks',
  'deep-dive': 'Deep Discussion',
};

export const SECTION_EMOJIS: Record<string, string> = {
  'went-well': '😆',
  'to-improve': '🥲',
  'thanks': '😍',
  'deep-dive': '🧐',
};

export const SECTIONS: DefaultSectionKey[] = ['went-well', 'to-improve', 'thanks', 'deep-dive'];

/** Visual tone mapping for each default section — used as a seed/fallback. */
export const SECTION_TONES: Record<string, SectionTone> = {
  'went-well':  'mint',
  'to-improve': 'amber',
  'thanks':     'pink',
  'deep-dive':  'violet',
};

/** Minimal section shape the board UI renders from — satisfied by both a
 *  RoomSection (server data) and a template-derived seed (fallback before
 *  the room's sections have loaded). */
export interface BoardSectionView {
  sectionKey: string;
  label: string;
  emoji: string;
  tone: SectionTone;
}

/** A customisable board section, scoped to one room (room_sections row). */
export interface RoomSection {
  id: string;
  roomId: string;
  sectionKey: string;
  label: string;
  emoji: string;
  tone: SectionTone;
  position: number;
}

/** A team's default board section (team_sections row). Same shape as
 *  RoomSection but keyed by team — copied into room_sections at room open. */
export interface TeamSection {
  id: string;
  teamId: string;
  sectionKey: string;
  label: string;
  emoji: string;
  tone: SectionTone;
  position: number;
}

// Room status
export type RoomStatus = 'active' | 'closed';

// Retro phase (advisory — UI hint only, doesn't restrict actions)
export type RoomPhase = 'gather' | 'vote' | 'discuss' | 'action' | 'closed';

export interface RoomPhaseState {
  phase: RoomPhase;
  /** Wall-clock ISO timestamp when this phase started. */
  startedAt: string;
  /** Optional countdown duration in seconds; null = no timer. */
  durationSec: number | null;
}

export const PHASE_LABELS: Record<RoomPhase, string> = {
  gather: 'Gather',
  vote: 'Vote',
  discuss: 'Discuss',
  action: 'Action',
  closed: 'Closed',
};

export const PHASE_EMOJI: Record<RoomPhase, string> = {
  gather: '🪴',
  vote: '🎯',
  discuss: '💬',
  action: '✅',
  closed: '📦',
};

export const PHASE_ORDER: RoomPhase[] = ['gather', 'vote', 'discuss', 'action', 'closed'];

// Database models (server-side only)
export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Optional webhook URL — POSTed an action-item digest on room close. */
  webhookUrl: string | null;
  /** Retro template id (classic / mad-sad-glad / start-stop-continue / 4ls). */
  templateId: string;
  /** Team this room belongs to. NULL = unclaimed legacy room. */
  teamId: string | null;
  /** Configured meeting headcount used as the authoritative vote denominator.
   *  NULL = no configured count; vote denominator falls back to session count. */
  participantCount: number | null;
  /** Whether the room hides participant nicknames in cards, sidebar, exports. */
  isAnonymous: boolean;
}

/** Public team metadata. NEVER includes password_hash / password_salt. */
export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  roomId: string;
  nickname: string;
  isScrumMaster: boolean;
  sessionToken: string;
  joinedAt: string;
  isOnline: boolean;
}

// CardDB - server-side only, contains authorId
export interface CardDB {
  id: string;
  roomId: string;
  section: SectionType;
  content: string;
  authorId: string;
  isRevealed: boolean;
  /** Custom nickname the author chose at reveal time. Null when never revealed
   *  or after un-reveal. */
  revealedNickname: string | null;
  createdAt: string;
  updatedAt: string;
}

// CardDTO - client-facing, NO authorId
export interface CardDTO {
  id: string;
  roomId: string;
  section: SectionType;
  content: string;
  isOwnCard: boolean;
  isRevealed: boolean;
  authorNickname: string | null; // only set when isRevealed=true
  tags: Tag[];
  createdAt: string;
}

export interface Tag {
  id: string;
  roomId: string;
  name: string;
  color: string;
}

export interface ActionItem {
  id: string;
  roomId: string;
  description: string;
  assignee: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// V2 types
export interface Comment {
  id: string;
  cardId: string;
  roomId: string;
  authorId: string;
  // null when the room is anonymous (server suppresses identity on the
  // wire) or when the author participant row was deleted. Named rooms
  // always carry the author's current nickname here.
  authorNickname: string | null;
  content: string;
  /** Optional base64 image attachment (data URL). null = text-only comment. */
  imageData: string | null;
  /** Viewer-specific: true when this comment belongs to the receiving
   *  participant. Set by the DTO layer per-socket (mirrors card.isOwnCard);
   *  undefined on the raw DB shape. Drives the delete affordance. */
  isOwnComment?: boolean;
  createdAt: string;
  /** ISO timestamp of last edit (zone-less UTC, like createdAt). null = never edited. */
  updatedAt: string | null;
}

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean; // whether current user reacted
}

export interface Drawing {
  id: string;
  cardId: string;
  roomId: string;
  data: string; // base64 image data
  createdAt: string;
}

// Extended CardDTO with v2 features
export interface CardDTOv2 extends CardDTO {
  comments: Comment[];
  reactions: Reaction[];
  voteCount: number;
  hasVoted: boolean;
  drawings: Drawing[];
}

// Room summary for dashboard
export interface RoomSummary {
  id: string;
  name: string;
  status: RoomStatus;
  createdAt: string;
  closedAt: string | null;
  /**
   * Compatibility alias — equals `sessionParticipantCount`. Older UI
   * (dashboard card "people" stat) reads this field directly. Will be
   * removed after every consumer migrates to the explicit names.
   */
  participantCount: number;
  /** Number of session-bound participant rows for the room. */
  sessionParticipantCount: number;
  /** Configured meeting headcount from room.participant_count, or null. */
  configuredParticipantCount: number | null;
  cardCount: number;
  actionItemCount: number;
  /** ISO timestamp of last activity (newest of cards / comments / action_items / createdAt). */
  lastActivityAt: string;
  /** Card count per section. */
  sectionCounts: Record<SectionType, number>;
  /** Retro template id (classic / mad-sad-glad / etc.). */
  templateId: string;
  /** Team this room belongs to. NULL = unclaimed legacy room. */
  teamId: string | null;
  /** Whether the room hides participant nicknames. */
  isAnonymous: boolean;
}

// Socket event payloads
export interface RoomJoinedPayload {
  room: Room;
  participant: Participant;
  participants: Array<{ id: string; nickname: string; isScrumMaster: boolean; isOnline: boolean }>;
  cards: CardDTO[];
  tags: Tag[];
  actionItems: ActionItem[];
  metricsAggregate: MetricAggregate[];
  ownMetricScores: OwnMetricScores;
  phaseState?: RoomPhaseState;
  /** The room's customised board sections, ordered by position. Optional for
   *  back-compat; clients fall back to the built-in default layout. */
  sections?: RoomSection[];
}

export interface CreateCardPayload {
  roomId: string;
  section: SectionType;
  content: string;
  tagIds: string[];
  tempId?: string; // client-side optimistic ID
  /** Optional base64 image attached at creation; stored as a card drawing. */
  imageData?: string | null;
}

export interface UpdateCardPayload {
  cardId: string;
  content?: string;
  tagIds?: string[];
}

export interface CreateTagPayload {
  roomId: string;
  name: string;
  color: string;
}

export interface CreateActionItemPayload {
  roomId: string;
  description: string;
  assignee?: string;
  dueDate?: string;
}

export interface UpdateActionItemPayload {
  actionItemId: string;
  description?: string;
  assignee?: string | null;
  dueDate?: string | null;
  isCompleted?: boolean;
}

// V2 payloads
export interface CreateCommentPayload {
  cardId: string;
  content: string;
  /** Optional base64 image attachment (data URL). */
  imageData?: string | null;
}

export interface DeleteCommentPayload {
  commentId: string;
}

export interface UpdateCommentPayload {
  commentId: string;
  content: string;
  imageData?: string | null;
}

export interface ToggleReactionPayload {
  cardId: string;
  emoji: string;
}

export interface ToggleVotePayload {
  cardId: string;
}

export interface CreateDrawingPayload {
  cardId: string;
  data: string; // base64
}

// ───── Sprint Metrics ─────
// Anonymous, team-aggregated. Individual scores are stored server-side
// for dedup (one submission per metric per participant per room) but are
// NEVER exposed via any API. Clients only see the team average and the
// total submission count.

export type MetricKey =
  | 'speed'
  | 'comms'
  | 'mood'
  | 'fun'
  | 'quality'
  | 'refactor'
  | 'incident';

export interface MetricDef {
  key: MetricKey;
  label: string;        // Chinese display label
  shortLabel: string;   // English short label
  emoji: string;
  tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
}

export const METRIC_DEFS: MetricDef[] = [
  { key: 'speed',    label: '開發速度',   shortLabel: 'Speed',     emoji: '⚡', tone: 'mint'   },
  { key: 'comms',    label: '溝通',       shortLabel: 'Comms',     emoji: '💬', tone: 'cyan'   },
  { key: 'mood',     label: '心情',       shortLabel: 'Mood',      emoji: '☀️', tone: 'amber'  },
  { key: 'fun',      label: '有趣度',     shortLabel: 'Fun',       emoji: '🎈', tone: 'pink'   },
  { key: 'quality',  label: '開發品質',   shortLabel: 'Quality',   emoji: '💎', tone: 'violet' },
  { key: 'refactor', label: 'Refactor',  shortLabel: 'Refactor',  emoji: '🛠️', tone: 'mint'   },
  { key: 'incident', label: '解報案時間', shortLabel: 'Incident',  emoji: '🚨', tone: 'cyan'   },
];

export const METRIC_KEYS: MetricKey[] = METRIC_DEFS.map((d) => d.key);

/** Score scale (1..10 inclusive). Centralised so server and UI agree. */
export const METRIC_SCORE_MIN = 1;
export const METRIC_SCORE_MAX = 10;
export const METRIC_DEFAULT_SCORE = 7;

/** Team aggregate for a single metric — what every client sees. */
export interface MetricAggregate {
  metricKey: MetricKey;
  average: number | null;      // null when no submissions yet
  submissions: number;         // count, not identities
  /** Histogram: distribution[i] = how many people scored (i+1). Length 10. */
  distribution: number[];
}

/** Submitter's own scores — only sent privately to the submitter. */
export type OwnMetricScores = Partial<Record<MetricKey, number>>;

export interface SubmitMetricsPayload {
  scores: OwnMetricScores; // sparse — submit only the metrics you scored
}

export interface MetricsHistoryEntry {
  roomId: string;
  roomName: string;
  createdAt: string;
  closedAt: string | null;
  metrics: MetricAggregate[];
}
