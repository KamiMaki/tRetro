'use client';

import type { CardDTOv2, Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { SECTION_LABELS } from '@/lib/types';
import { Card } from '@/components/board/Card';
import { CardForm } from '@/components/board/CardForm';
import { GlassPanel } from '@/components/ui/Aurora';

const SECTION_META: Record<SectionType, { symbol: string; tone: 'mint' | 'pink' | 'amber' | 'violet' }> = {
  'went-well':  { symbol: '✓', tone: 'mint'   },
  'to-improve': { symbol: '!', tone: 'pink'   },
  'thanks':     { symbol: '★', tone: 'amber'  },
  'deep-dive':  { symbol: '?', tone: 'violet' },
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
  const meta = SECTION_META[section];

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
        <div className="col-header" style={{ paddingRight: 14 }}>
          <div className="col-icon" aria-hidden="true">{meta.symbol}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-display" style={{ fontSize: 15, fontWeight: 600 }}>
              {SECTION_LABELS[section]}
            </div>
            <div className="text-mono fg-3" style={{ fontSize: 11 }}>
              {cards.length} card{cards.length === 1 ? '' : 's'}
            </div>
          </div>
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
                  tone={meta.tone}
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
    </div>
  );
}
