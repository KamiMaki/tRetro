'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardDTOv2, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTION_LABELS, SECTION_EMOJIS } from '@/lib/types';
import { Card } from '@/components/board/Card';
import { CardForm } from '@/components/board/CardForm';

const SECTION_TONES: Record<SectionType, 'mint' | 'pink' | 'amber' | 'violet'> = {
  'went-well':  'mint',
  'to-improve': 'amber',
  'thanks':     'pink',
  'deep-dive':  'violet',
};

interface SectionFullscreenProps {
  section: SectionType;
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  onClose: () => void;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
}

export function SectionFullscreen(props: SectionFullscreenProps) {
  const {
    section,
    cards,
    tags,
    isScrumMaster,
    onClose,
    onAddCard,
    onDeleteCard,
    onRevealCard,
    onCreateTag,
    onAddComment,
    onToggleReaction,
    onToggleVote,
    onAddDrawing,
  } = props;

  const tone = SECTION_TONES[section];
  const emoji = SECTION_EMOJIS[section];

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
      aria-label={`${SECTION_LABELS[section]} fullscreen`}
    >
      <div className="section-fullscreen-header">
        <div className="col-icon" aria-hidden="true">{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {SECTION_LABELS[section]}
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
              onDelete={onDeleteCard}
              onReveal={onRevealCard}
              onAddComment={onAddComment}
              onToggleReaction={onToggleReaction}
              onToggleVote={onToggleVote}
              onAddDrawing={onAddDrawing}
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
