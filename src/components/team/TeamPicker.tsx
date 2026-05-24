'use client';

import { useEffect, useState } from 'react';
import { AuroraBg, GlassPanel, Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CreateTeamModal } from './CreateTeamModal';

interface TeamListEntry {
  id: string;
  name: string;
  createdAt: string;
}

interface Props {
  onAuthed: () => void;
}

export function TeamPicker({ onAuthed }: Props) {
  const [teams, setTeams] = useState<TeamListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch('/api/teams')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TeamListEntry[]) => {
        setTeams(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {
        // Fail open — the user can still create a new team.
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/teams/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamId: selectedId, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Wrong password');
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wrong password');
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        isolation: 'isolate',
      }}
    >
      <AuroraBg />

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: 'min(440px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <Logo size={32} />
          </div>
          <div
            className="text-mono fg-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 14,
              marginBottom: 4,
            }}
          >
            Team space
          </div>
          <h1 className="text-display aurora-text" style={{ fontSize: 28, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
            Pick your team
          </h1>
        </div>

        <GlassPanel strong style={{ padding: 28 }}>
          {loading ? (
            <div className="fg-2" style={{ fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              Loading teams…
            </div>
          ) : teams.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <div className="fg-1" style={{ fontSize: 14, marginBottom: 6 }}>
                No teams yet
              </div>
              <div className="fg-2" style={{ fontSize: 12, marginBottom: 18, lineHeight: 1.5 }}>
                Create the first team to start using RetroXpert.
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ width: '100%', justifyContent: 'center' }}>
                + Create a team
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleJoin}>
                <label className="text-mono fg-2" style={{ display: 'block', marginBottom: 6, fontSize: 11 }} htmlFor="team-select">
                  Team
                </label>
                <select
                  id="team-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="field"
                  style={{ marginBottom: 14 }}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <label className="text-mono fg-2" style={{ display: 'block', marginBottom: 6, fontSize: 11 }} htmlFor="team-password">
                  Password
                </label>
                <input
                  id="team-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  style={{ marginBottom: 14, letterSpacing: '0.12em' }}
                  placeholder="••••••••"
                  disabled={submitting}
                />

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
                      marginBottom: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedId || !password || submitting}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                >
                  {submitting ? 'Entering…' : 'Enter team →'}
                </button>
              </form>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  className="fg-3"
                  onClick={() => setShowHelp((s) => !s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="fg-1"
                  onClick={() => setShowCreate(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontWeight: 500 }}
                >
                  + Create new team
                </button>
              </div>

              {showHelp && (
                <div
                  className="fg-2"
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    lineHeight: 1.6,
                    background: 'var(--glass-highlight)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  Team passwords cannot be recovered. Ask whoever set the
                  password to share it, or create a new team and re-claim
                  any legacy rooms.
                </div>
              )}
            </>
          )}
        </GlassPanel>
      </div>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={onAuthed}
        />
      )}
    </main>
  );
}
