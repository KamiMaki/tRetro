'use client';

import { useMemo, useState } from 'react';
import type { CardDTOv2, SectionType, Tag } from '@/lib/types';
import { SECTION_LABELS, SECTION_TONES, SECTION_EMOJIS } from '@/lib/types';
import { GlassPanel } from '@/components/ui/Aurora';

interface DiscussionPanelProps {
  cards: CardDTOv2[];
  tags: Tag[];
  onConvertToAction: (content: string) => void;
  onSetCardParked: (cardId: string, isParked: boolean) => void;
}

type GroupSort = 'count' | 'votes';
type CardSort = 'votes' | 'time' | 'reactions';
type Decision = 'discussed' | 'park' | 'action';

const UNTAGGED_KEY = '__untagged__';
const ALL_KEY = '__all__';

function reactionTotal(card: CardDTOv2): number {
  return card.reactions.reduce((s, r) => s + r.count, 0);
}

export function DiscussionPanel({
  cards,
  tags,
  onConvertToAction,
  onSetCardParked,
}: DiscussionPanelProps) {
  const [groupSort, setGroupSort] = useState<GroupSort>('count');
  const [cardSort, setCardSort] = useState<CardSort>('votes');
  const [activeGroup, setActiveGroup] = useState<string>(ALL_KEY);
  // Local-only: which cards the SM has marked "discussed" this session.
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());

  const tagById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  // Group active (non-parked) cards by tag id. Untagged cards live in
  // their own bucket so the SM never loses sight of them.
  const groups = useMemo(() => {
    const liveCards = cards.filter((c) => !c.isParked);
    const buckets = new Map<string, CardDTOv2[]>();
    for (const c of liveCards) {
      if (c.tags.length === 0) {
        if (!buckets.has(UNTAGGED_KEY)) buckets.set(UNTAGGED_KEY, []);
        buckets.get(UNTAGGED_KEY)!.push(c);
      } else {
        for (const t of c.tags) {
          if (!buckets.has(t.id)) buckets.set(t.id, []);
          buckets.get(t.id)!.push(c);
        }
      }
    }
    const entries = Array.from(buckets.entries());
    if (groupSort === 'votes') {
      entries.sort(
        (a, b) =>
          b[1].reduce((s, c) => s + c.voteCount, 0) -
          a[1].reduce((s, c) => s + c.voteCount, 0),
      );
    } else {
      entries.sort((a, b) => b[1].length - a[1].length);
    }
    return entries;
  }, [cards, groupSort]);

  const parkedCards = useMemo(() => cards.filter((c) => c.isParked), [cards]);

  // The cards visible in the main queue depend on the active group filter.
  const visibleCards = useMemo(() => {
    let pool: CardDTOv2[];
    if (activeGroup === ALL_KEY) {
      pool = cards.filter((c) => !c.isParked);
    } else if (activeGroup === UNTAGGED_KEY) {
      pool = cards.filter((c) => !c.isParked && c.tags.length === 0);
    } else {
      pool = cards.filter(
        (c) => !c.isParked && c.tags.some((t) => t.id === activeGroup),
      );
    }
    const sorted = [...pool];
    if (cardSort === 'votes') sorted.sort((a, b) => b.voteCount - a.voteCount);
    else if (cardSort === 'reactions')
      sorted.sort((a, b) => reactionTotal(b) - reactionTotal(a));
    else sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    return sorted;
  }, [cards, activeGroup, cardSort]);

  const totalLive = cards.filter((c) => !c.isParked).length;
  const discussedCount = visibleCards.filter((c) => discussed.has(c.id)).length;

  const toggleDiscussed = (cardId: string) => {
    setDiscussed((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleDecision = (card: CardDTOv2, decision: Decision) => {
    if (decision === 'action') {
      onConvertToAction(card.content);
      // Also mark as discussed so the SM doesn't revisit it.
      setDiscussed((prev) => new Set(prev).add(card.id));
    } else if (decision === 'park') {
      onSetCardParked(card.id, true);
    } else {
      toggleDiscussed(card.id);
    }
  };

  return (
    <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'oklch(0.15 0.04 270)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          🗣
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Discussion · Scrum Master mode
          </div>
          <div className="text-mono fg-3" style={{ fontSize: 11 }}>
            walking {totalLive} active card{totalLive === 1 ? '' : 's'}
            {parkedCards.length > 0 && ` · ${parkedCards.length} parked`}
            {' · '}
            <span title="Discussed in current view">
              {discussedCount}/{visibleCards.length} discussed
            </span>
            {' · all cards anonymous'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label className="text-mono fg-3" style={{ fontSize: 11 }}>
            sort cards by
          </label>
          <select
            value={cardSort}
            onChange={(e) => setCardSort(e.target.value as CardSort)}
            className="field"
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            <option value="votes">most voted</option>
            <option value="reactions">most reactions</option>
            <option value="time">oldest first</option>
          </select>
          <label className="text-mono fg-3" style={{ fontSize: 11, marginLeft: 6 }}>
            tag groups
          </label>
          <select
            value={groupSort}
            onChange={(e) => setGroupSort(e.target.value as GroupSort)}
            className="field"
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            <option value="count">by card count</option>
            <option value="votes">by vote total</option>
          </select>
        </div>
      </div>

      {/* Tag rail */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveGroup(ALL_KEY)}
          className={
            activeGroup === ALL_KEY ? 'discuss-chip discuss-chip-active' : 'discuss-chip'
          }
        >
          all <span className="text-mono fg-3" style={{ fontSize: 10 }}>{totalLive}</span>
        </button>
        {groups.map(([key, list]) => {
          const tag = tagById.get(key);
          const label = key === UNTAGGED_KEY ? 'untagged' : tag?.name ?? key;
          const color = tag?.color ?? 'oklch(0.65 0 0)';
          const active = activeGroup === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveGroup(key)}
              className={active ? 'discuss-chip discuss-chip-active' : 'discuss-chip'}
              title={`${list.length} card${list.length === 1 ? '' : 's'}`}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: color,
                  marginRight: 4,
                }}
              />
              {label}{' '}
              <span className="text-mono fg-3" style={{ fontSize: 10 }}>
                {list.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body — main queue + parked lot */}
      <div className="discuss-body">
        <div className="discuss-main">
          {visibleCards.length === 0 ? (
            <div
              className="fg-3 text-mono"
              style={{ textAlign: 'center', fontSize: 12, padding: '32px 12px' }}
            >
              {totalLive === 0
                ? 'no cards yet — start collecting in the Board tab'
                : 'no cards in this group — pick another tag'}
            </div>
          ) : (
            visibleCards.map((card) => (
              <DiscussionCard
                key={card.id}
                card={card}
                isDiscussed={discussed.has(card.id)}
                onDecision={(d) => handleDecision(card, d)}
              />
            ))
          )}
        </div>
        <aside className="discuss-aside">
          <div className="text-mono fg-3" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Parking lot · {parkedCards.length}
          </div>
          {parkedCards.length === 0 ? (
            <div className="fg-3 text-mono" style={{ fontSize: 11 }}>
              cards you ⏸ park land here for a deeper dive later.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parkedCards.map((card) => (
                <ParkedCard
                  key={card.id}
                  card={card}
                  onUnpark={() => onSetCardParked(card.id, false)}
                  onConvertToAction={() => onConvertToAction(card.content)}
                />
              ))}
            </div>
          )}
        </aside>
      </div>

      <style jsx>{`
        .discuss-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 999px;
          background: var(--glass-highlight);
          border: 1px solid var(--glass-border);
          color: var(--fg-1);
          font-family: var(--font-mono);
          font-size: 11px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .discuss-chip:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .discuss-chip-active {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
          border-color: var(--aurora-violet);
          box-shadow: 0 0 0 3px oklch(0.68 0.20 285 / 0.18);
        }
        .discuss-body {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          padding: 0;
        }
        @media (min-width: 1024px) {
          .discuss-body {
            grid-template-columns: minmax(0, 1fr) 280px;
          }
        }
        .discuss-main {
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 240px;
        }
        .discuss-aside {
          padding: 14px 20px;
          border-top: 1px solid var(--glass-border);
        }
        @media (min-width: 1024px) {
          .discuss-aside {
            border-top: none;
            border-left: 1px solid var(--glass-border);
            min-height: 240px;
          }
        }
      `}</style>
    </GlassPanel>
  );
}

interface DiscussionCardProps {
  card: CardDTOv2;
  isDiscussed: boolean;
  onDecision: (d: Decision) => void;
}

function DiscussionCard({ card, isDiscussed, onDecision }: DiscussionCardProps) {
  const tone = SECTION_TONES[card.section as SectionType];
  const sectionLabel = SECTION_LABELS[card.section as SectionType];
  const sectionEmoji = SECTION_EMOJIS[card.section as SectionType];
  const reactions = reactionTotal(card);

  return (
    <article
      className="sticky-card"
      data-tone={tone}
      style={{
        opacity: isDiscussed ? 0.55 : 1,
        transition: 'opacity 0.2s',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--fg-0)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: 8,
        }}
      >
        {card.content}
      </div>
      {/* Tags */}
      {card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {card.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-mono"
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--glass-highlight)',
                border: `1px solid ${tag.color}`,
                color: 'var(--fg-1)',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--glass-border)',
          fontSize: 11,
        }}
      >
        <span
          className="text-mono"
          title={sectionLabel}
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--glass-highlight)',
            color: 'var(--fg-2)',
            fontSize: 10,
          }}
        >
          {sectionEmoji} {sectionLabel}
        </span>
        <span className="text-mono fg-3" style={{ fontSize: 10 }}>
          🗳 {card.voteCount}
        </span>
        {reactions > 0 && (
          <span className="text-mono fg-3" style={{ fontSize: 10 }}>
            ✶ {reactions}
          </span>
        )}
        <span className="text-mono fg-3" style={{ fontSize: 10 }}>
          anon
        </span>
        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => onDecision('action')}
          className="discuss-btn discuss-btn-action"
          title="Convert this card into an action item"
        >
          ➜ Action
        </button>
        <button
          type="button"
          onClick={() => onDecision('park')}
          className="discuss-btn discuss-btn-park"
          title="Park for deeper discussion later"
        >
          ⏸ Park
        </button>
        <button
          type="button"
          onClick={() => onDecision('discussed')}
          className={
            isDiscussed
              ? 'discuss-btn discuss-btn-discussed-active'
              : 'discuss-btn discuss-btn-discussed'
          }
          title={isDiscussed ? 'Un-mark as discussed' : 'Mark as discussed'}
        >
          {isDiscussed ? '✓ Done' : '✓ Discussed'}
        </button>
      </div>

      <style jsx>{`
        .discuss-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--glass-border);
          background: var(--glass-highlight);
          color: var(--fg-1);
          font-family: var(--font-mono);
          font-size: 10.5px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .discuss-btn:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .discuss-btn-action {
          border-color: oklch(0.78 0.15 175 / 0.45);
          color: oklch(0.92 0.12 175);
          background: oklch(0.78 0.15 175 / 0.12);
        }
        .discuss-btn-action:hover {
          background: oklch(0.78 0.15 175 / 0.22);
        }
        .discuss-btn-park {
          border-color: oklch(0.78 0.16 75 / 0.45);
          color: oklch(0.92 0.12 75);
          background: oklch(0.78 0.16 75 / 0.10);
        }
        .discuss-btn-park:hover {
          background: oklch(0.78 0.16 75 / 0.20);
        }
        .discuss-btn-discussed-active {
          border-color: var(--aurora-violet);
          background: oklch(0.68 0.20 285 / 0.20);
          color: oklch(0.92 0.14 285);
        }
      `}</style>
    </article>
  );
}

interface ParkedCardProps {
  card: CardDTOv2;
  onUnpark: () => void;
  onConvertToAction: () => void;
}

function ParkedCard({ card, onUnpark, onConvertToAction }: ParkedCardProps) {
  const tone = SECTION_TONES[card.section as SectionType];
  return (
    <div
      className="sticky-card"
      data-tone={tone}
      style={{ padding: 10, fontSize: 12, opacity: 0.92 }}
    >
      <div style={{ marginBottom: 6, lineHeight: 1.4, color: 'var(--fg-0)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {card.content}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="text-mono fg-3" style={{ fontSize: 10 }}>🗳 {card.voteCount}</span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onConvertToAction}
          className="parked-btn parked-btn-action"
          title="Convert into an action item"
        >
          ➜ Action
        </button>
        <button
          type="button"
          onClick={onUnpark}
          className="parked-btn"
          title="Move back to the active queue"
        >
          ↩ Unpark
        </button>
      </div>
      <style jsx>{`
        .parked-btn {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--glass-border);
          background: var(--glass-highlight);
          color: var(--fg-1);
          font-family: var(--font-mono);
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .parked-btn:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .parked-btn-action {
          border-color: oklch(0.78 0.15 175 / 0.45);
          color: oklch(0.92 0.12 175);
          background: oklch(0.78 0.15 175 / 0.12);
        }
        .parked-btn-action:hover {
          background: oklch(0.78 0.15 175 / 0.22);
        }
      `}</style>
    </div>
  );
}
