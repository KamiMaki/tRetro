'use client';

import type { Tag } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { GlassPanel } from '@/components/ui/Aurora';

interface TagFilterProps {
  tags: Tag[];
  activeTagFilters: string[];
  setActiveTagFilters: (filters: string[]) => void;
}

export function TagFilter({ tags, activeTagFilters, setActiveTagFilters }: TagFilterProps) {
  if (tags.length === 0) return null;

  const toggleTag = (tagId: string) => {
    if (activeTagFilters.includes(tagId)) {
      setActiveTagFilters(activeTagFilters.filter((id) => id !== tagId));
    } else {
      setActiveTagFilters([...activeTagFilters, tagId]);
    }
  };

  return (
    <GlassPanel
      style={{
        padding: '8px 12px',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <span
        className="text-mono fg-3"
        style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
      >
        Filter
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {tags.map((tag) => {
          const active = activeTagFilters.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              title={active ? `Remove filter: ${tag.name}` : `Filter by: ${tag.name}`}
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: activeTagFilters.length === 0 || active ? 1 : 0.45,
                transition: 'opacity .15s',
              }}
            >
              <TagBadge tag={tag} />
            </button>
          );
        })}
      </div>
      {activeTagFilters.length > 0 && (
        <button
          type="button"
          onClick={() => setActiveTagFilters([])}
          className="text-mono fg-3"
          style={{
            fontSize: 11,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          clear
        </button>
      )}
    </GlassPanel>
  );
}
