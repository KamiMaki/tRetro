'use client';

import { useMemo, useState } from 'react';
import type { CardDTOv2, SectionTone, Tag, BoardSectionView } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { CommentList } from '@/components/board/CommentList';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { Avatar } from '@/components/ui/Aurora';

// Review (檢視) mode — every card across the 4 sections expanded at once,
// stacked top-to-bottom, with one-click expand/collapse of all comment
// threads. A pure read/triage surface: no decision controls.

const TONE_VAR: Record<SectionTone, string> = {
  mint: 'var(--aurora-mint)',
  cyan: 'var(--aurora-cyan)',
  pink: 'var(--aurora-pink)',
  amber: 'var(--aurora-amber)',
  violet: 'var(--aurora-violet)',
};

interface ReviewPanelProps {
  cards: CardDTOv2[];
  /** The room's sections in display order (room_sections or fallback). */
  sections: BoardSectionView[];
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  onDeleteComment?: (commentId: string, cardId: string) => void;
  onUpdateComment?: (commentId: string, cardId: string, content: string, imageData?: string | null) => void;
  isScrumMaster?: boolean;
}

export function ReviewPanel({ cards, sections, onAddComment, onDeleteComment, onUpdateComment, isScrumMaster = false }: ReviewPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>('all'); // 'all' | tag id

  // Tag list for the filter rail — sorted by how many cards carry each tag.
  const { tagsById, topTags, tagCounts } = useMemo(() => {
    const byId = new Map<string, Tag>();
    const counts: Record<string, number> = {};
    for (const card of cards) {
      for (const tag of card.tags) {
        byId.set(tag.id, tag);
        counts[tag.id] = (counts[tag.id] ?? 0) + 1;
      }
    }
    const sorted = [...byId.keys()].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    return { tagsById: byId, topTags: sorted, tagCounts: counts };
  }, [cards]);

  const matchesFilter = (card: CardDTOv2) =>
    filter === 'all' || card.tags.some((t) => t.id === filter);

  const visibleCards = cards.filter(matchesFilter);
  const allIds = visibleCards.map((c) => c.id);
  const allExpanded = allIds.length > 0 && allIds.every((id) => expanded[id]);
  const someExpanded = allIds.some((id) => expanded[id]);

  const setMany = (ids: string[], value: boolean) =>
    setExpanded((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = value;
      return next;
    });

  const totalComments = visibleCards.reduce((sum, c) => sum + c.comments.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '10px 14px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        }}
      >
        <span
          className="text-mono fg-3"
          style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          {visibleCards.length} cards · {totalComments} comments
        </span>

        <span style={{ width: 1, height: 18, background: 'var(--glass-border)', margin: '0 2px' }} />

        <span className="text-mono fg-3" style={{ fontSize: 11 }}>
          filter:
        </span>
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
          all
        </FilterPill>
        {topTags.slice(0, 6).map((tagId) => {
          const tag = tagsById.get(tagId)!;
          return (
            <FilterPill
              key={tagId}
              active={filter === tagId}
              onClick={() => setFilter(filter === tagId ? 'all' : tagId)}
            >
              <TagBadge tag={tag} />
              <span style={{ marginLeft: 4 }}>{tagCounts[tagId]}</span>
            </FilterPill>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => setMany(allIds, !allExpanded)}
          className="btn"
          disabled={allIds.length === 0}
          style={{
            background: allExpanded ? 'var(--glass-bg-strong)' : 'var(--glass-bg)',
            borderColor: someExpanded ? 'var(--aurora-violet)' : 'var(--glass-border)',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={allExpanded ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} />
          </svg>
          {allExpanded ? 'Collapse all comments' : 'Expand all comments'}
        </button>
      </div>

      {/* Stacked sections — one per room section, in board order. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {sections.map((s) => (
          <ReviewSection
            key={s.sectionKey}
            label={s.label}
            emoji={s.emoji}
            tone={s.tone}
            cards={cards.filter((c) => c.section === s.sectionKey && matchesFilter(c))}
            expanded={expanded}
            setExpanded={setExpanded}
            setMany={setMany}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onUpdateComment={onUpdateComment}
            isScrumMaster={isScrumMaster}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        background: active ? 'var(--glass-bg-strong)' : 'transparent',
        border: '1px solid ' + (active ? 'var(--aurora-violet)' : 'var(--glass-border)'),
        color: active ? 'var(--fg-0)' : 'var(--fg-2)',
        boxShadow: active ? '0 0 0 3px oklch(0.68 0.20 285 / 0.12)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function ReviewSection({
  label,
  emoji,
  tone,
  cards,
  expanded,
  setExpanded,
  setMany,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  isScrumMaster,
}: {
  label: string;
  emoji: string;
  tone: SectionTone;
  cards: CardDTOv2[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setMany: (ids: string[], value: boolean) => void;
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  onDeleteComment?: (commentId: string, cardId: string) => void;
  onUpdateComment?: (commentId: string, cardId: string, content: string, imageData?: string | null) => void;
  isScrumMaster?: boolean;
}) {
  const accent = TONE_VAR[tone];
  const ids = cards.map((c) => c.id);
  const sectionExpanded = cards.length > 0 && ids.every((id) => expanded[id]);
  const commentCount = cards.reduce((sum, c) => sum + c.comments.length, 0);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Section header — colored band */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 14,
          background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 14%, transparent), transparent 70%)`,
          border: '1px solid var(--glass-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }}
        />
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            marginLeft: 8,
            background: `color-mix(in oklab, ${accent} 28%, transparent)`,
            border: `1px solid color-mix(in oklab, ${accent} 55%, transparent)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          {emoji}
        </div>
        <div>
          <div className="text-display" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {label}
          </div>
          <div className="text-mono fg-3" style={{ fontSize: 11 }}>
            {cards.length} card{cards.length === 1 ? '' : 's'} · {commentCount} comments
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {cards.length > 0 && (
          <button
            type="button"
            onClick={() => setMany(ids, !sectionExpanded)}
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
          >
            {sectionExpanded ? 'Collapse section' : 'Expand section'}
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="text-mono fg-3" style={{ padding: '8px 16px', fontSize: 11, opacity: 0.7 }}>
          — no cards match this filter —
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          }}
        >
          {cards.map((card) => (
            <ReviewCard
              key={card.id}
              card={card}
              tone={tone}
              expanded={!!expanded[card.id]}
              onToggle={() => setExpanded((s) => ({ ...s, [card.id]: !s[card.id] }))}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
              onUpdateComment={onUpdateComment}
              isScrumMaster={isScrumMaster}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  card,
  tone,
  expanded,
  onToggle,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  isScrumMaster,
}: {
  card: CardDTOv2;
  tone: SectionTone;
  expanded: boolean;
  onToggle: () => void;
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  onDeleteComment?: (commentId: string, cardId: string) => void;
  onUpdateComment?: (commentId: string, cardId: string, content: string, imageData?: string | null) => void;
  isScrumMaster?: boolean;
}) {
  // Server-driven: a non-null authorNickname means "show this name".
  // Named rooms always populate it; anonymous rooms force null.
  const revealed = !!card.authorNickname;
  const authorLabel = revealed ? card.authorNickname! : card.isOwnCard ? 'You' : 'Anonymous';
  const topReactions = card.reactions.filter((r) => r.count > 0).slice(0, 3);

  return (
    <div
      className="sticky-card"
      data-tone={tone}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--fg-0)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {card.content}
      </div>

      {card.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {card.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      {card.drawings.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {card.drawings.map((drawing) => (
            <DrawingThumbnail key={drawing.id} drawing={drawing} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <Avatar name={revealed ? card.authorNickname : null} anon={!revealed} size={20} />
        <span className="text-mono fg-2">{authorLabel}</span>
        <div style={{ flex: 1 }} />
        {topReactions.map((r) => (
          <span
            key={r.emoji}
            className="text-mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 6px',
              borderRadius: 999,
              background: 'var(--glass-highlight)',
              fontSize: 10,
            }}
          >
            <span style={{ fontSize: 11 }}>{r.emoji}</span>
            {r.count}
          </span>
        ))}
      </div>

      {/* Comments toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          background: expanded ? 'var(--glass-bg-strong)' : 'transparent',
          border: '1px solid var(--glass-border)',
          color: 'var(--fg-1)',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={expanded ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} />
        </svg>
        <span>
          {card.comments.length} comment{card.comments.length === 1 ? '' : 's'}
        </span>
        <span className="fg-3" style={{ marginLeft: 'auto' }}>
          {expanded ? 'hide' : 'show'}
        </span>
      </button>

      {expanded && (
        <div
          className="fade-in"
          style={{ paddingTop: 10, borderTop: '1px dashed var(--glass-border)' }}
        >
          <CommentList
            cardId={card.id}
            comments={card.comments}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onUpdateComment={onUpdateComment}
            isScrumMaster={isScrumMaster}
          />
        </div>
      )}
    </div>
  );
}
