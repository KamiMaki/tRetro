'use client';

import type { CardDTO } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';

interface CardProps {
  card: CardDTO;
  isScrumMaster: boolean;
  onDelete: (cardId: string) => void;
  onReveal: (cardId: string) => void;
}

export function Card({ card, isScrumMaster, onDelete, onReveal }: CardProps) {
  const canDelete = card.isOwnCard || isScrumMaster;
  const canReveal = card.isOwnCard && !card.isRevealed;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-2 group">
      {/* Content */}
      <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
        {card.content}
      </p>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {/* Author info */}
        <div className="min-w-0">
          {card.isRevealed && card.authorNickname ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {card.authorNickname}
            </span>
          ) : card.isOwnCard ? (
            <span className="text-xs text-indigo-400 dark:text-indigo-500">You</span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">Anonymous</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {canReveal && (
            <button
              onClick={() => onReveal(card.id)}
              className="text-xs px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Reveal your identity"
            >
              Reveal
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(card.id)}
              className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Delete card"
              aria-label="Delete card"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
