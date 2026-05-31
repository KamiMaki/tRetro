'use client';

import { useRef, useState } from 'react';
import type { Comment } from '@/lib/types';
import { Avatar } from '@/components/ui/Aurora';
import { formatTaipeiTime } from '@/lib/utils/datetime';

// Keep in sync with the server-side cap in comment.handler.ts.
const MAX_IMAGE_CHARS = 3_000_000;

interface CommentListProps {
  cardId: string;
  comments: Comment[];
  onAddComment: (cardId: string, content: string, imageData?: string | null) => void;
  /** When provided, own comments (and any comment for an SM) show a delete
   *  control. Omit for read-only surfaces. */
  onDeleteComment?: (commentId: string, cardId: string) => void;
  /** SMs may delete any comment in the room, not just their own. */
  isScrumMaster?: boolean;
}

export function CommentList({
  cardId,
  comments,
  onAddComment,
  onDeleteComment,
  isScrumMaster = false,
}: CommentListProps) {
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function stageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setImageErr('只能附加圖片');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      if (result.length > MAX_IMAGE_CHARS) {
        setImageErr('圖片太大（上限約 2MB）');
        return;
      }
      setImageErr(null);
      setImage(result);
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    // Index loop — DataTransferItemList is array-like but not reliably
    // iterable with for..of across browsers.
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          e.preventDefault();
          stageFile(file);
        }
        return;
      }
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    e.target.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed && !image) return;
    onAddComment(cardId, trimmed, image);
    setDraft('');
    setImage(null);
    setImageErr(null);
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
            maxHeight: 240,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingRight: 4,
          }}
        >
          {comments.map((comment) => {
            const canDelete = !!onDeleteComment && (comment.isOwnComment || isScrumMaster);
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 8 }}>
                {comment.authorNickname
                  ? <Avatar name={comment.authorNickname} size={20} />
                  : <Avatar anon size={20} />}
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
                    style={{ fontSize: 10, marginBottom: 2, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>
                      {comment.authorNickname ?? 'Anonymous'}
                    </span>
                    <span style={{ color: 'var(--fg-3)' }}>
                      · {formatTaipeiTime(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {confirmingId === comment.id ? (
                          <>
                            <span className="fg-3" style={{ fontSize: 10 }}>刪除？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteComment!(comment.id, comment.cardId);
                                setConfirmingId(null);
                              }}
                              aria-label="Confirm delete comment"
                              style={{
                                padding: '1px 6px', fontSize: 10, borderRadius: 6, cursor: 'pointer',
                                background: 'oklch(0.65 0.18 25 / 0.18)', color: 'oklch(0.85 0.14 25)',
                                border: '1px solid oklch(0.65 0.18 25 / 0.35)', fontFamily: 'inherit',
                              }}
                            >
                              刪除
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              aria-label="Cancel delete comment"
                              style={{
                                padding: '1px 6px', fontSize: 10, borderRadius: 6, cursor: 'pointer',
                                background: 'transparent', color: 'var(--fg-3)',
                                border: '1px solid var(--glass-border)', fontFamily: 'inherit',
                              }}
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingId(comment.id)}
                            aria-label="Delete comment"
                            title="Delete comment"
                            style={{
                              marginLeft: 'auto', padding: 2, borderRadius: 6, background: 'transparent',
                              border: 'none', color: 'var(--fg-3)', cursor: 'pointer', display: 'inline-flex',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.78 0.16 25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-3)')}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                              <path d="M3 3l10 10M13 3L3 13" />
                            </svg>
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  {comment.content && (
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
                  )}
                  {comment.imageData && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.imageData}
                      alt="Comment attachment"
                      style={{
                        marginTop: comment.content ? 6 : 0,
                        maxWidth: '100%',
                        maxHeight: 240,
                        borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {image && (
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            alignSelf: 'flex-start',
            marginBottom: 2,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Attachment preview"
            style={{
              maxHeight: 120, maxWidth: '100%', borderRadius: 8,
              border: '1px solid var(--glass-border)', display: 'block',
            }}
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remove image"
            title="Remove image"
            style={{
              position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 999,
              background: 'oklch(0.15 0.02 270 / 0.75)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      )}

      {imageErr && (
        <div className="text-mono" style={{ fontSize: 10.5, color: 'oklch(0.82 0.14 25)' }}>
          {imageErr}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Reply…（可貼上圖片）"
          rows={2}
          className="field"
          style={{ fontSize: 12, padding: '6px 10px', minHeight: 0, resize: 'none' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          title="Attach image（也可直接貼上）"
          className="btn"
          style={{ fontSize: 11, padding: '6px 9px', flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <circle cx="5.5" cy="6.5" r="1.2" />
            <path d="M3 12l3.5-3.5 2.5 2.5L11 8l2 2" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={!draft.trim() && !image}
          className="btn btn-primary"
          style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0 }}
        >
          Post
        </button>
      </form>
    </div>
  );
}
