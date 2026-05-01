'use client';

import { useState } from 'react';
import type { Drawing } from '@/lib/types';
import { GlassPanel } from '@/components/ui/Aurora';

interface DrawingThumbnailProps {
  drawing: Drawing;
}

export function DrawingThumbnail({ drawing }: DrawingThumbnailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

      {lightboxOpen && (
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
              <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 8, textAlign: 'right' }}>
                {new Date(drawing.createdAt).toLocaleString()}
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </>
  );
}
