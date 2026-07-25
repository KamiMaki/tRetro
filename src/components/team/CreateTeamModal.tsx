'use client';

import { useState } from 'react';
import { PasswordField } from '@/components/ui/PasswordField';

const MIN_PASSWORD_LEN = 8;
const MAX_NAME_LEN = 40;

interface CreatedTeam {
  id: string;
  name: string;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  /**
   * Called after the team is created AND the team-auth cookie has been
   * set. The parent reloads/refreshes to show the now-active team.
   */
  onCreated: (team: CreatedTeam) => void;
}

export function CreateTeamModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit =
    !submitting &&
    trimmedName.length > 0 &&
    trimmedName.length <= MAX_NAME_LEN &&
    password.length >= MIN_PASSWORD_LEN &&
    password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const createRes = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, password }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create team');
      }
      const team: CreatedTeam = await createRes.json();

      // Auto-authenticate so the user lands inside the team they just made.
      const authRes = await fetch('/api/teams/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamId: team.id, password }),
      });
      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'Team created but auth failed — please log in');
      }
      onCreated(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100%)', position: 'relative', zIndex: 81 }}>
        <div
          style={{
            padding: 28,
            background: 'var(--bg-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 60px oklch(0 0 0 / 0.45), 0 1px 0 oklch(1 0 0 / 0.04) inset',
          }}
        >
          <div
            className="text-mono fg-3"
            style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}
          >
            New team space
          </div>
          <h2 className="text-display" style={{ margin: '0 0 18px', fontSize: 26, fontWeight: 600 }}>
            Create a team
          </h2>

          <div
            role="note"
            style={{
              fontSize: 12,
              color: 'oklch(0.82 0.14 75)',
              background: 'oklch(0.65 0.18 75 / 0.10)',
              border: '1px solid oklch(0.65 0.18 75 / 0.30)',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <strong>There is no password recovery.</strong> Store this password
            somewhere safe — losing it means losing access to this team&apos;s rooms.
          </div>

          <form onSubmit={handleSubmit}>
            <label className="text-mono fg-2" style={{ display: 'block', marginBottom: 6, fontSize: 11 }} htmlFor="teamName">
              Team name
            </label>
            <input
              id="teamName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LEN}
              autoFocus
              className="field"
              style={{ marginBottom: 14 }}
              placeholder="e.g. Platform Squad"
            />

            <label className="text-mono fg-2" style={{ display: 'block', marginBottom: 6, fontSize: 11 }} htmlFor="teamPassword">
              Password (min {MIN_PASSWORD_LEN} chars)
            </label>
            <PasswordField
              id="teamPassword"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              style={{ marginBottom: 14 }}
            />

            <label className="text-mono fg-2" style={{ display: 'block', marginBottom: 6, fontSize: 11 }} htmlFor="teamPasswordConfirm">
              Confirm password
            </label>
            <PasswordField
              id="teamPasswordConfirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field"
              style={{ marginBottom: 14 }}
            />

            {confirm.length > 0 && confirm !== password && (
              <div style={{ fontSize: 12, color: 'oklch(0.85 0.14 25)', marginBottom: 12 }}>
                Passwords do not match.
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  fontSize: 12,
                  color: 'oklch(0.85 0.14 25)',
                  background: 'oklch(0.65 0.18 25 / 0.12)',
                  border: '1px solid oklch(0.65 0.18 25 / 0.25)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                {submitting ? 'Creating…' : 'Create team'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
