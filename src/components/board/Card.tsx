'use client';

import { useState } from 'react';
import type { CardDTOv2 } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { VoteButton } from '@/components/board/VoteButton';
import { ReactionBar } from '@/components/board/ReactionBar';
import { CommentList } from '@/components/board/CommentList';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { DrawingModal } from '@/components/board/DrawingModal';
import { Avatar } from '@/components/ui/Aurora';

interface CardProps {
  card: CardDTOv2;
  tone?: 'mint' | 'pink' | 'amber' | 'violet';
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
  tone = 'violet',
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

  const authorLabel = card.isRevealed && card.authorNickname
    ? card.authorNickname
    : card.isOwnCard
      ? 'You'
      : 'Anonymous';

  return (
    <>
      <div className="sticky-card" data-tone={tone} style={{ position: 'relative' }}>
        {/* Card content */}
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--fg-0)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 10,
          }}
        >
          {card.content}
        </div>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {card.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        {/* Drawings */}
        {card.drawings.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {card.drawings.map((drawing) => (
              <DrawingThumbnail key={drawing.id} drawing={drawing} />
            ))}
          </div>
        )}

        {/* Reaction bar */}
        <div style={{ marginBottom: 10 }}>
          <ReactionBar
            cardId={card.id}
            reactions={card.reactions}
            onToggleReaction={onToggleReaction}
          />
        </div>

        {/* Footer */}
        <div
          className="card-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--glass-border)',
            fontSize: 11,
          }}
        >
          <Avatar
            name={card.authorNickname}
            anon={!card.isRevealed && !card.isOwnCard}
            size={20}
          />
          <span
            className="text-mono"
            style={{
              color: card.isRevealed
                ? 'var(--fg-1)'
                : card.isOwnCard
                  ? 'var(--aurora-violet)'
                  : 'var(--fg-3)',
              fontSize: 11,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {authorLabel}
          </span>
          <div style={{ flex: 1 }} />

          <VoteButton
            cardId={card.id}
            voteCount={card.voteCount}
            hasVoted={card.hasVoted}
            onToggleVote={onToggleVote}
          />

          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-label={`${card.comments.length} comments`}
            aria-expanded={commentsOpen}
            title="Comments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: commentsOpen ? 'var(--glass-bg-strong)' : 'var(--glass-highlight)',
              color: commentsOpen ? 'var(--fg-0)' : 'var(--fg-2)',
              border: '1px solid ' + (commentsOpen ? 'var(--glass-border)' : 'transparent'),
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4h10v6H8l-3 3v-3H3z" />
            </svg>
            {card.comments.length}
          </button>

          <button
            type="button"
            onClick={() => setDrawingModalOpen(true)}
            aria-label="Add drawing"
            title="Add drawing"
            style={{
              padding: 4,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-3)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'color .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg-0)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-3)')}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 2l3 3-9 9H2v-3z" />
            </svg>
          </button>

          {canReveal && (
            <button
              type="button"
              onClick={() => onReveal(card.id)}
              title="Reveal your identity"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                borderRadius: 6,
                background: 'oklch(0.68 0.20 285 / 0.22)',
                color: 'oklch(0.92 0.14 285)',
                border: '1px solid oklch(0.68 0.20 285 / 0.32)',
                cursor: 'pointer',
              }}
            >
              reveal
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              aria-label="Delete card"
              title="Delete card"
              style={{
                padding: 4,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.78 0.16 25)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-3)')}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          )}
        </div>

        {commentsOpen && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
            <CommentList
              cardId={card.id}
              comments={card.comments}
              onAddComment={onAddComment}
            />
          </div>
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
