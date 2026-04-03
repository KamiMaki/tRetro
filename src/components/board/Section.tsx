'use client';

import type { CardDTO, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTION_LABELS } from '@/lib/types';
import { Card } from '@/components/board/Card';
import { CardForm } from '@/components/board/CardForm';

const SECTION_STYLES: Record<SectionType, { header: string; border: string; count: string }> = {
  'went-well': {
    header: 'bg-green-500 dark:bg-green-600',
    border: 'border-green-200 dark:border-green-800',
    count: 'bg-green-400 dark:bg-green-700',
  },
  'to-improve': {
    header: 'bg-red-500 dark:bg-red-600',
    border: 'border-red-200 dark:border-red-800',
    count: 'bg-red-400 dark:bg-red-700',
  },
  'thanks': {
    header: 'bg-blue-500 dark:bg-blue-600',
    border: 'border-blue-200 dark:border-blue-800',
    count: 'bg-blue-400 dark:bg-blue-700',
  },
  'deep-dive': {
    header: 'bg-purple-500 dark:bg-purple-600',
    border: 'border-purple-200 dark:border-purple-800',
    count: 'bg-purple-400 dark:bg-purple-700',
  },
};

interface SectionProps {
  section: SectionType;
  cards: CardDTO[];
  tags: Tag[];
  isScrumMaster: boolean;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
}

export function Section({
  section,
  cards,
  tags,
  isScrumMaster,
  onAddCard,
  onDeleteCard,
  onRevealCard,
  onCreateTag,
}: SectionProps) {
  const styles = SECTION_STYLES[section];

  return (
    <div className={`flex flex-col rounded-xl border ${styles.border} bg-white dark:bg-gray-900 overflow-hidden shadow-sm min-h-[400px]`}>
      {/* Header */}
      <div className={`${styles.header} px-4 py-3 flex items-center justify-between`}>
        <h2 className="text-white font-semibold text-sm tracking-wide">
          {SECTION_LABELS[section]}
        </h2>
        <span className={`${styles.count} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {cards.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
            No cards yet
          </p>
        )}
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            isScrumMaster={isScrumMaster}
            onDelete={onDeleteCard}
            onReveal={onRevealCard}
          />
        ))}
      </div>

      {/* Card form */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <CardForm
          section={section}
          tags={tags}
          onSubmit={onAddCard}
          onCreateTag={onCreateTag}
        />
      </div>
    </div>
  );
}
