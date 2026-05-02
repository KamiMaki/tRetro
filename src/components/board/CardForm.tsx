'use client';

import { useEffect, useRef, useState } from 'react';
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
  isScrumMaster: boolean;
  onSubmit: (payload: Omit<CreateCardPayload, 'roomId'>) => void;
  onCreateTag: (payload: Omit<CreateTagPayload, 'roomId'> & { isDefault?: boolean }) => void;
  onSetTagDefault: (tagId: string, isDefault: boolean) => void;
}

export function CardForm({
  section,
  tags,
  isScrumMaster,
  onSubmit,
  onCreateTag,
  onSetTagDefault,
}: CardFormProps) {
  const [content, setContent] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [touchedSelection, setTouchedSelection] = useState(false);
  const [newTagDraft, setNewTagDraft] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-apply room default tags whenever the tag list changes, until the
  // user manually toggles something. After they touch a chip we stop
  // auto-syncing so we don't fight their selection.
  useEffect(() => {
    if (touchedSelection) return;
    const defaults = tags.filter((t) => t.isDefault).map((t) => t.id);
    setSelectedTagIds((prev) => {
      const same = prev.length === defaults.length && prev.every((id, i) => id === defaults[i]);
      return same ? prev : defaults;
    });
  }, [tags, touchedSelection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ section, content: content.trim(), tagIds: selectedTagIds });
    setContent('');
    setTouchedSelection(false);
    setCreatingTag(false);
    setNewTagDraft('');
    // re-applying the room defaults happens in the effect now that touched=false
    textareaRef.current?.focus();
  };

  const toggleTag = (tagId: string) => {
    setTouchedSelection(true);
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
            <span
              key={tag.id}
              style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
            >
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                title={
                  active
                    ? `Remove ${tag.name}${tag.isDefault ? ' (room default)' : ''}`
                    : `Add ${tag.name}${tag.isDefault ? ' (room default)' : ''}`
                }
                aria-pressed={active}
                style={{
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: active ? 1 : 0.55,
                  outline: active ? '1.5px solid var(--aurora-violet)' : 'none',
                  outlineOffset: 1,
                  borderRadius: 999,
                  transition: 'opacity .15s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.opacity = '0.55';
                }}
              >
                <TagBadge tag={tag} />
              </button>
              {isScrumMaster && (
                <button
                  type="button"
                  onClick={() => onSetTagDefault(tag.id, !tag.isDefault)}
                  title={
                    tag.isDefault
                      ? 'Unset as room default tag'
                      : 'Mark as room default tag (auto-applied to new cards)'
                  }
                  aria-label={tag.isDefault ? `Unset ${tag.name} as default` : `Set ${tag.name} as default`}
                  aria-pressed={tag.isDefault}
                  style={{
                    width: 14,
                    height: 14,
                    marginLeft: -2,
                    background: 'transparent',
                    border: 'none',
                    color: tag.isDefault ? 'var(--aurora-amber)' : 'var(--fg-3)',
                    cursor: 'pointer',
                    fontSize: 11,
                    lineHeight: 1,
                    padding: 0,
                    opacity: tag.isDefault ? 1 : 0.55,
                    transition: 'color .12s, opacity .12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = tag.isDefault ? '1' : '0.55')}
                >
                  {tag.isDefault ? '★' : '☆'}
                </button>
              )}
            </span>
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
        placeholder="Drop a thought… (⌘↵ to send)"
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
          <span className="text-mono fg-3" style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
            ⌘↵
          </span>
        </button>
      </div>
    </form>
  );
}
