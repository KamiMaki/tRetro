'use client';

import { useState, useRef } from 'react';
import type { Tag, SectionType, CreateCardPayload, CreateTagPayload } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a card... (Ctrl+Enter to submit)"
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition"
      />

      {/* Selected tags preview */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className="group relative"
              title="Remove tag"
            >
              <TagBadge tag={t} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 text-white text-xs">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* Tag button */}
        <button
          type="button"
          onClick={() => setShowTagPanel((v) => !v)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Tags
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={!content.trim()}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white font-medium transition"
        >
          Add
        </button>
      </div>

      {/* Tag panel */}
      {showTagPanel && (
        <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`transition ${selectedTagIds.includes(tag.id) ? 'ring-2 ring-offset-1 ring-indigo-500 rounded-full' : ''}`}
                >
                  <TagBadge tag={tag} />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
              placeholder="New tag name..."
              className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="text-xs px-2 py-1 rounded bg-indigo-600 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white transition"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
