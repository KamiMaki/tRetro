// Section types
export type SectionType = 'went-well' | 'to-improve' | 'thanks' | 'deep-dive';

export const SECTION_LABELS: Record<SectionType, string> = {
  'went-well': 'Went Well',
  'to-improve': 'To Improve',
  'thanks': 'Thanks',
  'deep-dive': 'Deep Dive',
};

export const SECTIONS: SectionType[] = ['went-well', 'to-improve', 'thanks', 'deep-dive'];

// Room status
export type RoomStatus = 'active' | 'closed';

// Database models (server-side only)
export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
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
  authorNickname: string;
  content: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean; // whether current user reacted
}

export interface Vote {
  cardId: string;
  count: number;
  hasVoted: boolean;
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
  participantCount: number;
  cardCount: number;
  actionItemCount: number;
}

// Socket event payloads
export interface JoinRoomPayload {
  roomId: string;
  sessionToken: string;
}

export interface RoomJoinedPayload {
  room: Room;
  participant: Participant;
  participants: Array<{ id: string; nickname: string; isScrumMaster: boolean; isOnline: boolean }>;
  cards: CardDTO[];
  tags: Tag[];
  actionItems: ActionItem[];
}

export interface CreateCardPayload {
  roomId: string;
  section: SectionType;
  content: string;
  tagIds: string[];
  tempId?: string; // client-side optimistic ID
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
