'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardDTOv2, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types'; // SectionType retained as data-col attribute
import { SECTION_LABELS, SECTION_EMOJIS, SECTION_TONES } from '@/lib/types';
import type { RetroTemplate } from '@/lib/templates';
import { Card } from '@/components/board/Card';
import { CardForm } from '@/components/board/CardForm';

interface SectionFullscreenProps {
  section: SectionType;
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  participantCount: number;
  template?: RetroTemplate;
  onClose: () => void;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string, nickname?: string) => void;
  onUnrevealCard: (cardId: string) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
  onConvertToAction: (content: string) => void;
  shareMode: boolean;
  onSetCardParked?: (cardId: string, isParked: boolean) => void;
  onUpdateCardTags?: (cardId: string, tagIds: string[]) => void;
}

export function SectionFullscreen(props: SectionFullscreenProps) {
  const {
    section,
    cards,
    tags,
    isScrumMaster,
    participantCount,
    template,
    onClose,
    onAddCard,
    onDeleteCard,
    onRevealCard,
    onUnrevealCard,
    onCreateTag,
    onAddComment,
    onToggleReaction,
    onToggleVote,
    onAddDrawing,
    onConvertToAction,
    shareMode,
    onSetCardParked,
    onUpdateCardTags,
  } = props;

  const tone = SECTION_TONES[section];
  const emoji = template?.emojis[section] ?? SECTION_EMOJIS[section];
  const label = template?.labels[section] ?? SECTION_LABELS[section];

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // don't close if a contenteditable / nested modal is focused
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
          // let the form swallow the escape, then close on a second press
          return;
        }
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="section-fullscreen col"
      data-col={section}
      role="dialog"
      aria-modal="true"
      aria-label={`${label} fullscreen`}
    >
      <div className="section-fullscreen-header">
        <div className="col-icon" aria-hidden="true">{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {label}
          </div>
          <div className="text-mono fg-3" style={{ fontSize: 12 }}>
            {cards.length} card{cards.length === 1 ? '' : 's'} · press Esc to exit
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={onClose}
          aria-label="Exit fullscreen"
          title="Exit fullscreen (Esc)"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 2h4v4M14 2L9 7M6 14H2v-4M2 14l5-5" />
          </svg>
          Exit
        </button>
      </div>

      <div className="section-fullscreen-grid">
        {cards.length === 0 ? (
          <div
            className="fg-3"
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              fontSize: 14,
              padding: '64px 20px',
              fontFamily: 'var(--font-mono)',
              opacity: 0.7,
            }}
          >
            no cards yet — add one below
          </div>
        ) : (
          cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              tone={tone}
              isScrumMaster={isScrumMaster}
              participantCount={participantCount}
              roomTags={tags}
              shareMode={shareMode}
              onDelete={onDeleteCard}
              onReveal={onRevealCard}
              onUnreveal={onUnrevealCard}
              onAddComment={onAddComment}
              onToggleReaction={onToggleReaction}
              onToggleVote={onToggleVote}
              onAddDrawing={onAddDrawing}
              onConvertToAction={onConvertToAction}
              onSetParked={onSetCardParked}
              onUpdateCardTags={onUpdateCardTags}
            />
          ))
        )}
      </div>

      <div className="section-fullscreen-form">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <CardForm
            section={section}
            tags={tags}
            onSubmit={onAddCard}
            onCreateTag={onCreateTag}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
