'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from '@/components/ui/Aurora';

export interface KeyboardHelpItem {
  keys: string;
  description: string;
  group?: string;
}

interface KeyboardHelpProps {
  open: boolean;
  items: KeyboardHelpItem[];
  onClose: () => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="text-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 22,
        height: 22,
        padding: '0 6px',
        borderRadius: 6,
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        color: 'var(--fg-0)',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        boxShadow: '0 1px 0 oklch(1 0 0 / 0.06) inset, 0 1px 2px oklch(0 0 0 / 0.25)',
      }}
    >
      {children}
    </kbd>
  );
}

function renderKeys(keys: string) {
  // "g h" → [g] [h], "?" → [?]
  const parts = keys.split(/\s+/);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {parts.map((p, i) => (
        <Kbd key={i}>{p === '/' ? '/' : p.toUpperCase()}</Kbd>
      ))}
    </span>
  );
}

export function KeyboardHelp({ open, items, onClose }: KeyboardHelpProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  // Group items
  const grouped = new Map<string, KeyboardHelpItem[]>();
  for (const item of items) {
    const g = item.group ?? 'General';
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(item);
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(540px, 100%)', position: 'relative', zIndex: 81 }}
      >
        <GlassPanel strong style={{ padding: 24 }}>
          <div
            className="text-mono fg-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Keyboard shortcuts
          </div>
          <h2 className="text-display" style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 600 }}>
            Quick keys
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {Array.from(grouped.entries()).map(([group, list]) => (
              <div key={group}>
                <div
                  className="text-mono fg-2"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {group}
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {list.map((item) => (
                    <li
                      key={item.keys + item.description}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 13,
                        color: 'var(--fg-1)',
                      }}
                    >
                      <span style={{ flex: 1 }}>{item.description}</span>
                      {renderKeys(item.keys)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="text-mono fg-3"
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--glass-border)',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span>
              Press <Kbd>?</Kbd> any time to open this list.
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px', fontSize: 12 }}>
              Close (Esc)
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>,
    document.body,
  );
}
