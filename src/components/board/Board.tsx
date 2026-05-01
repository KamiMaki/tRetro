'use client';

import type { CardDTOv2, Tag, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTIONS } from '@/lib/types';
import { Section } from '@/components/board/Section';
import { TagFilter } from '@/components/board/TagFilter';
import { SortControls } from '@/components/board/SortControls';

interface BoardProps {
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  participantCount: number;
  activeTagFilters: string[];
  setActiveTagFilters: (filters: string[]) => void;
  sortBy: 'time' | 'tagCount';
  setSortBy: (sort: 'time' | 'tagCount') => void;
  sortAsc: boolean;
  setSortAsc: (asc: boolean) => void;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
}

export function Board({
  cards,
  tags,
  isScrumMaster,
  participantCount,
  activeTagFilters,
  setActiveTagFilters,
  sortBy,
  setSortBy,
  sortAsc,
  setSortAsc,
  onAddCard,
  onDeleteCard,
  onRevealCard,
  onCreateTag,
  onAddComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
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
      {/* SM controls */}
      {isScrumMaster && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
          <TagFilter
            tags={tags}
            activeTagFilters={activeTagFilters}
            setActiveTagFilters={setActiveTagFilters}
          />
          <SortControls
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortAsc={sortAsc}
            setSortAsc={setSortAsc}
          />
        </div>
      )}

      {/* 4-column board grid */}
      <div className="board-grid">
        {SECTIONS.map((section) => (
          <Section
            key={section}
            section={section}
            cards={filterAndSort(cards.filter((c) => c.section === section))}
            tags={tags}
            isScrumMaster={isScrumMaster}
            participantCount={participantCount}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onRevealCard={onRevealCard}
            onCreateTag={onCreateTag}
            onAddComment={onAddComment}
            onToggleReaction={onToggleReaction}
            onToggleVote={onToggleVote}
            onAddDrawing={onAddDrawing}
          />
        ))}
      </div>

      <style jsx>{`
        .board-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          /* Bound the board to viewport so each section scrolls independently
             instead of the entire page growing forever. Subtract sticky header
             (~52px) + page padding + sidebar tabs space (~120px). */
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
