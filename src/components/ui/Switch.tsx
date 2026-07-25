'use client';

import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: ReactNode;
  'aria-label'?: string;
}

/**
 * Accessible on/off switch (`role="switch"`) — track + sliding thumb,
 * violet when on. Space/Enter toggle via native button behaviour.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  id,
  label,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="ui-switch"
      data-on={checked}
    >
      <span className="ui-switch-track" aria-hidden="true">
        <span className="ui-switch-thumb" />
      </span>
      {label != null && <span className="ui-switch-label">{label}</span>}

      <style jsx>{`
        .ui-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          color: var(--fg-1);
        }
        .ui-switch:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .ui-switch-track {
          position: relative;
          width: 36px;
          height: 20px;
          border-radius: 999px;
          background: var(--glass-border);
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ui-switch[data-on='true'] .ui-switch-track {
          background: var(--aurora-violet);
        }
        .ui-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px oklch(0 0 0 / 0.25);
          transition: transform 0.18s cubic-bezier(0.34, 1.4, 0.5, 1);
        }
        .ui-switch[data-on='true'] .ui-switch-thumb {
          transform: translateX(16px);
        }
        .ui-switch:focus-visible {
          outline: none;
        }
        .ui-switch:focus-visible .ui-switch-track {
          outline: var(--focus-ring);
          outline-offset: var(--focus-ring-offset);
        }
        .ui-switch-label {
          font-size: 13px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ui-switch-track,
          .ui-switch-thumb {
            transition-duration: 0.01ms;
          }
        }
      `}</style>
    </button>
  );
}
