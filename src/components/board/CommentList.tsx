'use client';

import { useState } from 'react';
import type { Comment } from '@/lib/types';

interface CommentListProps {
  cardId: string;
  comments: Comment[];
  onAddComment: (cardId: string, content: string) => void;
}

export function CommentList({ cardId, comments, onAddComment }: CommentListProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSubmitting(true);
    onAddComment(cardId, trimmed);
    setDraft('');
    setSubmitting(false);
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                  {comment.authorNickname}
                </span>
                <span className="text-gray-400 dark:text-gray-500 shrink-0">
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || submitting}
          className="self-end px-2.5 py-1.5 rounded bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-xs font-medium transition"
          aria-label="Post comment"
        >
          Post
        </button>
      </form>
    </div>
  );
}
