'use client';

import { useRef, useState } from 'react';
import type { Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';

const TAG_COLORS = [
  '#84e1c8', // mint
  '#9b8cf2', // violet
  '#f4b6d8', // pink
  '#fcd987', // amber
  '#7cd1f2', // cyan
];

// Keep in sync with the server-side cap in src/lib/socket/handlers/limits.ts.
const MAX_IMAGE_CHARS = 3_000_000;

interface CardFormProps {
  section: SectionType;
  tags: Tag[];
  onSubmit: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'>) => void;
}

export function CardForm({
  section,
  tags,
  onSubmit,
  onCreateTag,
}: CardFormProps) {
  const [content, setContent] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagDraft, setNewTagDraft] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    onSubmit({ section, content: content.trim(), tagIds: selectedTagIds, imageData: image });
    setContent('');
    setSelectedTagIds([]);
    setCreatingTag(false);
    setNewTagDraft('');
    setImage(null);
    setImageErr(null);
    textareaRef.current?.focus();
  };

  function stageImageFile(file: File) {
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
          stageImageFile(file);
        }
        return;
      }
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) stageImageFile(file);
    e.target.value = '';
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = () => {
    const trimmed = newTagDraft.trim();
    if (!trimmed) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    onCreateTag({ name: trimmed, color });
    setNewTagDraft('');
    setCreatingTag(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Tag chips — always visible, even before typing */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          minHeight: 26,
        }}
      >
        {tags.map((tag) => {
          const active = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              title={active ? `Remove ${tag.name}` : `Add ${tag.name}`}
              aria-pressed={active}
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: active ? 1 : 0.45,
                borderRadius: 999,
                transition: 'opacity .15s',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.opacity = '0.45';
              }}
            >
              <TagBadge tag={tag} />
            </button>
          );
        })}

        {creatingTag ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--aurora-violet)',
              borderRadius: 999,
              padding: '1px 4px 1px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span aria-hidden="true">#</span>
            <input
              autoFocus
              type="text"
              value={newTagDraft}
              onChange={(e) => setNewTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setCreatingTag(false);
                  setNewTagDraft('');
                }
              }}
              onBlur={() => {
                if (!newTagDraft.trim()) setCreatingTag(false);
              }}
              placeholder="new tag"
              aria-label="New tag name"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--fg-0)',
                fontFamily: 'inherit',
                fontSize: 11,
                width: 80,
                padding: '2px 0',
              }}
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagDraft.trim()}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: 'inherit',
                background: 'var(--aurora-violet)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                opacity: newTagDraft.trim() ? 1 : 0.5,
              }}
            >
              add
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingTag(true)}
            title="Create new tag"
            aria-label="Create new tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--glass-highlight)',
              color: 'var(--fg-2)',
              border: '1px dashed var(--glass-border)',
              cursor: 'pointer',
            }}
          >
            + tag
          </button>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Drop a thought…（可貼上圖片）"
        rows={2}
        className="field"
        style={{
          fontSize: 13,
          padding: 10,
          resize: 'none',
          transition: 'min-height 0.2s',
        }}
      />

      {image && (
        <div style={{ position: 'relative', display: 'inline-block', alignSelf: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Card image preview"
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          aria-label="Attach image to card"
          title="Attach image（也可直接貼上）"
          className="btn"
          style={{ fontSize: 11, padding: '6px 9px' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <circle cx="5.5" cy="6.5" r="1.2" />
            <path d="M3 12l3.5-3.5 2.5 2.5L11 8l2 2" />
          </svg>
        </button>
        <span className="text-mono fg-3" style={{ fontSize: 10, opacity: 0.7 }}>
          {selectedTagIds.length > 0
            ? `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`
            : ''}
        </span>
        <button
          type="submit"
          disabled={!content.trim() && !image}
          className="btn btn-primary"
          style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px' }}
        >
          Send
        </button>
      </div>
    </form>
  );
}
