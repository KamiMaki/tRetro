'use client';

import { useState } from 'react';
import type { Comment } from '@/lib/types';
import { Avatar } from '@/components/ui/Aurora';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {comments.length > 0 && (
        <div
          className="text-mono fg-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </div>
      )}

      {comments.length > 0 && (
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingRight: 4,
          }}
        >
          {comments.map((comment, i) => (
            <div key={comment.id} style={{ display: 'flex', gap: 8 }}>
              <Avatar name={comment.authorNickname} size={20} colorIndex={i + 1} />
              <div
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--glass-highlight)',
                  border: '1px solid var(--glass-border)',
                  minWidth: 0,
                }}
              >
                <div
                  className="text-mono"
                  style={{ fontSize: 10, marginBottom: 2, color: 'var(--fg-2)' }}
                >
                  <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{comment.authorNickname}</span>{' '}
                  <span style={{ color: 'var(--fg-3)' }}>
                    · {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: 'var(--fg-0)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {comment.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Reply…"
          rows={2}
          className="field"
          style={{ fontSize: 12, padding: '6px 10px', minHeight: 0, resize: 'none' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || submitting}
          className="btn btn-primary"
          style={{ fontSize: 11, padding: '6px 12px' }}
        >
          Post
        </button>
      </form>
    </div>
  );
}
