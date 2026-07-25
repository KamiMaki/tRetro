'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Password `<input>` with a show/hide "eye" toggle. Masked text keeps the
 * app's wide letter-spacing convention; revealed plain text drops it (wide
 * spacing on real characters reads oddly).
 */
export function PasswordField({ id, style, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <input
        {...rest}
        id={inputId}
        type={visible ? 'text' : 'password'}
        style={{
          display: 'block',
          width: '100%',
          paddingRight: 40,
          letterSpacing: visible ? 'normal' : '0.12em',
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        style={{
          position: 'absolute',
          top: '50%',
          right: 8,
          transform: 'translateY(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          color: 'var(--fg-3)',
          cursor: 'pointer',
        }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.2 4.3C2.4 5.4 1 8 1 8s2.5 5 7 5c1.2 0 2.3-.3 3.3-.8M6.1 6.1a2 2 0 0 0 2.8 2.8M9.9 5.4C13 6.1 15 8 15 8s-.6 1.2-1.8 2.4" />
      <path d="M2 2l12 12" />
    </svg>
  );
}
