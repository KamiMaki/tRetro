'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardDTOv2, Tag, BoardSectionView, CheerEffect, LiveCheer, LiveCombo } from '@/lib/types';
import { GlassPanel, Avatar } from '@/components/ui/Aurora';
import { Switch } from '@/components/ui/Switch';
import { TagBadge } from '@/components/board/TagBadge';
import { CommentList } from '@/components/board/CommentList';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { cardHeatClass } from '@/lib/utils/heat';
import { CheerBurst, CHEER_ARCHETYPE, CHEER_EMOJI, CHEER_ORDER } from './CheerBurst';

// Discussion (討論) mode — Focus walkthrough. The facilitator steps through
// cards one tag-group at a time: a card queue on the left, the focused card
// in the centre, and a comment viewer on the right.
// "Action item" creates a real action item; "Park" is a local, session-only
// marker.

type Decision = 'action' | 'park';

const UNTAGGED = '__untagged__';

// Resizable comment panel (right column). Persisted per-browser so a
// facilitator's preferred width survives reloads.
const COMMENTS_MIN = 260;
const COMMENTS_MAX = 640;
const COMMENTS_DEFAULT = 300;
const COMMENTS_WIDTH_KEY = 'tretro-discussion-comments-width';
const clampCommentsWidth = (w: number) => Math.min(COMMENTS_MAX, Math.max(COMMENTS_MIN, w));

const DECISION_BADGE: Record<Decision, string> = {
  action: 'var(--aurora-mint)',
  park: 'var(--aurora-amber)',
};

interface DiscussionPanelProps {
  cards: CardDTOv2[];
  /** The room's sections — drives focus-walkthrough order + card tone. */
  sections: BoardSectionView[];
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  onDeleteComment?: (commentId: string, cardId: string) => void;
  onUpdateComment?: (commentId: string, cardId: string, content: string, imageData?: string | null) => void;
  isScrumMaster?: boolean;
  onCreateActionItem: (description: string) => void;
  /** Live cheer bursts from the whole room; each plays once then expires. */
  cheers?: LiveCheer[];
  /** Live combos — the room cheering together. Takes over the whole panel. */
  combos?: LiveCombo[];
  onSendCheer?: (cardId: string, effect: CheerEffect) => void;
  /** The card the presenter is on, or null when nobody is presenting. */
  facilitatorFocus?: string | null;
  /** Who holds the wheel; null when nobody does. */
  presenterId?: string | null;
  /** Our own participant id — everyone is an SM, so this is how we know. */
  participantId?: string | null;
  /** Publish the card we moved to. Server drops it unless we present. */
  onSetFocus?: (cardId: string) => void;
  /** Take (or take over) the wheel, opening the room on our current card. */
  onClaimPresenter?: (cardId?: string) => void;
  /** Stop presenting. */
  onReleasePresenter?: () => void;
  /**
   * False while another main tab is showing. The panel stays mounted but
   * hidden, so without this gate cheers would animate into a display:none
   * subtree — invisible work, and a queue of them the moment you switch back.
   */
  isActive?: boolean;
}

export function DiscussionPanel({
  cards,
  sections,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  isScrumMaster = false,
  onCreateActionItem,
  cheers,
  combos,
  onSendCheer,
  facilitatorFocus = null,
  presenterId = null,
  participantId = null,
  onSetFocus,
  onClaimPresenter,
  onReleasePresenter,
  isActive = true,
}: DiscussionPanelProps) {
  // section_key -> board position, and section_key -> accent tone.
  const sectionOrder = useMemo(() => {
    const m = new Map<string, number>();
    sections.forEach((s, i) => m.set(s.sectionKey, i));
    return m;
  }, [sections]);
  const toneByKey = useMemo(() => {
    const m = new Map<string, BoardSectionView['tone']>();
    for (const s of sections) m.set(s.sectionKey, s.tone);
    return m;
  }, [sections]);
  // Group cards by tag id; a card with N tags shows up in N groups.
  const { groups, groupOrder, tagsById } = useMemo(() => {
    const byTag: Record<string, CardDTOv2[]> = {};
    const byId = new Map<string, Tag>();
    for (const card of cards) {
      if (card.tags.length === 0) {
        (byTag[UNTAGGED] ??= []).push(card);
      } else {
        for (const tag of card.tags) {
          byId.set(tag.id, tag);
          (byTag[tag.id] ??= []).push(card);
        }
      }
    }
    // Walk each tag group in board order — go-well first, then didn't-go-well,
    // thanks, deep-dive — so the focus walkthrough mirrors the board columns
    // instead of raw insertion order. createdAt breaks ties within a section.
    const sectionRank = (c: CardDTOv2) => sectionOrder.get(c.section) ?? sections.length;
    for (const key of Object.keys(byTag)) {
      byTag[key].sort((a, b) => {
        const d = sectionRank(a) - sectionRank(b);
        if (d !== 0) return d;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
    const order = Object.keys(byTag).sort((a, b) => byTag[b].length - byTag[a].length);
    return { groups: byTag, groupOrder: order, tagsById: byId };
  }, [cards, sectionOrder, sections.length]);

  // Cheers aimed at a card the viewer isn't looking at still get a chip, so
  // the room's energy is legible — it needs that card's opening words.
  const contentById = useMemo(() => {
    const m = new Map<string, string>();
    for (const card of cards) m.set(card.id, card.content);
    return m;
  }, [cards]);

  const [tagIdx, setTagIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  // Width of the right comment column (px). Drag the divider or use arrow
  // keys when it's focused. Persisted to localStorage on release.
  const [commentsWidth, setCommentsWidth] = useState(COMMENTS_DEFAULT);
  const liveWidthRef = useRef(COMMENTS_DEFAULT);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(COMMENTS_WIDTH_KEY));
    if (Number.isFinite(saved) && saved >= COMMENTS_MIN && saved <= COMMENTS_MAX) {
      liveWidthRef.current = saved;
      setCommentsWidth(saved);
    }
  }, []);

  const persistWidth = (w: number) => {
    try {
      window.localStorage.setItem(COMMENTS_WIDTH_KEY, String(w));
    } catch {
      /* localStorage may be unavailable (private mode / iframe) */
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = liveWidthRef.current;
    const onMove = (ev: MouseEvent) => {
      // Drag left → wider comment column.
      const next = clampCommentsWidth(startWidth + (startX - ev.clientX));
      liveWidthRef.current = next;
      setCommentsWidth(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      persistWidth(liveWidthRef.current);
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = clampCommentsWidth(liveWidthRef.current + step);
    else if (e.key === 'ArrowRight') next = clampCommentsWidth(liveWidthRef.current - step);
    if (next != null) {
      e.preventDefault();
      liveWidthRef.current = next;
      setCommentsWidth(next);
      persistWidth(next);
    }
  };

  // Derived position in the walkthrough. Computed before the empty-state
  // return so the follow-the-facilitator effects below stay unconditional
  // hooks; with no cards every index lands on undefined, which is harmless.
  const safeTagIdx = Math.min(tagIdx, groupOrder.length - 1);
  const currentKey = groupOrder[safeTagIdx];
  const currentList = groups[currentKey] ?? [];
  const safeCardIdx = Math.min(cardIdx, currentList.length - 1);
  const focused = currentList[safeCardIdx];
  const currentTag = currentKey === UNTAGGED ? null : tagsById.get(currentKey) ?? null;

  // ───── Follow the facilitator (presenter-claim) ─────
  // Everyone used to hold their own private "focused card", so a cheer sent
  // by one person landed on a different card for everybody else. Gating on
  // the Scrum Master is not an option — this app makes *every* participant an
  // SM — so presenting is claimed: one person takes the wheel and publishes
  // their card, everyone else follows unless they opt out.
  const isPresenter = presenterId != null && presenterId === participantId;
  const someoneElsePresents = presenterId != null && !isPresenter;

  // Following is derived, not stored, so a handover automatically resumes
  // following: pausing records *whose* broadcast we stepped away from, and a
  // new presenter is by definition not that person.
  const [pausedPresenter, setPausedPresenter] = useState<string | null>(null);
  const following = someoneElsePresents && pausedPresenter !== presenterId;
  const focusedId = focused?.id ?? null;

  // Presenter side: publish our position, debounced so holding Next → Next →
  // Next sends one focus at the end instead of one per keypress.
  useEffect(() => {
    if (!isPresenter || !onSetFocus || !focusedId) return;
    const t = setTimeout(() => onSetFocus(focusedId), 300);
    return () => clearTimeout(t);
  }, [isPresenter, onSetFocus, focusedId]);

  // Follower side: jump to the broadcast card. It may sit in a different tag
  // group, so both indices are derived from the same grouping the queue uses.
  // A card we can't find (deleted, or moved out from under us) is ignored in
  // silence — better to stay put than to jump somewhere arbitrary.
  useEffect(() => {
    if (!following || !facilitatorFocus) return;
    for (let i = 0; i < groupOrder.length; i++) {
      const idx = (groups[groupOrder[i]] ?? []).findIndex((c) => c.id === facilitatorFocus);
      if (idx >= 0) {
        setTagIdx(i);
        setCardIdx(idx);
        return;
      }
    }
  }, [following, facilitatorFocus, groups, groupOrder]);

  // Any manual move while following is a request to steer yourself: pause
  // following and offer a one-click way back.
  const takeTheWheel = () => {
    if (following && presenterId) setPausedPresenter(presenterId);
  };
  const setFollowing = (on: boolean) => setPausedPresenter(on ? null : presenterId);

  if (cards.length === 0) {
    return (
      <GlassPanel style={{ padding: 48, textAlign: 'center' }}>
        <div className="text-display fg-1" style={{ fontSize: 18, marginBottom: 6 }}>
          Nothing to discuss yet
        </div>
        <div className="fg-2" style={{ fontSize: 13 }}>
          Add cards on the Board tab, then walk through them here tag-by-tag.
        </div>
      </GlassPanel>
    );
  }

  // Presenting is wired up only when the room handed us the callbacks.
  const canPresent = !!onClaimPresenter && !!onReleasePresenter;

  const next = () => {
    takeTheWheel();
    if (safeCardIdx < currentList.length - 1) {
      setCardIdx(safeCardIdx + 1);
    } else if (safeTagIdx < groupOrder.length - 1) {
      setTagIdx(safeTagIdx + 1);
      setCardIdx(0);
    }
  };
  const prev = () => {
    takeTheWheel();
    if (safeCardIdx > 0) {
      setCardIdx(safeCardIdx - 1);
    } else if (safeTagIdx > 0) {
      const prevKey = groupOrder[safeTagIdx - 1];
      setTagIdx(safeTagIdx - 1);
      setCardIdx((groups[prevKey]?.length ?? 1) - 1);
    }
  };
  const isFirst = safeTagIdx === 0 && safeCardIdx === 0;
  const isLast =
    safeTagIdx === groupOrder.length - 1 && safeCardIdx === currentList.length - 1;

  const actionCount = Object.values(decisions).filter((d) => d === 'action').length;

  // Split the live bursts: on the focused card they play full-size over the
  // card; anything else floats compactly in the corner with a snippet so it
  // never reads as a cheer for what's on screen.
  const liveCheers = isActive ? cheers ?? [] : [];
  const liveCombos = isActive ? combos ?? [] : [];
  const focusedCheers = focused ? liveCheers.filter((c) => c.cardId === focused.id) : [];
  const otherCheers = liveCheers.filter((c) => !focused || c.cardId !== focused.id);
  // The shake archetype rattles the card itself, so it can only fire when the
  // cheer targets the card on screen. Keying the wrapper on the burst id
  // remounts it, which is what restarts the animation for a second 😡.
  const shakeCheerId =
    focusedCheers.filter((c) => CHEER_ARCHETYPE[c.effect] === 'shake').slice(-1)[0]?.id ?? null;
  const snippetFor = (cardId: string) => {
    const content = contentById.get(cardId);
    if (!content) return 'a card';
    return content.length > 24 ? `${content.slice(0, 24)}…` : content;
  };

  // "Action item" creates a real, persisted action item — but only once per
  // card. Re-clicking an already-actioned card is a no-op so the facilitator
  // can't spam duplicates into the Action items tab.
  const markAction = () => {
    if (!focused || decisions[focused.id] === 'action') return;
    onCreateActionItem(focused.content);
    setDecisions((s) => ({ ...s, [focused.id]: 'action' }));
  };
  const togglePark = () => {
    if (!focused) return;
    setDecisions((s) => {
      const next = { ...s };
      if (next[focused.id] === 'park') delete next[focused.id];
      else next[focused.id] = 'park';
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
      {/* Combo — the room cheered together, so the celebration leaves the card
          and takes the whole panel: a backdrop pulse and triple particles.
          No banner: the particle storm is the message. Several can coexist. */}
      {liveCombos.length > 0 && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', overflow: 'hidden' }}
        >
          {liveCombos.map((c) => (
            <div key={c.id} style={{ position: 'absolute', inset: 0 }}>
              <div className="combo-flash" />
              <CheerBurst effect={c.effect} size="mega" />
            </div>
          ))}
        </div>
      )}

      {/* Presenter controls. Everyone in this room is a Scrum Master, so the
          wheel is claimed rather than assigned: nobody presenting → anyone may
          start; you present → stop; someone else presents → follow or take
          over. */}
      {canPresent && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          {someoneElsePresents && (
            <>
              <Switch
                checked={following}
                onChange={setFollowing}
                label="跟隨主持人"
                aria-label="跟隨主持人"
              />
              {!following && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setFollowing(true)}
                  title="回到主持人正在討論的卡片並繼續跟隨"
                  style={{ padding: '4px 12px', fontSize: 11 }}
                >
                  ↩ 回到主持人
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => onClaimPresenter!(focused?.id)}
                title="由你接手主持，其他人會跟到你目前這張卡片"
                style={{ padding: '4px 12px', fontSize: 11 }}
              >
                ✋ 接手主持
              </button>
            </>
          )}
          {!someoneElsePresents && (
            <button
              type="button"
              className="btn"
              onClick={() => (isPresenter ? onReleasePresenter!() : onClaimPresenter!(focused?.id))}
              title={
                isPresenter
                  ? '停止主持，其他人不再跟隨你的卡片'
                  : '由你主持討論，其他人會跟隨你目前這張卡片'
              }
              style={{
                padding: '4px 12px',
                fontSize: 11,
                background: isPresenter ? 'var(--aurora-violet)' : undefined,
                borderColor: isPresenter ? 'var(--aurora-violet)' : undefined,
                color: isPresenter ? 'oklch(0.15 0.04 270)' : undefined,
                fontWeight: isPresenter ? 600 : undefined,
              }}
            >
              {isPresenter ? '⏹ 停止主持' : '🎙 主持討論'}
            </button>
          )}
        </div>
      )}

      {/* Cheers for cards other people are looking at — corner float only */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          paddingTop: 26,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {otherCheers.map((c) => (
          <CheerBurst key={c.id} effect={c.effect} size="compact" snippet={snippetFor(c.cardId)} />
        ))}
      </div>

      {/* Tag-group rail */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        }}
      >
        <span className="text-mono fg-3" style={{ fontSize: 11, marginRight: 6, whiteSpace: 'nowrap' }}>
          tag groups →
        </span>
        {groupOrder.map((key, i) => {
          const active = i === safeTagIdx;
          const tag = key === UNTAGGED ? null : tagsById.get(key) ?? null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                takeTheWheel();
                setTagIdx(i);
                setCardIdx(0);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'var(--glass-bg-strong)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--aurora-violet)' : 'var(--glass-border)'),
                color: active ? 'var(--fg-0)' : 'var(--fg-2)',
                boxShadow: active ? '0 0 0 4px oklch(0.68 0.20 285 / 0.15)' : 'none',
                transition: 'all .2s',
              }}
            >
              {tag ? <TagBadge tag={tag} /> : <span className="fg-3">untagged</span>}
              <span>{groups[key].length}</span>
            </button>
          );
        })}
      </div>

      {/* Queue · focused card · comment viewer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `260px minmax(0, 1fr) 12px ${commentsWidth}px`,
          gap: 12,
          height: 'calc(100vh - 280px)',
          minHeight: 440,
        }}
      >
        {/* Left — card preview queue */}
        <GlassPanel style={{ padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}
          >
            Queue · {currentTag ? currentTag.name : 'untagged'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentList.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  takeTheWheel();
                  setCardIdx(i);
                }}
                className={cardHeatClass(card)}
                style={{
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: i === safeCardIdx ? 'var(--glass-bg-strong)' : 'transparent',
                  border: '1px solid ' + (i === safeCardIdx ? 'var(--glass-border)' : 'transparent'),
                  fontSize: 12,
                  lineHeight: 1.4,
                  opacity: i < safeCardIdx ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <span className="text-mono fg-3" style={{ fontSize: 11 }}>
                    #{i + 1}
                  </span>
                  {decisions[card.id] && (
                    <span
                      className="text-mono"
                      style={{
                        padding: '1px 6px',
                        borderRadius: 999,
                        fontSize: 10,
                        background: DECISION_BADGE[decisions[card.id]],
                        color: 'oklch(0.15 0.04 270)',
                      }}
                    >
                      {decisions[card.id]}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: i === safeCardIdx ? 'var(--fg-0)' : 'var(--fg-2)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {card.content}
                </div>
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Center — focused card */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Burst layer for cheers aimed at the card on screen. Sits above
              the card, catches no clicks, and clips its own particles. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {focusedCheers.map((c) => (
              <CheerBurst key={c.id} effect={c.effect} size="full" />
            ))}
          </div>

          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, marginBottom: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {safeTagIdx + 1}/{groupOrder.length} groups · card {safeCardIdx + 1}/{currentList.length}
            {currentTag ? ` · ${currentTag.name}` : ' · untagged'}
          </div>

          {focused && (
            <div key={focused.id} className="drop-in" style={{ width: 'min(440px, 100%)' }}>
              <div key={shakeCheerId ?? 'calm'} className={shakeCheerId ? 'cheer-shake' : undefined}>
                <div
                  className={['sticky-card', cardHeatClass(focused)].filter(Boolean).join(' ')}
                  data-tone={toneByKey.get(focused.section) ?? 'violet'}
                  style={{
                    padding: '24px 26px',
                    fontSize: 18,
                    lineHeight: 1.55,
                    boxShadow: '0 24px 60px oklch(0 0 0 / 0.4)',
                  }}
                >
                  <div style={{ marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {focused.content}
                  </div>
                  {focused.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                      {focused.tags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                    </div>
                  )}
                  {focused.drawings.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {focused.drawings.map((drawing) => (
                        <DrawingThumbnail key={drawing.id} drawing={drawing} />
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <Avatar
                      name={focused.authorNickname ?? null}
                      anon={!focused.authorNickname}
                      size={22}
                    />
                    <span className="text-mono fg-2">
                      {focused.authorNickname ?? 'anon'}
                    </span>
                    <div style={{ flex: 1 }} />
                    {focused.reactions
                      .filter((r) => r.count > 0)
                      .map((r) => (
                        <span key={r.emoji} className="text-mono" style={{ fontSize: 11 }}>
                          {r.emoji} {r.count}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cheer bar — fire-and-forget, nothing is stored, everyone sees it */}
          {onSendCheer && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                gap: 3,
                alignItems: 'center',
                padding: '5px 8px',
                borderRadius: 999,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              }}
            >
              {CHEER_ORDER.map((effect) => (
                <button
                  key={effect}
                  type="button"
                  aria-label={`Send ${effect} cheer`}
                  title={effect}
                  disabled={!focused}
                  onClick={() => focused && onSendCheer(focused.id, effect)}
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    fontSize: 15,
                    lineHeight: 1,
                    cursor: focused ? 'pointer' : 'default',
                    background: 'transparent',
                    border: '1px solid transparent',
                    opacity: focused ? 1 : 0.4,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!focused) return;
                    e.currentTarget.style.background = 'var(--glass-bg-strong)';
                    e.currentTarget.style.borderColor = 'var(--aurora-violet)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {CHEER_EMOJI[effect]}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 22, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={markAction}
              disabled={!focused}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                cursor: focused ? 'pointer' : 'default',
                fontSize: 12,
                fontFamily: 'inherit',
                background: focused && decisions[focused.id] === 'action' ? 'var(--aurora-mint)' : 'var(--glass-bg)',
                color:
                  focused && decisions[focused.id] === 'action' ? 'oklch(0.15 0.04 270)' : 'var(--fg-0)',
                border:
                  '1px solid ' +
                  (focused && decisions[focused.id] === 'action' ? 'var(--aurora-mint)' : 'var(--glass-border)'),
                fontWeight: focused && decisions[focused.id] === 'action' ? 600 : 400,
              }}
            >
              {focused && decisions[focused.id] === 'action' ? '✓ Action item added' : '➜ Action item'}
            </button>
            <button
              type="button"
              onClick={togglePark}
              disabled={!focused}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                cursor: focused ? 'pointer' : 'default',
                fontSize: 12,
                fontFamily: 'inherit',
                background: focused && decisions[focused.id] === 'park' ? 'var(--aurora-amber)' : 'var(--glass-bg)',
                color:
                  focused && decisions[focused.id] === 'park' ? 'oklch(0.15 0.04 270)' : 'var(--aurora-amber)',
                border:
                  '1px solid ' +
                  (focused && decisions[focused.id] === 'park'
                    ? 'var(--aurora-amber)'
                    : 'color-mix(in oklab, var(--aurora-amber) 50%, transparent)'),
                fontWeight: focused && decisions[focused.id] === 'park' ? 600 : 400,
              }}
            >
              ⏸ Park it
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={prev} disabled={isFirst}>
              ← Prev
            </button>
            <button type="button" className="btn btn-primary" onClick={next} disabled={isLast}>
              Next →
            </button>
          </div>
        </div>

        {/* Drag handle — resize the comment column (←/→ when focused) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize comment panel"
          aria-valuemin={COMMENTS_MIN}
          aria-valuemax={COMMENTS_MAX}
          aria-valuenow={Math.round(commentsWidth)}
          tabIndex={0}
          onMouseDown={startResize}
          onKeyDown={onResizeKey}
          title="拖曳調整留言區寬度（←/→ 微調）"
          style={{
            cursor: 'col-resize',
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--glass-highlight)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span aria-hidden="true" style={{ width: 4, height: 56, borderRadius: 999, background: 'var(--glass-border)' }} />
        </div>

        {/* Right — comment viewer for the focused card */}
        <GlassPanel style={{ padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}
          >
            Comments
          </div>
          {focused ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <CommentList
                key={focused.id}
                cardId={focused.id}
                comments={focused.comments}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onUpdateComment={onUpdateComment}
                isScrumMaster={isScrumMaster}
              />
            </div>
          ) : (
            <div className="text-mono fg-3" style={{ fontSize: 11, opacity: 0.7 }}>
              — no card selected —
            </div>
          )}
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}
          >
            {actionCount} action item{actionCount === 1 ? '' : 's'} captured
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
