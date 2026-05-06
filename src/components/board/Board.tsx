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
  /** Read-only filter/sort values; the controls live in the room shell's
   *  Tools drawer so they don't eat board space. */
  activeTagFilters: string[];
  sortBy: 'time' | 'tagCount';
  sortAsc: boolean;
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
  onSetCardParked?: (cardId: string, isParked: boolean) => void;
  onUpdateCardTags?: (cardId: string, tagIds: string[]) => void;
}

export function Board({
  cards,
  tags,
  isScrumMaster,
  participantCount,
  template,
  activeTagFilters,
  sortBy,
  sortAsc,
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
  onSetCardParked,
  onUpdateCardTags,
}: BoardProps) {
  const filterAndSort = (sectionCards: CardDTOv2[]) => {
    let result = sectionCards;

    if (activeTagFilters.length > 0) {
      result = result.filter((card) =>
        card.tags.some((t) => activeTagFilters.includes(t.id))
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'time') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = a.tags.length - b.tags.length;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4-column board grid — filter + sort + timer live in the Tools drawer
          above (room shell), so the board itself takes the full available
          space. */}
      <div className="board-grid">
        {SECTIONS.map((section) => (
          <Section
            key={section}
            section={section}
            cards={filterAndSort(cards.filter((c) => c.section === section))}
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
            onSetCardParked={onSetCardParked}
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
             Header (~52px) + tabs (~50px) + room-shell padding (~50px). The
             timer/filter/sort drawer is collapsed by default so we don't
             reserve space for it here. */
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
