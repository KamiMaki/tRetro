'use client';

import type { CardDTOv2, Tag, CreateCardPayload, CreateTagPayload, SectionType } from '@/lib/types';
import { SECTIONS } from '@/lib/types';
import type { RetroTemplate } from '@/lib/templates';
import { Section } from '@/components/board/Section';

interface BoardProps {
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  participantCount: number;
  template?: RetroTemplate;
  shareMode: boolean;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string, nickname?: string) => void;
  onUnrevealCard: (cardId: string) => void;
  onMoveCard: (cardId: string, section: SectionType) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
  onConvertToAction: (content: string) => void;
  onUpdateCardTags?: (cardId: string, tagIds: string[]) => void;
}

export function Board({
  cards,
  tags,
  isScrumMaster,
  participantCount,
  template,
  shareMode,
  onAddCard,
  onDeleteCard,
  onRevealCard,
  onUnrevealCard,
  onMoveCard,
  onCreateTag,
  onAddComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
  onConvertToAction,
  onUpdateCardTags,
}: BoardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4-column board grid. Sort/filter were removed; the per-section
          fullscreen view sorts by tag automatically. The timer lives in the
          Tools drawer above the tabs. */}
      <div className="board-grid">
        {SECTIONS.map((section) => (
          <Section
            key={section}
            section={section}
            cards={cards.filter((c) => c.section === section)}
            tags={tags}
            isScrumMaster={isScrumMaster}
            participantCount={participantCount}
            template={template}
            shareMode={shareMode}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onRevealCard={onRevealCard}
            onUnrevealCard={onUnrevealCard}
            onMoveCard={onMoveCard}
            onCreateTag={onCreateTag}
            onAddComment={onAddComment}
            onToggleReaction={onToggleReaction}
            onToggleVote={onToggleVote}
            onAddDrawing={onAddDrawing}
            onConvertToAction={onConvertToAction}
            onUpdateCardTags={onUpdateCardTags}
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
            grid-template-columns: repeat(4, 1fr);
          }
        }
        :global([data-density="compact"]) .board-grid {
          height: calc(100vh - 150px);
        }
      `}</style>
    </div>
  );
}
