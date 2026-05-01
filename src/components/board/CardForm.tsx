'use client';

import { useState, useRef } from 'react';
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

export function CardForm({ section, tags, onSubmit, onCreateTag }: CardFormProps) {
  const [content, setContent] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ section, content: content.trim(), tagIds: selectedTagIds });
    setContent('');
    setSelectedTagIds([]);
    setShowTagPanel(false);
    textareaRef.current?.focus();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    onCreateTag({ name: trimmed, color });
    setNewTagName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const showExpanded = focused || content.length > 0 || showTagPanel;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Drop a thought… (⌘↵ to send)"
        rows={showExpanded ? 3 : 2}
        className="field"
        style={{
          fontSize: 13,
          padding: 10,
          resize: 'none',
          transition: 'min-height 0.2s',
        }}
      />

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {selectedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              title="Remove tag"
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <TagBadge tag={t} />
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => setShowTagPanel((v) => !v)}
          aria-pressed={showTagPanel}
          title="Add tags"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            borderRadius: 999,
            background: showTagPanel ? 'var(--glass-bg-strong)' : 'var(--glass-highlight)',
            color: showTagPanel ? 'var(--fg-0)' : 'var(--fg-2)',
            border: '1px solid var(--glass-border)',
            cursor: 'pointer',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v6l7 7 6-6-7-7z" />
            <circle cx="6" cy="6" r="1" fill="currentColor" />
          </svg>
          tags
          {selectedTags.length > 0 && (
            <span style={{ opacity: 0.7 }}>·{selectedTags.length}</span>
          )}
        </button>

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

      {showTagPanel && (
        <div
          className="glass"
          style={{
            padding: 10,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: active ? 1 : 0.5,
                      outline: active ? '2px solid var(--aurora-violet)' : 'none',
                      outlineOffset: 2,
                      borderRadius: 999,
                    }}
                  >
                    <TagBadge tag={tag} />
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              placeholder="new tag…"
              className="field"
              style={{ fontSize: 11, padding: '6px 10px' }}
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="btn"
              style={{ fontSize: 11, padding: '6px 10px' }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
