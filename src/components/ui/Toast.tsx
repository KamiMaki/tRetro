'use client';

import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
}

const TYPE_STYLES: Record<ToastType, { border: string; color: string }> = {
  success: {
    border: 'oklch(0.82 0.16 175 / 0.45)',
    color: 'oklch(0.55 0.18 175)',
  },
  error: {
    border: 'oklch(0.65 0.18 25 / 0.45)',
    color: 'oklch(0.55 0.20 25)',
  },
  info: {
    border: 'oklch(0.78 0.14 210 / 0.45)',
    color: 'oklch(0.55 0.16 210)',
  },
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l2 2 4-4" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path strokeLinecap="round" d="M8 5v3M8 11h.01" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path strokeLinecap="round" d="M8 7v4M8 5h.01" />
    </svg>
  ),
};

export function Toast({ message, type, onDismiss, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const styles = TYPE_STYLES[type];

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        maxWidth: 380,
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${styles.border}`,
        boxShadow: '0 8px 32px oklch(0 0 0 / 0.32)',
        color: 'var(--fg-0)',
        fontSize: 13,
        lineHeight: 1.45,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity .25s, transform .25s',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1, color: styles.color }}>{ICONS[type]}</span>
      <span style={{ flex: 1, color: 'var(--fg-0)' }}>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--fg-2)',
          cursor: 'pointer',
          padding: 0,
          opacity: 0.7,
          transition: 'opacity .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}
