'use client';

import type { Tag } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';

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
    <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
        Filter by tag:
      </span>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const active = activeTagFilters.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`transition rounded-full ${active ? 'ring-2 ring-offset-1 ring-gray-600 dark:ring-gray-300' : 'opacity-60 hover:opacity-100'}`}
              title={active ? `Remove filter: ${tag.name}` : `Filter by: ${tag.name}`}
            >
              <TagBadge tag={tag} />
            </button>
          );
        })}
      </div>
      {activeTagFilters.length > 0 && (
        <button
          onClick={() => setActiveTagFilters([])}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition underline shrink-0"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
