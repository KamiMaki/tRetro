'use client';

import type { Tag } from '@/lib/types';

interface TagBadgeProps {
  tag: Pick<Tag, 'name' | 'color'>;
}

/* Convert any color to a soft glass chip */
function toRgba(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span
      className="chip"
      style={{
        background: toRgba(tag.color, 0.22),
        color: tag.color,
        border: `1px solid ${toRgba(tag.color, 0.35)}`,
        textShadow: '0 1px 0 oklch(0 0 0 / 0.2)',
      }}
    >
      {tag.name}
    </span>
  );
}
