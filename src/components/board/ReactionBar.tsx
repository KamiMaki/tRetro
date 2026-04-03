'use client';

import { useState } from 'react';
import type { Reaction } from '@/lib/types';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏', '🔥', '💯', '🙏', '✨'];

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
    <div className="relative flex flex-wrap items-center gap-1">
      {/* Existing reaction pills */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggleReaction(cardId, reaction.emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
            reaction.hasReacted
              ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600'
          }`}
          title={reaction.hasReacted ? `Remove ${reaction.emoji}` : `React with ${reaction.emoji}`}
          aria-pressed={reaction.hasReacted}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((prev) => !prev)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-bold transition"
          title="Add reaction"
          aria-label="Add reaction"
          aria-expanded={pickerOpen}
        >
          +
        </button>

        {pickerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPickerOpen(false)}
            />
            {/* Picker */}
            <div className="absolute bottom-8 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-max">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggle(emoji)}
                  className="text-base hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition leading-none"
                  title={emoji}
                  aria-label={`React with ${emoji}`}
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
