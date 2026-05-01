'use client';

import { GlassPanel } from '@/components/ui/Aurora';

interface SortControlsProps {
  sortBy: 'time' | 'tagCount';
  setSortBy: (sort: 'time' | 'tagCount') => void;
  sortAsc: boolean;
  setSortAsc: (asc: boolean) => void;
}

export function SortControls({ sortBy, setSortBy, sortAsc, setSortAsc }: SortControlsProps) {
  return (
    <GlassPanel
      style={{
        padding: '8px 12px',
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        className="text-mono fg-3"
        style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
      >
        Sort
      </span>

      <div style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 8, background: 'var(--glass-highlight)' }}>
        {([
          ['time', 'Time'],
          ['tagCount', 'Tag count'],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSortBy(k)}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              borderRadius: 6,
              background: sortBy === k ? 'var(--glass-bg-strong)' : 'transparent',
              color: sortBy === k ? 'var(--fg-0)' : 'var(--fg-2)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSortAsc(!sortAsc)}
        title={sortAsc ? 'Ascending — click to descend' : 'Descending — click to ascend'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          padding: '4px 10px',
          borderRadius: 999,
          background: 'var(--glass-highlight)',
          color: 'var(--fg-1)',
          border: '1px solid var(--glass-border)',
          cursor: 'pointer',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {sortAsc ? <path d="M4 12V4M4 4l-2 2M4 4l2 2M9 5h6M9 9h4M9 13h2" /> : <path d="M4 4v8M4 12l-2-2M4 12l2-2M9 5h2M9 9h4M9 13h6" />}
        </svg>
        {sortAsc ? 'asc' : 'desc'}
      </button>
    </GlassPanel>
  );
}
