'use client';

import type { CardDTO, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTIONS } from '@/lib/types';
import { Section } from '@/components/board/Section';
import { TagFilter } from '@/components/board/TagFilter';
import { SortControls } from '@/components/board/SortControls';

interface BoardProps {
  cards: CardDTO[];
  tags: Tag[];
  isScrumMaster: boolean;
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
}

export function Board({
  cards,
  tags,
  isScrumMaster,
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
}: BoardProps) {
  const filterAndSort = (sectionCards: CardDTO[]) => {
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
    <div className="space-y-4">
      {/* SM controls row */}
      {isScrumMaster && (
        <div className="flex flex-wrap gap-3 items-start">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SECTIONS.map((section) => (
          <Section
            key={section}
            section={section}
            cards={filterAndSort(cards.filter((c) => c.section === section))}
            tags={tags}
            isScrumMaster={isScrumMaster}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onRevealCard={onRevealCard}
            onCreateTag={onCreateTag}
          />
        ))}
      </div>
    </div>
  );
}
