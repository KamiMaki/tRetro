'use client';

import { useEffect, useRef, useState } from 'react';
import type { CardDTOv2, Tag } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { VoteButton } from '@/components/board/VoteButton';
import { ReactionBar } from '@/components/board/ReactionBar';
import { CommentList } from '@/components/board/CommentList';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { DrawingModal } from '@/components/board/DrawingModal';
import { Avatar } from '@/components/ui/Aurora';
import { computeConsensus } from '@/lib/utils/consensus';

interface CardProps {
  card: CardDTOv2;
  tone?: 'mint' | 'pink' | 'amber' | 'violet';
  isScrumMaster: boolean;
  participantCount: number;
  /** Room-wide tag list — used by the inline tag editor. */
  roomTags: Tag[];
  /** When true, the SM is sharing their screen. Hide 'You', author name, and
   *  reveal/un-reveal/delete affordances so the audience can't tell which card
   *  belongs to whom. SM-only park button is also gated on this flag. */
  shareMode: boolean;
  onDelete: (cardId: string) => void;
  onReveal: (cardId: string, nickname?: string) => void;
  onUnreveal: (cardId: string) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
  onConvertToAction?: (content: string) => void;
  /** SM-only "park" — moves the card to the deep-discussion column for a
   *  later deeper conversation. No-op when the card is already there. */
  onParkCard?: (cardId: string) => void;
  /** Update the card's tag set (author or SM). */
  onUpdateCardTags?: (cardId: string, tagIds: string[]) => void;
}

export function Card({
  card,
  tone = 'violet',
  isScrumMaster,
  participantCount,
  roomTags,
  shareMode,
  onDelete,
  onReveal,
  onUnreveal,
  onAddComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
  onConvertToAction,
  onParkCard,
  onUpdateCardTags,
}: CardProps) {
  const canDelete = (card.isOwnCard || isScrumMaster) && !shareMode;
  const canReveal = card.isOwnCard && !card.isRevealed && !shareMode;
  const canUnreveal = card.isOwnCard && card.isRevealed && !shareMode;
  const canEditTags = (card.isOwnCard || isScrumMaster) && !!onUpdateCardTags;
  // Park = move the card to the deep-discussion column for a later deeper
  // conversation. Only useful when (a) the SM is actively presenting and
  // (b) the card isn't already in deep-discussion.
  const canPark = isScrumMaster && shareMode && card.section !== 'deep-dive' && !!onParkCard;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealNickname, setRevealNickname] = useState('');
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const revealInputRef = useRef<HTMLInputElement>(null);
  const consensus = computeConsensus(card.voteCount, participantCount);
  const showConsensus = card.voteCount > 0 && participantCount > 0;

  useEffect(() => {
    if (revealOpen) {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('nickname') ?? '' : '';
      setRevealNickname((prev) => prev || stored);
      // Defer focus until after DOM commits the input.
      requestAnimationFrame(() => revealInputRef.current?.focus());
    }
  }, [revealOpen]);

  const authorLabel = shareMode
    ? 'Anonymous'
    : card.isRevealed && card.authorNickname
      ? card.authorNickname
      : card.isOwnCard
        ? 'You'
        : 'Anonymous';
  const showAnonAvatar = shareMode || (!card.isRevealed && !card.isOwnCard);
  const authorColor = shareMode
    ? 'var(--fg-3)'
    : card.isRevealed
      ? 'var(--fg-1)'
      : card.isOwnCard
        ? 'var(--aurora-violet)'
        : 'var(--fg-3)';

  function toggleTagSelection(tagId: string) {
    if (!onUpdateCardTags) return;
    const current = card.tags.map((t) => t.id);
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdateCardTags(card.id, next);
  }

  function handleRevealSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = revealNickname.trim();
    onReveal(card.id, trimmed.length > 0 ? trimmed : undefined);
    setRevealOpen(false);
    setRevealNickname('');
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    // Don't initiate drag if the user is interacting with text input/textarea.
    const tgt = e.target as HTMLElement;
    const tag = tgt.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tgt.isContentEditable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-tretro-card', card.id);
    e.dataTransfer.setData('text/plain', card.id);
  }

  return (
    <>
      <div
        className="sticky-card"
        data-tone={tone}
        data-consensus={showConsensus ? consensus.level : undefined}
        draggable
        onDragStart={handleDragStart}
        style={{ position: 'relative' }}
      >
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

        {/* Footer — flex-wrap so the action chips never overflow */}
        <div
          className="card-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            paddingTop: 8,
            borderTop: '1px solid var(--glass-border)',
            fontSize: 11,
          }}
        >
          <Avatar
            name={shareMode ? null : card.authorNickname}
            anon={showAnonAvatar}
            size={20}
          />
          <span
            className="text-mono"
            style={{
              color: authorColor,
              fontSize: 11,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {authorLabel}
          </span>
          <div style={{ flex: 1, minWidth: 0 }} />

          <VoteButton
            cardId={card.id}
            voteCount={card.voteCount}
            hasVoted={card.hasVoted}
            onToggleVote={onToggleVote}
          />
          {showConsensus && (
            <span
              className="text-mono"
              data-consensus={consensus.level}
              title={`Team consensus: ${consensus.label}`}
              aria-label={`Consensus ${consensus.label}`}
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
              }}
            >
              {consensus.pct}%
            </span>
          )}

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

          {canEditTags && (
            <button
              type="button"
              onClick={() => setTagEditorOpen((v) => !v)}
              aria-label="Edit tags on this card"
              aria-expanded={tagEditorOpen}
              title="Edit tags"
              style={{
                padding: 4,
                borderRadius: 6,
                background: tagEditorOpen ? 'var(--glass-bg-strong)' : 'transparent',
                border: '1px solid ' + (tagEditorOpen ? 'var(--glass-border)' : 'transparent'),
                color: tagEditorOpen ? 'var(--fg-0)' : 'var(--fg-3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color .15s, background .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg-0)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = tagEditorOpen ? 'var(--fg-0)' : 'var(--fg-3)')
              }
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 9V3h6l6 6-6 6z" />
                <circle cx="5" cy="6" r="1" />
              </svg>
            </button>
          )}

          {canPark && (
            <button
              type="button"
              onClick={() => onParkCard!(card.id)}
              aria-label="Park card — move to Deep Discussion"
              title="Park for deeper discussion (move to the Deep Discussion column)"
              className="btn-park"
            >
              ⏸ park
            </button>
          )}

          {isScrumMaster && onConvertToAction && (
            <button
              type="button"
              onClick={() => onConvertToAction(card.content)}
              aria-label="Convert this card into an action item"
              title="Convert to action item"
              style={{
                padding: 4,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color .15s, background .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'oklch(0.78 0.15 175)';
                e.currentTarget.style.background = 'oklch(0.78 0.15 175 / 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--fg-3)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="12" height="10" rx="2" />
                <path d="M5 7l2.5 2.5L11 6" />
              </svg>
            </button>
          )}

          {canReveal && (
            <button
              type="button"
              onClick={() => setRevealOpen(true)}
              title="Reveal your identity"
              className="btn-reveal"
            >
              reveal
            </button>
          )}
          {canUnreveal && (
            <button
              type="button"
              onClick={() => onUnreveal(card.id)}
              title="Hide your identity again"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                borderRadius: 6,
                background: 'var(--glass-highlight)',
                color: 'var(--fg-2)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              hide
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

        {tagEditorOpen && canEditTags && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div className="text-mono fg-3" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
              edit tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {roomTags.length === 0 ? (
                <span className="text-mono fg-3" style={{ fontSize: 11 }}>
                  no tags in this room yet — add one from the card form
                </span>
              ) : (
                roomTags.map((tag) => {
                  const active = card.tags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      aria-pressed={active}
                      title={active ? `Remove ${tag.name}` : `Add ${tag.name}`}
                      style={{
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: active ? 1 : 0.45,
                        borderRadius: 999,
                        transition: 'opacity .15s',
                      }}
                    >
                      <TagBadge tag={tag} />
                    </button>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTagEditorOpen(false)}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                done
              </button>
            </div>
          </div>
        )}

        {revealOpen && (
          <form
            onSubmit={handleRevealSubmit}
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <span className="text-mono fg-3" style={{ fontSize: 11 }}>
              reveal as
            </span>
            <input
              ref={revealInputRef}
              type="text"
              value={revealNickname}
              onChange={(e) => setRevealNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRevealOpen(false);
                }
              }}
              placeholder="your name"
              maxLength={40}
              style={{
                flex: 1,
                minWidth: 80,
                padding: '4px 8px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--aurora-violet)',
                borderRadius: 6,
                color: 'var(--fg-0)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '4px 12px', fontSize: 11 }}
            >
              reveal
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRevealOpen(false)}
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              cancel
            </button>
          </form>
        )}

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
