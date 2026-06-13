'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TourStep {
  /** CSS selector for the element to highlight. Missing = center tooltip only. */
  target?: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  steps: TourStep[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAD = 12; // ring padding around target
const TOOLTIP_W = 320;
const TOOLTIP_H_EST = 180; // rough estimate for viewport clamping

function getTargetRect(selector: string): Rect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

function tooltipPosition(rect: Rect | null): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return {
      top: Math.max(16, (vh - TOOLTIP_H_EST) / 2),
      left: Math.max(16, (vw - TOOLTIP_W) / 2),
    };
  }

  // Prefer below the highlighted element; if not enough room, go above.
  const ringBottom = rect.top + rect.height + PAD;
  const spaceBelow = vh - ringBottom;
  const spaceAbove = rect.top - PAD;

  let top: number;
  if (spaceBelow >= TOOLTIP_H_EST + 8 || spaceBelow >= spaceAbove) {
    top = ringBottom + 8;
  } else {
    top = spaceAbove - TOOLTIP_H_EST - 8;
  }

  // Horizontal: centre on the target, clamped to viewport.
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_H_EST - 12));

  return { top, left };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour({ steps, onClose }: OnboardingTourProps) {
  const [mounted, setMounted] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const step = steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  // Resolve the target element's rect for the current step.
  const resolveRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const r = getTargetRect(step.target);
    setTargetRect(r);
  }, [step]);

  // Mount guard (SSR safety).
  useEffect(() => { setMounted(true); }, []);

  // Re-resolve when step changes and on resize/scroll.
  useEffect(() => {
    if (!mounted) return;
    resolveRect();
    window.addEventListener('resize', resolveRect, { passive: true });
    window.addEventListener('scroll', resolveRect, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', resolveRect);
      window.removeEventListener('scroll', resolveRect, true);
    };
  }, [mounted, resolveRect]);

  // Focus next/finish button when step changes.
  useEffect(() => {
    if (mounted) nextBtnRef.current?.focus();
  }, [mounted, stepIdx]);

  // Escape = close.
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  if (!mounted || typeof document === 'undefined' || steps.length === 0) return null;

  const tipPos = tooltipPosition(targetRect);
  const ringStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - PAD,
        left: targetRect.left - PAD,
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
        borderRadius: 14,
        border: '2px solid var(--aurora-violet)',
        boxShadow: '0 0 0 4px oklch(0.68 0.20 285 / 0.22)',
        pointerEvents: 'none',
        zIndex: 10001,
        animation: 'tour-ring-in 0.2s ease-out both',
      }
    : { display: 'none' };

  return createPortal(
    <>
      {/* Dimmed backdrop — click does NOT advance to avoid accidental dismiss */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'oklch(0 0 0 / 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'fade-in 0.2s ease-out both',
        }}
      />

      {/* Highlight ring around the target element */}
      <div style={ringStyle} />

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`新手導覽 步驟 ${stepIdx + 1} / ${steps.length}`}
        style={{
          position: 'fixed',
          top: tipPos.top,
          left: tipPos.left,
          width: TOOLTIP_W,
          zIndex: 10002,
          background: 'var(--bg-1)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          boxShadow: '0 12px 40px oklch(0 0 0 / 0.45)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'tour-card-in 0.18s ease-out both',
        }}
      >
        {/* Step counter */}
        <div
          className="text-mono fg-3"
          style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          新手導覽 · {stepIdx + 1} / {steps.length}
        </div>

        {/* Title */}
        <div
          className="text-display"
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-0)', lineHeight: 1.3 }}
        >
          {step.title}
        </div>

        {/* Body */}
        <div
          style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-1)' }}
        >
          {step.body}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {/* Skip — always visible */}
          <button
            type="button"
            onClick={onClose}
            style={{
              marginRight: 'auto',
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              color: 'var(--fg-3)',
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
          >
            跳過
          </button>

          {/* Prev */}
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStepIdx((i) => i - 1)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                color: 'var(--fg-2)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 999,
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-bg-strong)'; e.currentTarget.style.color = 'var(--fg-0)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--fg-2)'; }}
            >
              上一步
            </button>
          )}

          {/* Next / Finish */}
          <button
            ref={nextBtnRef}
            type="button"
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setStepIdx((i) => i + 1);
              }
            }}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              color: '#fff',
              background: 'var(--aurora-violet)',
              border: '1px solid transparent',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tour-ring-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tour-card-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>,
    document.body,
  );
}
