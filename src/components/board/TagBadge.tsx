'use client';

import type { CSSProperties } from 'react';
import type { Tag } from '@/lib/types';

interface TagBadgeProps {
  tag: Pick<Tag, 'name' | 'color'>;
}

export function TagBadge({ tag }: TagBadgeProps) {
  // We expose the user-chosen tag colour as a CSS variable so globals.css
  // can derive theme-appropriate background / text / border via color-mix
  // (darker text + more saturated bg in light mode, without dropping
  // back to the original near-white inline style).
  const styleVars: CSSProperties = { ['--tag-base' as string]: tag.color };
  return (
    <span className="chip chip-tag" style={styleVars}>
      {tag.name}
    </span>
  );
}
