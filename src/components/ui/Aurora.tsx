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

/* ───── Logo wordmark ───── */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="tretro-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.16 175)" />
            <stop offset="50%" stopColor="oklch(0.68 0.20 285)" />
            <stop offset="100%" stopColor="oklch(0.82 0.12 350)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#tretro-logo-grad)" opacity="0.9" />
        <rect x="2" y="2" width="28" height="28" rx="9" fill="none" stroke="oklch(1 0 0 / 0.3)" strokeWidth="1" />
        <path d="M10 11h12M16 11v11" stroke="oklch(0.15 0.04 270)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-display" style={{ fontWeight: 700, fontSize: size * 0.85, letterSpacing: '-0.02em' }}>
        tRetro
      </span>
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

