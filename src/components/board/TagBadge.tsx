'use client';

import type { Tag } from '@/lib/types';

interface TagBadgeProps {
  tag: Pick<Tag, 'name' | 'color'>;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
    </span>
  );
}
