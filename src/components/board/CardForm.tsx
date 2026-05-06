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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ section, content: content.trim(), tagIds: selectedTagIds });
    setContent('');
    setSelectedTagIds([]);
    setCreatingTag(false);
    setNewTagDraft('');
    textareaRef.current?.focus();
  };

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
        placeholder="Drop a thought…"
        rows={2}
        className="field"
        style={{
          fontSize: 13,
          padding: 10,
          resize: 'none',
          transition: 'min-height 0.2s',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="text-mono fg-3" style={{ fontSize: 10, opacity: 0.7 }}>
          {selectedTagIds.length > 0
            ? `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`
            : ''}
        </span>
        <button
          type="submit"
          disabled={!content.trim()}
          className="btn btn-primary"
          style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px' }}
        >
          Send
        </button>
      </div>
    </form>
  );
}
