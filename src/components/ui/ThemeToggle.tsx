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
      className="theme-toggle"
      data-theme-state={isDark ? 'dark' : 'light'}
      style={{ opacity: hydrated ? 1 : 0 }}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {/* Sun + moon morph: a single SVG keeps both shapes; CSS rotates
              and the moon-cutout circle slides off-screen for "sun", on-screen
              for "moon". Smoother than swapping two icons. */}
          <svg
            className="theme-toggle-svg"
            viewBox="0 0 32 32"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {/* Center disc — sun in light, moon body in dark */}
            <mask id="moon-mask">
              <rect width="32" height="32" fill="white" />
              <circle className="theme-toggle-mask" cx="22" cy="10" r="9" fill="black" />
            </mask>
            <circle
              className="theme-toggle-disc"
              cx="16"
              cy="16"
              r="6"
              fill="currentColor"
              mask="url(#moon-mask)"
            />
            {/* Sun rays — fade out in dark mode */}
            <g className="theme-toggle-rays" stroke="currentColor">
              <line x1="16" y1="3" x2="16" y2="6" />
              <line x1="16" y1="26" x2="16" y2="29" />
              <line x1="3" y1="16" x2="6" y2="16" />
              <line x1="26" y1="16" x2="29" y2="16" />
              <line x1="6.34" y1="6.34" x2="8.46" y2="8.46" />
              <line x1="23.54" y1="23.54" x2="25.66" y2="25.66" />
              <line x1="6.34" y1="25.66" x2="8.46" y2="23.54" />
              <line x1="23.54" y1="8.46" x2="25.66" y2="6.34" />
            </g>
          </svg>
        </span>
      </span>
      <span className="theme-toggle-label" aria-hidden="true">
        {isDark ? 'dark' : 'light'}
      </span>

      <style jsx>{`
        .theme-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border-radius: 999px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--fg-1);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 11px;
          line-height: 1;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.18s;
        }
        .theme-toggle:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .theme-toggle-track {
          position: relative;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, oklch(0.86 0.10 75), oklch(0.84 0.10 50));
          transition: background 0.45s cubic-bezier(0.34, 1.4, 0.5, 1);
        }
        :global([data-theme="light"]) .theme-toggle-track {
          background: linear-gradient(135deg, oklch(0.86 0.13 75), oklch(0.83 0.14 35));
        }
        :global([data-theme="dark"]) .theme-toggle-track {
          background: linear-gradient(135deg, oklch(0.30 0.05 270), oklch(0.20 0.06 285));
        }
        .theme-toggle-thumb {
          position: relative;
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: oklch(0.20 0.05 270);
          transition: color 0.45s cubic-bezier(0.34, 1.4, 0.5, 1),
            transform 0.5s cubic-bezier(0.34, 1.4, 0.5, 1);
        }
        :global([data-theme="dark"]) .theme-toggle-thumb {
          color: oklch(0.92 0.04 270);
          transform: rotate(360deg);
        }
        .theme-toggle-svg {
          overflow: visible;
        }
        .theme-toggle-disc {
          transition: r 0.4s cubic-bezier(0.34, 1.4, 0.5, 1);
        }
        :global([data-theme="dark"]) .theme-toggle-disc {
          r: 9;
        }
        .theme-toggle-mask {
          transition: cx 0.45s cubic-bezier(0.34, 1.4, 0.5, 1),
            r 0.45s cubic-bezier(0.34, 1.4, 0.5, 1);
        }
        :global([data-theme="dark"]) .theme-toggle-mask {
          cx: 24;
          r: 8;
        }
        .theme-toggle-rays {
          transform-origin: 16px 16px;
          transition: opacity 0.35s ease, transform 0.55s cubic-bezier(0.34, 1.4, 0.5, 1);
          opacity: 1;
        }
        :global([data-theme="dark"]) .theme-toggle-rays {
          opacity: 0;
          transform: scale(0.4) rotate(-90deg);
        }
        .theme-toggle-label {
          letter-spacing: 0.04em;
          text-transform: lowercase;
        }
      `}</style>
    </button>
  );
}
