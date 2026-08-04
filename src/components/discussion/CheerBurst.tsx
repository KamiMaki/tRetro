'use client';

import { useEffect, useRef, useState } from 'react';
import type { CheerEffect } from '@/lib/types';

// One cheer = one independent DOM group. Nothing here is shared between
// bursts, so two cheers arriving 50ms apart animate side by side instead of
// clobbering each other.

/** Display glyph per effect. Order here is the order of the cheer bar. */
export const CHEER_EMOJI: Record<CheerEffect, string> = {
  confetti: '🎉',
  clap: '👏',
  laugh: '😂',
  love: '❤️',
  fire: '🔥',
  mindblown: '🤯',
  angry: '😡',
  cry: '😢',
};

export const CHEER_ORDER: CheerEffect[] = [
  'confetti',
  'clap',
  'laugh',
  'love',
  'fire',
  'mindblown',
  'angry',
  'cry',
];

/**
 * Animation personality. Four archetypes, so a 😡 does not land like a 🎉:
 * - `burst` explodes outward from the card centre and falls off on the tail
 * - `rain`  pours down the full width of the card
 * - `rise`  floats up from the bottom edge
 * - `shake` rattles the card itself (see `.cheer-shake` in globals.css)
 */
export type CheerArchetype = 'burst' | 'rain' | 'rise' | 'shake';

export const CHEER_ARCHETYPE: Record<CheerEffect, CheerArchetype> = {
  clap: 'rise',
  mindblown: 'burst',
  laugh: 'burst',
  confetti: 'rain',
  cry: 'rain',
  love: 'rise',
  fire: 'rise',
  angry: 'shake',
};

/** Glyph pool per effect — picked per particle so one burst is never uniform. */
const CHEER_GLYPHS: Record<CheerEffect, string[]> = {
  confetti: ['🎉', '✨', '🎊'],
  clap: ['👏'],
  laugh: ['😂'],
  love: ['❤️', '💖', '💕'],
  fire: ['🔥', '✨'],
  mindblown: ['🤯'],
  angry: ['😡', '💢'],
  cry: ['💧', '😢'],
};

/** Paper confetti borrows the aurora palette so it reads as part of the app. */
const CONFETTI_COLORS = [
  'var(--aurora-mint)',
  'var(--aurora-violet)',
  'var(--aurora-pink)',
  'var(--aurora-amber)',
];

// Total wall-clock budget for one burst. The longest archetype is rain at
// 1.85s after at most 0.3s of stagger, so 2.2s covers every tail. useRoom's
// CHEER_TTL_MS sits above this so DOM cleanup never truncates an animation.
// The fallback also carries reduced-motion users, where particles are
// display:none and never fire animationend.
const BURST_FALLBACK_MS = 2200;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)];

interface Particle {
  /** Archetype modifier class — carries the keyframe. */
  cls: string;
  /** null renders a coloured rectangle instead of a glyph (paper confetti). */
  glyph: string | null;
  style: React.CSSProperties;
}

/** Explodes outward from a zero-size origin, with a gravity sag on the tail. */
function burstParticles(effect: CheerEffect, count: number, size: number, bouncy: boolean): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + rand(-0.35, 0.35);
    const distance = rand(70, 190);
    return {
      cls: bouncy ? 'cheer-particle--laugh' : 'cheer-particle--burst',
      glyph: pick(CHEER_GLYPHS[effect]),
      style: {
        position: 'absolute',
        fontSize: size * rand(0.85, 1.15),
        lineHeight: 1,
        '--cheer-dx': `${(Math.cos(angle) * distance).toFixed(1)}px`,
        '--cheer-dy': `${(Math.sin(angle) * distance - 40).toFixed(1)}px`,
        '--cheer-rot': `${rand(-540, 540).toFixed(0)}deg`,
        '--cheer-scale': rand(0.8, 2.2).toFixed(2),
        '--cheer-fall': `${rand(26, 70).toFixed(0)}px`,
        // Three decreasing peaks — the 😂 bounces instead of arcing.
        '--cheer-bounce-1': `${rand(-140, -95).toFixed(0)}px`,
        '--cheer-bounce-2': `${rand(-82, -55).toFixed(0)}px`,
        '--cheer-bounce-3': `${rand(-38, -20).toFixed(0)}px`,
        animationDelay: `${rand(0, 0.16).toFixed(3)}s`,
      } as React.CSSProperties,
    };
  });
}

/** Spawns across the full width of the overlay and falls, swaying. */
function rainParticles(effect: CheerEffect, count: number, size: number): Particle[] {
  return Array.from({ length: count }, () => ({
    cls: 'cheer-particle--rain',
    glyph: pick(CHEER_GLYPHS[effect]),
    style: {
      position: 'absolute',
      left: `${rand(-2, 98).toFixed(1)}%`,
      top: '-12%',
      fontSize: size * rand(0.7, 1.25),
      lineHeight: 1,
      '--cheer-sway': `${rand(-46, 46).toFixed(0)}px`,
      '--cheer-fall': `${rand(380, 560).toFixed(0)}px`,
      '--cheer-rot': `${rand(-420, 420).toFixed(0)}deg`,
      animationDelay: `${rand(0, 0.3).toFixed(3)}s`,
    } as React.CSSProperties,
  }));
}

/** Paper rectangles mixed into the confetti rain. */
function confettiPaper(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    cls: 'cheer-particle--rain',
    glyph: null,
    style: {
      position: 'absolute',
      left: `${rand(-2, 98).toFixed(1)}%`,
      top: '-12%',
      width: rand(6, 11),
      height: rand(3, 6),
      borderRadius: 1,
      background: pick(CONFETTI_COLORS),
      '--cheer-sway': `${rand(-60, 60).toFixed(0)}px`,
      '--cheer-fall': `${rand(380, 560).toFixed(0)}px`,
      '--cheer-rot': `${rand(-720, 720).toFixed(0)}deg`,
      animationDelay: `${rand(0, 0.3).toFixed(3)}s`,
    } as React.CSSProperties,
  }));
}

/** Floats up from the bottom edge, scaling in then fading. */
function riseParticles(effect: CheerEffect, count: number, size: number): Particle[] {
  return Array.from({ length: count }, () => ({
    cls: effect === 'fire' ? 'cheer-particle--fire' : 'cheer-particle--rise',
    glyph: pick(CHEER_GLYPHS[effect]),
    style: {
      position: 'absolute',
      left: `${rand(2, 94).toFixed(1)}%`,
      bottom: '-8%',
      fontSize: size * rand(0.7, 1.3),
      lineHeight: 1,
      '--cheer-sway': `${rand(-38, 38).toFixed(0)}px`,
      '--cheer-lift': `${rand(-360, -220).toFixed(0)}px`,
      '--cheer-scale': rand(0.9, 1.9).toFixed(2),
      animationDelay: `${rand(0, 0.34).toFixed(3)}s`,
    } as React.CSSProperties,
  }));
}

/**
 * Particle geometry for one burst, generated once at mount. Compact bursts
 * (cheers aimed at a card the viewer isn't looking at) always take the small
 * burst treatment — no rain or shake in the corner.
 */
function makeParticles(effect: CheerEffect, compact: boolean, density = 1): Particle[] {
  if (compact) return burstParticles(effect, 4 + Math.floor(Math.random() * 3), 15, false);
  // A combo plays the base archetype at triple density across the whole
  // panel — same personality, three times the room.
  const n = (base: number, jitter: number) =>
    Math.round((base + Math.floor(Math.random() * jitter)) * density);

  switch (effect) {
    case 'laugh':
      return burstParticles(effect, n(20, 7), 30, true);
    case 'mindblown':
      return burstParticles(effect, n(24, 9), 30, false);
    case 'angry':
      return burstParticles(effect, n(8, 5), 30, false);
    case 'confetti':
      return [
        ...rainParticles(effect, n(18, 5), 26),
        ...confettiPaper(n(8, 3)),
      ];
    case 'cry':
      return rainParticles(effect, n(26, 7), 26);
    case 'clap':
    case 'love':
    case 'fire':
      return riseParticles(effect, n(22, 7), 28);
  }
}

interface CheerBurstProps {
  effect: CheerEffect;
  /**
   * 'full' bursts over the focused card, 'compact' floats in the corner, and
   * 'mega' is the combo takeover: the same archetype at triple density over
   * the whole panel. Mega carries no banner — the particle storm is the
   * message — so its chip is the ordinary one every burst gets.
   */
  size?: 'full' | 'compact' | 'mega';
  /** Extra chip text for cheers aimed at a card the viewer isn't focused on. */
  snippet?: string | null;
}

export function CheerBurst({ effect, size = 'full', snippet = null }: CheerBurstProps) {
  const compact = size === 'compact';
  const mega = size === 'mega';
  const emoji = CHEER_EMOJI[effect];
  const archetype = CHEER_ARCHETYPE[effect];
  const [done, setDone] = useState(false);
  // Particle geometry is fixed at mount — re-randomising on every render would
  // restart the animation mid-flight, so it lives in lazily-initialised state
  // that is never set again. Same for the chip's vertical jitter, which keeps
  // two simultaneous bursts from stacking their chips in exactly one spot.
  const [particles] = useState(() => makeParticles(effect, compact, mega ? 3 : 1));
  const [chipOffset] = useState(() => (compact || mega ? 0 : Math.round(rand(-46, 46))));
  const settledRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), BURST_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  const onParticleEnd = () => {
    settledRef.current += 1;
    if (settledRef.current >= particles.length) setDone(true);
  };

  const renderParticle = (p: Particle, i: number) => (
    <span key={i} className={`cheer-particle ${p.cls}`} onAnimationEnd={onParticleEnd} style={p.style}>
      {p.glyph}
    </span>
  );

  const chip = (
    <span
      className="cheer-chip text-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        maxWidth: compact ? 240 : 280,
        marginTop: chipOffset,
        padding: compact ? '3px 8px' : '4px 10px',
        borderRadius: 999,
        fontSize: compact ? 10 : 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        color: 'var(--fg-1)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
      }}
    >
      <span style={{ fontSize: compact ? 12 : 14 }}>{emoji}</span>
      {snippet ? <span className="fg-2">→ {snippet}</span> : null}
    </span>
  );

  // Compact bursts stay in the corner-float column and keep their own flow
  // box. Full ones fill the overlay so rain can span the card's whole width.
  if (compact) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ position: 'relative', width: 0, height: 0 }}>{particles.map(renderParticle)}</div>
        {chip}
      </div>
    );
  }

  const spread = archetype === 'rain' || archetype === 'rise';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 😢 washes the card in a cold tint for a beat. */}
      {effect === 'cry' && (
        <div
          className="cheer-tint"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 18,
            background:
              'radial-gradient(circle at 50% 30%, oklch(0.78 0.14 210 / 0.30), oklch(0.68 0.12 250 / 0.10) 70%)',
          }}
        />
      )}
      {spread ? (
        <div style={{ position: 'absolute', inset: 0 }}>{particles.map(renderParticle)}</div>
      ) : (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
          {/* 🤯 fires a single shockwave ring through the particle cloud. */}
          {effect === 'mindblown' && <span className="cheer-shockwave" />}
          {particles.map(renderParticle)}
        </div>
      )}
      {chip}
    </div>
  );
}
