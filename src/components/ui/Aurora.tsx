'use client';

import type { CSSProperties, ReactNode } from 'react';

/* ───── Animated aurora background blobs ───── */
export function AuroraBg() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="blob-3" />
    </div>
  );
}

/* ───── Liquid glass panel ───── */
interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}
export function GlassPanel({ children, className = '', strong = false, style, onClick }: GlassPanelProps) {
  return (
    <div
      onClick={onClick}
      className={`glass ${strong ? 'glass-strong' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ───── Logo wordmark — RetroXpert ───── */
const LOGO_GRADIENT =
  'linear-gradient(135deg, oklch(0.82 0.16 175), oklch(0.68 0.20 285) 55%, oklch(0.82 0.12 350))';

const LOGO_LETTER_STYLE: CSSProperties = {
  background: LOGO_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  fontWeight: 800,
};

export function Logo({ size = 22, wordmark = true }: { size?: number; wordmark?: boolean }) {
  if (!wordmark) return null;
  return (
    <span className="text-display" style={{ fontWeight: 700, fontSize: size * 0.85, letterSpacing: '-0.02em' }}>
      <span style={LOGO_LETTER_STYLE}>R</span>etro
      <span style={LOGO_LETTER_STYLE}>X</span>pert
    </span>
  );
}

/* ───── Avatar ───── */
function hashColor(name: string | null | undefined): number {
  if (!name) return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}
interface AvatarProps {
  name?: string | null;
  anon?: boolean;
  size?: number;
  colorIndex?: number;
}
export function Avatar({ name, anon = false, size = 28, colorIndex }: AvatarProps) {
  if (anon) {
    return (
      <span className="avatar" data-anon="1" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 14c.5-2.5 2.5-4 5-4s4.5 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  const initial = (name || '?').slice(0, 1).toUpperCase();
  const idx = colorIndex !== undefined ? colorIndex : hashColor(name);
  return (
    <span className="avatar" data-i={idx} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </span>
  );
}

