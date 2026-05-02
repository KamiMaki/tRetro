'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from '@/components/ui/Aurora';

interface RoomSettingsModalProps {
  open: boolean;
  roomId: string;
  onClose: () => void;
}

interface WebhookState {
  loading: boolean;
  webhookUrl: string;
  masked: string | null;
  error: string | null;
  saving: boolean;
  saved: boolean;
}

const INITIAL_STATE: WebhookState = {
  loading: true,
  webhookUrl: '',
  masked: null,
  error: null,
  saving: false,
  saved: false,
};

export function RoomSettingsModal({ open, roomId, onClose }: RoomSettingsModalProps) {
  const [state, setState] = useState<WebhookState>(INITIAL_STATE);

  useEffect(() => {
    if (!open) return;
    setState(INITIAL_STATE);
    const token = sessionStorage.getItem('sessionToken') ?? '';
    fetch(`/api/rooms/${roomId}/webhook`, {
      headers: { 'x-session-token': token },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((body) => {
        setState((s) => ({
          ...s,
          loading: false,
          webhookUrl: body.webhookUrl ?? '',
          masked: body.masked ?? null,
        }));
      })
      .catch((err) => {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
  }, [open, roomId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function save(nextUrl: string) {
    setState((s) => ({ ...s, saving: true, error: null, saved: false }));
    try {
      const token = sessionStorage.getItem('sessionToken') ?? '';
      const res = await fetch(`/api/rooms/${roomId}/webhook`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token,
        },
        body: JSON.stringify({ webhookUrl: nextUrl || null }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Save failed');
      }
      setState((s) => ({
        ...s,
        saving: false,
        saved: true,
        webhookUrl: body.webhookUrl ?? '',
        masked: body.masked ?? null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      }));
    }
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Room settings"
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)', position: 'relative', zIndex: 81 }}>
        <GlassPanel strong style={{ padding: 26 }}>
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}
          >
            Room settings
          </div>
          <h2 className="text-display" style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 600 }}>
            Action item webhook
          </h2>
          <p className="fg-2" style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 16px' }}>
            Set a Slack / Discord / generic webhook URL. When the retro is closed,
            we POST a Markdown digest of action items to this endpoint. Failures
            do not block the close.
          </p>

          {state.loading ? (
            <div className="fg-2" style={{ fontSize: 13, padding: '12px 0' }}>Loading…</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(state.webhookUrl.trim());
              }}
            >
              <label className="text-mono fg-2" htmlFor="webhook-url" style={{ display: 'block', marginBottom: 6, fontSize: 11 }}>
                Webhook URL
              </label>
              <input
                id="webhook-url"
                type="url"
                inputMode="url"
                placeholder="https://hooks.slack.com/services/..."
                value={state.webhookUrl}
                onChange={(e) => setState((s) => ({ ...s, webhookUrl: e.target.value, saved: false }))}
                className="field"
                style={{ marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                autoFocus
              />
              {state.masked && state.masked !== state.webhookUrl && (
                <div className="text-mono fg-3" style={{ fontSize: 11, marginBottom: 10 }}>
                  Currently saved: {state.masked}
                </div>
              )}
              {state.error && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'oklch(0.85 0.14 25)',
                    background: 'oklch(0.65 0.18 25 / 0.12)',
                    border: '1px solid oklch(0.65 0.18 25 / 0.25)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  {state.error}
                </div>
              )}
              {state.saved && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'oklch(0.92 0.12 175)',
                    background: 'oklch(0.78 0.15 175 / 0.16)',
                    border: '1px solid oklch(0.78 0.15 175 / 0.32)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  Saved. The next close will POST a digest to this URL.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                {state.webhookUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => save('')}
                    disabled={state.saving}
                  >
                    Clear
                  </button>
                )}
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={state.saving}
                >
                  {state.saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </GlassPanel>
      </div>
    </div>,
    document.body,
  );
}
