'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FACILITATOR_STAGES, type FacilitatorStage } from '@/lib/facilitator/prompts';

interface FacilitatorPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FacilitatorPanel({ open, onClose }: FacilitatorPanelProps) {
  const [activeKey, setActiveKey] = useState<FacilitatorStage['key']>('gather');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const stage = FACILITATOR_STAGES.find((s) => s.key === activeKey) ?? FACILITATOR_STAGES[0];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guide"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'oklch(0 0 0 / 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fade-in 0.18s ease-out both',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          height: '100%',
          background: 'var(--bg-1)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-12px 0 32px oklch(0 0 0 / 0.35)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fp-slide-in 0.2s cubic-bezier(0.2, 0.7, 0.3, 1) both',
        }}
      >
        <header
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 20 }}>{stage.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-mono fg-3" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Guide
            </div>
            <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
              {stage.title} · {stage.duration}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            title="Close (Esc)"
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            ✕
          </button>
        </header>

        <nav
          aria-label="Phase selector"
          style={{
            display: 'flex',
            gap: 4,
            padding: 8,
            borderBottom: '1px solid var(--glass-border)',
            overflowX: 'auto',
          }}
        >
          {FACILITATOR_STAGES.map((s) => {
            const isActive = s.key === activeKey;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveKey(s.key)}
                aria-pressed={isActive}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--fg-0)' : 'var(--fg-2)',
                  background: isActive ? 'var(--glass-bg-strong)' : 'transparent',
                  border: '1px solid ' + (isActive ? 'var(--glass-border)' : 'transparent'),
                  borderRadius: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span aria-hidden="true">{s.emoji}</span>
                {s.title}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: 'var(--fg-1)' }}>
            <strong style={{ color: 'var(--fg-0)' }}>Goal:</strong> {stage.goal}
          </p>

          <h3 className="text-mono fg-2" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '18px 0 6px' }}>
            Tips
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stage.tips.map((tip, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--fg-1)',
                  paddingLeft: 18,
                  position: 'relative',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 4,
                    top: 8,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--aurora-violet)',
                  }}
                />
                {tip}
              </li>
            ))}
          </ul>

          <h3 className="text-mono fg-2" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '18px 0 6px' }}>
            Prompts you can read aloud
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stage.prompts.map((prompt, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                  color: 'var(--fg-0)',
                  padding: '10px 12px',
                  background: 'var(--glass-highlight)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 10,
                }}
              >
                “{prompt}”
              </li>
            ))}
          </ul>

          <p
            className="text-mono fg-3"
            style={{ marginTop: 22, fontSize: 11, lineHeight: 1.55 }}
          >
            Want themes? Click the <strong style={{ color: 'var(--fg-1)' }}>✦ Summary Prompt</strong> button in the header — it copies a ready-to-paste prompt that works in any external AI tool.
          </p>
        </div>

        <style jsx>{`
          @keyframes fp-slide-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </aside>
    </div>,
    document.body,
  );
}
