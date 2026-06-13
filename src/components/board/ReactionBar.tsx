'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Reaction } from '@/lib/types';
import { DEFAULT_REACTION_EMOJIS } from '@/lib/constants/reactions';

const CELL = 32;
const PICKER_GAP = 4;
const PICKER_PADDING = 8;
const PICKER_COLS = 5;

interface ReactionBarProps {
  cardId: string;
  reactions: Reaction[];
  onToggleReaction: (cardId: string, emoji: string) => void;
  /** The team's reaction palette. Falls back to DEFAULT_REACTION_EMOJIS when
   *  absent/empty so the picker is never blank before the room state loads. */
  emojis?: string[];
}

export function ReactionBar({ cardId, reactions, onToggleReaction, emojis }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Resolve the palette + grid geometry from the actual list length so a
  // custom palette of any size lays out (and positions the popover) correctly.
  const paletteEmojis = emojis && emojis.length ? emojis : DEFAULT_REACTION_EMOJIS;
  const pickerRows = Math.max(1, Math.ceil(paletteEmojis.length / PICKER_COLS));
  const pickerCols = Math.min(PICKER_COLS, paletteEmojis.length) || PICKER_COLS;
  const pickerW = pickerCols * CELL + (pickerCols - 1) * PICKER_GAP + PICKER_PADDING * 2;
  const pickerH = pickerRows * CELL + (pickerRows - 1) * PICKER_GAP + PICKER_PADDING * 2;

  function openPicker() {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let top = r.top - pickerH - 6;
    let left = r.left;
    if (top < 8) top = r.bottom + 6;
    if (left + pickerW > window.innerWidth - 8) left = window.innerWidth - pickerW - 8;
    if (left < 8) left = 8;
    setPos({ top, left });
    setPickerOpen(true);
  }

  function handleToggle(emoji: string) {
    onToggleReaction(cardId, emoji);
    setPickerOpen(false);
  }

  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const picker = pickerOpen && pos && typeof document !== 'undefined'
    ? createPortal(
        <>
          <div
            onClick={() => setPickerOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 70 }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Pick a reaction"
            className="glass glass-strong"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 71,
              padding: PICKER_PADDING,
              display: 'grid',
              gridTemplateColumns: `repeat(${pickerCols}, ${CELL}px)`,
              gap: PICKER_GAP,
              borderRadius: 12,
              animation: 'fade-in 0.18s ease-out both',
            }}
          >
            {paletteEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggle(emoji)}
                title={emoji}
                aria-label={`React with ${emoji}`}
                style={{
                  width: CELL,
                  height: CELL,
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background .12s, transform .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--glass-highlight)';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggleReaction(cardId, reaction.emoji)}
          title={reaction.hasReacted ? `Remove ${reaction.emoji}` : `React with ${reaction.emoji}`}
          aria-label={reaction.hasReacted ? `Remove ${reaction.emoji} reaction (${reaction.count})` : `Add ${reaction.emoji} reaction (${reaction.count})`}
          aria-pressed={reaction.hasReacted}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 22,
            padding: '0 8px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            background: reaction.hasReacted ? 'var(--glass-bg-strong)' : 'var(--glass-highlight)',
            color: reaction.hasReacted ? 'var(--fg-0)' : 'var(--fg-1)',
            border: '1px solid ' + (reaction.hasReacted ? 'var(--aurora-violet)' : 'var(--glass-border)'),
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              lineHeight: 1,
              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
            }}
          >
            {reaction.emoji}
          </span>
          <span style={{ lineHeight: 1 }}>{reaction.count}</span>
        </button>
      ))}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
        title="Add reaction"
        aria-label="Add reaction"
        aria-expanded={pickerOpen}
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: 'var(--glass-highlight)',
          color: 'var(--fg-2)',
          border: '1px dashed var(--glass-border)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          lineHeight: 1,
          padding: 0,
        }}
      >
        +
      </button>

      {picker}
    </div>
  );
}
