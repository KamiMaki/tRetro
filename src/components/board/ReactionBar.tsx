'use client';

import { useState } from 'react';
import type { Reaction } from '@/lib/types';

const COMMON_EMOJIS = ['🔥', '👏', '🙌', '💯', '🚀', '🤔', '💡', '❤️', '😂', '🎉', '☕', '🛡️', '⏳', '💭', '✨'];

interface ReactionBarProps {
  cardId: string;
  reactions: Reaction[];
  onToggleReaction: (cardId: string, emoji: string) => void;
}

export function ReactionBar({ cardId, reactions, onToggleReaction }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleToggle(emoji: string) {
    onToggleReaction(cardId, emoji);
    setPickerOpen(false);
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggleReaction(cardId, reaction.emoji)}
          title={reaction.hasReacted ? `Remove ${reaction.emoji}` : `React with ${reaction.emoji}`}
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

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
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

        {pickerOpen && (
          <>
            <div
              onClick={() => setPickerOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 30 }}
              aria-hidden="true"
            />
            <div
              className="glass glass-strong"
              style={{
                position: 'absolute',
                bottom: 32,
                left: 0,
                zIndex: 40,
                padding: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 2,
                width: 'max-content',
                borderRadius: 12,
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
                    width: 28,
                    height: 28,
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    transition: 'background .12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--glass-highlight)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
