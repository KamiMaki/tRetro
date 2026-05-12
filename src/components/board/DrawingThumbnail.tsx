'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Drawing } from '@/lib/types';
import { GlassPanel } from '@/components/ui/Aurora';

interface DrawingThumbnailProps {
  drawing: Drawing;
  /** When supplied, the lightbox shows a Delete button. The caller is
   *  responsible for gating who sees it (drawing author / SM); the
   *  server enforces the same rule on the socket side. */
  onDelete?: () => void;
}

export function DrawingThumbnail({ drawing, onDelete }: DrawingThumbnailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Reset the confirm step every time the lightbox closes — otherwise
  // re-opening the same drawing remembers the destructive intent.
  useEffect(() => {
    if (!lightboxOpen) setConfirming(false);
  }, [lightboxOpen]);

  const handleDelete = () => {
    onDelete?.();
    setLightboxOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        title="View drawing"
        aria-label="View drawing"
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          border: '1px solid var(--glass-border)',
          overflow: 'hidden',
          background: '#fff',
          padding: 0,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform .15s, border-color .15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = 'var(--aurora-violet)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'var(--glass-border)';
        }}
      >
        <img src={drawing.data} alt="Drawing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </button>

      {lightboxOpen && mounted && createPortal(
        <div
          onClick={() => setLightboxOpen(false)}
          className="modal-backdrop"
          data-z="lightbox"
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 'min(540px, 100%)', width: '100%', position: 'relative', zIndex: 82 }}>
            <GlassPanel strong style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 className="text-display" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Drawing</h3>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close"
                  style={{
                    padding: 4, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--fg-2)', cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </button>
              </div>
              <img
                src={drawing.data}
                alt="Drawing (full size)"
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--glass-border)', background: '#fff', display: 'block' }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span className="text-mono fg-3" style={{ fontSize: 11 }}>
                  {new Date(drawing.createdAt).toLocaleString()}
                </span>
                {onDelete && (
                  <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {confirming ? (
                      <>
                        <span className="text-mono fg-2" style={{ fontSize: 11 }}>Delete this drawing?</span>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={handleDelete}
                          style={{ padding: '3px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setConfirming(false)}
                          style={{ padding: '3px 10px', fontSize: 11 }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setConfirming(true)}
                        title="Delete drawing (replace by drawing a new one)"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2.5 4h11M6 4V2.8a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8V4M3.8 4l.6 8.2A1.5 1.5 0 0 0 5.9 13.5h4.2a1.5 1.5 0 0 0 1.5-1.3L12.2 4M6.5 7v3.5M9.5 7v3.5" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              {onDelete && !confirming && (
                <p className="text-mono fg-3" style={{ fontSize: 10.5, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
                  Edit = delete + draw again. We don&apos;t keep an edit history, so a tweaked drawing is a new one.
                </p>
              )}
            </GlassPanel>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
