'use client';

import { useState } from 'react';
import type { CardDTOv2 } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { VoteButton } from '@/components/board/VoteButton';
import { ReactionBar } from '@/components/board/ReactionBar';
import { CommentList } from '@/components/board/CommentList';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { DrawingModal } from '@/components/board/DrawingModal';

interface CardProps {
  card: CardDTOv2;
  isScrumMaster: boolean;
  onDelete: (cardId: string) => void;
  onReveal: (cardId: string) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
}

export function Card({
  card,
  isScrumMaster,
  onDelete,
  onReveal,
  onAddComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
}: CardProps) {
  const canDelete = card.isOwnCard || isScrumMaster;
  const canReveal = card.isOwnCard && !card.isRevealed;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);

  return (
    <>
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

        {/* Reaction bar */}
        <ReactionBar
          cardId={card.id}
          reactions={card.reactions}
          onToggleReaction={onToggleReaction}
        />

        {/* Drawing thumbnails */}
        {card.drawings.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.drawings.map((drawing) => (
              <DrawingThumbnail key={drawing.id} drawing={drawing} />
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
            {/* Vote button — always visible */}
            <VoteButton
              cardId={card.id}
              voteCount={card.voteCount}
              hasVoted={card.hasVoted}
              onToggleVote={onToggleVote}
            />

            {/* Comments toggle */}
            <button
              onClick={() => setCommentsOpen((prev) => !prev)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium transition ${
                commentsOpen
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500'
              }`}
              title="Comments"
              aria-label={`${card.comments.length} comments`}
              aria-expanded={commentsOpen}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.105-.895 2-2 2H7l-4 4V6c0-1.105.895-2 2-2h14c1.105 0 2 .895 2 2v10z" />
              </svg>
              <span>{card.comments.length}</span>
            </button>

            {/* Drawing button */}
            <button
              onClick={() => setDrawingModalOpen(true)}
              className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Add drawing"
              aria-label="Add drawing"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

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

        {/* Expandable comments */}
        {commentsOpen && (
          <CommentList
            cardId={card.id}
            comments={card.comments}
            onAddComment={onAddComment}
          />
        )}
      </div>

      {drawingModalOpen && (
        <DrawingModal
          cardId={card.id}
          onSave={onAddDrawing}
          onClose={() => setDrawingModalOpen(false)}
        />
      )}
    </>
  );
}
