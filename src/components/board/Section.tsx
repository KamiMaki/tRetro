'use client';

import { useState } from 'react';
import type { CardDTOv2, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTION_LABELS, SECTION_EMOJIS } from '@/lib/types';
import { Card } from '@/components/board/Card';
import { CardForm } from '@/components/board/CardForm';
import { SectionFullscreen } from '@/components/board/SectionFullscreen';
import { GlassPanel } from '@/components/ui/Aurora';

const SECTION_TONES: Record<SectionType, 'mint' | 'pink' | 'amber' | 'violet'> = {
  'went-well':  'mint',
  'to-improve': 'amber',
  'thanks':     'pink',
  'deep-dive':  'violet',
};

interface SectionProps {
  section: SectionType;
  cards: CardDTOv2[];
  tags: Tag[];
  isScrumMaster: boolean;
  onAddCard: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onDeleteCard: (cardId: string) => void;
  onRevealCard: (cardId: string) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
  onAddComment: (cardId: string, content: string) => void;
  onToggleReaction: (cardId: string, emoji: string) => void;
  onToggleVote: (cardId: string) => void;
  onAddDrawing: (cardId: string, data: string) => void;
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
  onAddComment,
  onToggleReaction,
  onToggleVote,
  onAddDrawing,
}: SectionProps) {
  const tone = SECTION_TONES[section];
  const emoji = SECTION_EMOJIS[section];
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="col" data-col={section} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <GlassPanel
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 420,
        }}
      >
        {/* Header */}
        <div className="col-header" style={{ paddingRight: 8 }}>
          <div className="col-icon" aria-hidden="true">{emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-display" style={{ fontSize: 15, fontWeight: 600 }}>
              {SECTION_LABELS[section]}
            </div>
            <div className="text-mono fg-3" style={{ fontSize: 11 }}>
              {cards.length} card{cards.length === 1 ? '' : 's'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label={`Expand ${SECTION_LABELS[section]} to fullscreen`}
            title="Fullscreen (browse all cards)"
            style={{
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: 8,
              background: 'var(--glass-highlight)',
              border: '1px solid var(--glass-border)',
              color: 'var(--fg-1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg-strong)';
              e.currentTarget.style.color = 'var(--fg-0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-highlight)';
              e.currentTarget.style.color = 'var(--fg-1)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
            </svg>
          </button>
        </div>

        {/* Cards */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '14px 12px 10px',
          }}
        >
          {cards.length === 0 ? (
            <div
              className="fg-3"
              style={{
                textAlign: 'center',
                fontSize: 12,
                padding: '32px 12px',
                fontFamily: 'var(--font-mono)',
                opacity: 0.6,
              }}
            >
              no cards yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cards.map((card) => (
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
              ))}
            </div>
          )}
        </div>

        {/* Card form */}
        <div style={{ padding: 12, borderTop: '1px solid var(--glass-border)' }}>
          <CardForm
            section={section}
            tags={tags}
            onSubmit={onAddCard}
            onCreateTag={onCreateTag}
          />
        </div>
      </GlassPanel>

      {fullscreen && (
        <SectionFullscreen
          section={section}
          cards={cards}
          tags={tags}
          isScrumMaster={isScrumMaster}
          onClose={() => setFullscreen(false)}
          onAddCard={onAddCard}
          onDeleteCard={onDeleteCard}
          onRevealCard={onRevealCard}
          onCreateTag={onCreateTag}
          onAddComment={onAddComment}
          onToggleReaction={onToggleReaction}
          onToggleVote={onToggleVote}
          onAddDrawing={onAddDrawing}
        />
      )}
    </div>
  );
}
