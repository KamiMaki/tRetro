'use client';

import { useEffect, useRef, useState } from 'react';
import type { Reaction } from '@/lib/types';

const COMMON_EMOJIS = ['🔥', '👏', '🙌', '💯', '🚀', '🤔', '💡', '❤️', '😂', '🎉', '☕', '🛡️', '⏳', '💭', '✨'];

const PICKER_W = 5 * 30 + 4 * 2 + 16; // 5 cols × 30 + 4 gaps × 2 + padding
const PICKER_H = 3 * 30 + 2 * 2 + 16; // 3 rows × 30 + 2 gaps × 2 + padding

interface ReactionBarProps {
  cardId: string;
  reactions: Reaction[];
  onToggleReaction: (cardId: string, emoji: string) => void;
}

export function ReactionBar({ cardId, reactions, onToggleReaction }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openPicker() {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let top = r.top - PICKER_H - 6;
    let left = r.left;
    if (top < 8) top = r.bottom + 6;
    if (left + PICKER_W > window.innerWidth - 8) left = window.innerWidth - PICKER_W - 8;
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
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            background: reaction.hasReacted ? 'var(--glass-bg-strong)' : 'var(--glass-highlight)',
            color: reaction.hasReacted ? 'var(--fg-0)' : 'var(--fg-1)',
            border: '1px solid ' + (reaction.hasReacted ? 'var(--aurora-violet)' : 'var(--glass-border)'),
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>{reaction.emoji}</span>
          <span>{reaction.count}</span>
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
          width: 24,
          height: 24,
          borderRadius: 999,
          background: 'var(--glass-highlight)',
          color: 'var(--fg-2)',
          border: '1px dashed var(--glass-border)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
        }}
      >
        +
      </button>

      {pickerOpen && pos && (
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
              padding: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 30px)',
              gap: 2,
              borderRadius: 12,
              animation: 'fade-in 0.18s ease-out both',
            }}
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggle(emoji)}
                title={emoji}
                aria-label={`React with ${emoji}`}
                style={{
                  width: 30,
                  height: 30,
                  fontSize: 17,
                  lineHeight: 1,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: 0,
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
        </>
      )}
    </div>
  );
}
