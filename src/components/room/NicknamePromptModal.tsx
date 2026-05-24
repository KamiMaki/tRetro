'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Initial value — usually whatever sessionStorage held, or empty. */
  initial?: string;
  /** Called when the user submits a non-empty nickname. */
  onSubmit: (nickname: string) => void;
  /** Called when the user explicitly opts to keep a generated Guest name. */
  onUseGuest: () => void;
}

const MAX_LEN = 40;

/**
 * One-off prompt shown when a participant first lands on a NAMED
 * (non-anonymous) room without a real nickname. Anonymous rooms bypass
 * this modal entirely — they generate Guest-XXXXX silently.
 *
 * Renders as a focused glass card centered on the page (no AuroraBg
 * here — the page below already has it). Uses the inline backdrop
 * pattern from CreateTeamModal so the user can't dismiss accidentally.
 */
export function NicknamePromptModal({ initial = '', onSubmit, onUseGuest }: Props) {
  const [value, setValue] = useState(initial);
  // Focus the input on mount via ref-less effect for accessibility.
  useEffect(() => {
    const el = document.getElementById('nickname-prompt-input') as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, []);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LEN;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(420px, 100%)', position: 'relative', zIndex: 81 }}
      >
        <div
          style={{
            padding: 28,
            background: 'var(--bg-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow:
              '0 24px 60px oklch(0 0 0 / 0.45), 0 1px 0 oklch(1 0 0 / 0.04) inset',
          }}
        >
          <div
            className="text-mono fg-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Joining retro
          </div>
          <h2
            className="text-display"
            style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 600 }}
          >
            What should we call you?
          </h2>
          <p
            className="fg-2"
            style={{ fontSize: 12.5, marginTop: 0, marginBottom: 18, lineHeight: 1.55 }}
          >
            This is a named retro — your nickname appears on every card and
            comment you post. Pick something the rest of the team will
            recognise.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              className="text-mono fg-2"
              style={{ display: 'block', marginBottom: 6, fontSize: 11 }}
              htmlFor="nickname-prompt-input"
            >
              Nickname
            </label>
            <input
              id="nickname-prompt-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={MAX_LEN}
              placeholder="e.g. Penguin"
              className="field"
              style={{ marginBottom: 16 }}
              autoComplete="nickname"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onUseGuest}
                style={{ fontSize: 12 }}
              >
                Use a guest name instead
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
              >
                Enter retro →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
