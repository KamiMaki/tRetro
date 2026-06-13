'use client';

import type { CSSProperties } from 'react';
import type { CardDTOv2, Tag, CreateCardPayload, CreateTagPayload, SectionType, BoardSectionView } from '@/lib/types';
import { Section } from '@/components/board/Section';

interface BoardProps {
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  participantCount: number;
  /** The room's board sections in display order (room_sections, or a
   *  template fallback before they load). */
  sections: BoardSectionView[];
  /** The team's reaction palette, forwarded down to each card's ReactionBar. */
  reactionEmojis?: string[];
  /** Section_key the SM "park" action targets (room's discuss-equivalent). */
  parkSectionKey?: string;
  shareMode: boolean;
  /** Forwarded to Card so reveal/unreveal toggles hide in named rooms. */
  isAnonymousRoom: boolean;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string, nickname?: string) => void;
  onUnrevealCard: (cardId: string) => void;
  onMoveCard: (cardId: string, section: SectionType) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  onDeleteComment?: (commentId: string, cardId: string) => void;
  onUpdateComment?: (commentId: string, cardId: string, content: string, imageData?: string | null) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
  onDeleteDrawing: (drawingId: string) => void;
  onConvertToAction: (content: string) => void;
  onUpdateCardTags?: (cardId: string, tagIds: string[]) => void;
  onUpdateCardContent?: (cardId: string, content: string) => void;
}

export function Board({
  cards,
  tags,
  isScrumMaster,
  participantCount,
  sections,
  reactionEmojis,
  parkSectionKey,
  shareMode,
  isAnonymousRoom,
  onAddCard,
  onDeleteCard,
  onRevealCard,
  onUnrevealCard,
  onMoveCard,
  onCreateTag,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
  onDeleteDrawing,
  onConvertToAction,
  onUpdateCardTags,
  onUpdateCardContent,
}: BoardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4-column board grid. Sort/filter were removed; the per-section
          fullscreen view sorts by tag automatically. The timer lives in the
          Tools drawer above the tabs. */}
      <div className="board-grid" style={{ '--section-count': sections.length } as CSSProperties}>
        {sections.map((s) => (
          <Section
            key={s.sectionKey}
            section={s.sectionKey}
            label={s.label}
            emoji={s.emoji}
            tone={s.tone}
            parkSectionKey={parkSectionKey}
            cards={cards.filter((c) => c.section === s.sectionKey)}
            tags={tags}
            reactionEmojis={reactionEmojis}
            isScrumMaster={isScrumMaster}
            participantCount={participantCount}
            shareMode={shareMode}
            isAnonymousRoom={isAnonymousRoom}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onRevealCard={onRevealCard}
            onUnrevealCard={onUnrevealCard}
            onMoveCard={onMoveCard}
            onCreateTag={onCreateTag}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onUpdateComment={onUpdateComment}
            onToggleReaction={onToggleReaction}
            onToggleVote={onToggleVote}
            onAddDrawing={onAddDrawing}
            onDeleteDrawing={onDeleteDrawing}
            onConvertToAction={onConvertToAction}
            onUpdateCardTags={onUpdateCardTags}
            onUpdateCardContent={onUpdateCardContent}
          />
        ))}
      </div>

      <style jsx>{`
        .board-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          /* Bound the board to viewport so each section scrolls independently.
             Header + tabs + room-shell padding ≈ 180px. The timer lives in a
             collapsed drawer so we don't reserve space for it here. */
          height: calc(100vh - 180px);
          min-height: 480px;
          grid-auto-rows: minmax(0, 1fr);
        }
        @media (min-width: 720px) {
          .board-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1280px) {
          .board-grid {
            /* One column per section. Falls back to 4 before sections load. */
            grid-template-columns: repeat(var(--section-count, 4), minmax(0, 1fr));
          }
        }
        :global([data-density="compact"]) .board-grid {
          height: calc(100vh - 150px);
        }
      `}</style>
    </div>
  );
}
