'use client';

import { useTheme } from '@/lib/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle, hydrated } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px 5px 6px',
        borderRadius: 999,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--fg-1)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        lineHeight: 1,
        transition: 'background .15s, color .15s, border-color .15s',
        opacity: hydrated ? 1 : 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--glass-bg-strong)';
        e.currentTarget.style.color = 'var(--fg-0)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--glass-bg)';
        e.currentTarget.style.color = 'var(--fg-1)';
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark
            ? 'linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))'
            : 'linear-gradient(135deg, var(--aurora-amber), var(--aurora-pink))',
          color: 'oklch(0.15 0.04 270)',
        }}
      >
        {isDark ? (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M11.5 9.5A4.5 4.5 0 016.5 4.5c0-.6.12-1.18.34-1.7A6 6 0 1013.2 9.16c-.52.22-1.1.34-1.7.34z" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="3" fill="currentColor" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
          </svg>
        )}
      </span>
      {isDark ? 'dark' : 'light'}
    </button>
  );
}
