'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from '@/components/ui/Aurora';

const COLORS = ['#1e1e1e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const BRUSH_SIZES = [2, 5, 12];

interface DrawingModalProps {
  cardId: string;
  onSave: (cardId: string, data: string) => void;
  onClose: () => void;
}

export function DrawingModal({ cardId, onSave, onClose }: DrawingModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    const from = lastPos.current ?? pos;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
  }, [isDrawing, color, brushSize, isEraser]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    onSave(cardId, data);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="modal-backdrop"
      data-z="lightbox"
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', position: 'relative', zIndex: 82 }}>
        <GlassPanel strong style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="text-display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Drawing</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawing modal"
              style={{
                padding: 4, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--fg-2)', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setIsEraser(false); }}
                  aria-label={`Color ${c}`}
                  aria-pressed={!isEraser && color === c}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '2px solid ' + (!isEraser && color === c ? 'var(--fg-0)' : 'transparent'),
                    background: c,
                    cursor: 'pointer',
                    padding: 0,
                    transform: !isEraser && color === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform .12s, border-color .12s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {BRUSH_SIZES.map((size) => {
                const active = !isEraser && brushSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => { setBrushSize(size); setIsEraser(false); }}
                    aria-pressed={active}
                    title={`Brush size ${size}`}
                    style={{
                      width: 28, height: 28, borderRadius: 999, padding: 0,
                      background: active ? 'var(--glass-bg-strong)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--aurora-violet)' : 'var(--glass-border)'),
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: size + 2, height: size + 2, borderRadius: '50%', background: 'var(--fg-1)' }} />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsEraser((p) => !p)}
              aria-pressed={isEraser}
              className="btn"
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              Eraser
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="btn"
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              Clear
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={480}
            height={320}
            style={{
              width: '100%', height: 'auto', borderRadius: 10, border: '1px solid var(--glass-border)',
              touchAction: 'none', cursor: 'crosshair', background: '#fff', display: 'block',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save drawing
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>,
    document.body
  );
}
