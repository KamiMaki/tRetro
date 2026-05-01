'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuroraBg, GlassPanel, Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [roomName, setRoomName] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRoom, setIsFetchingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then((data) => setRoomName(data.name ?? roomId))
      .catch(() => setError('Room not found or no longer available.'))
      .finally(() => setIsFetchingRoom(false));
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${roomId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to join room');
      }

      const data = await res.json();
      sessionStorage.setItem('sessionToken', data.sessionToken);
      sessionStorage.setItem('participantId', data.participantId);
      sessionStorage.setItem('roomId', roomId);
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('isScrumMaster', String(data.isScrumMaster ?? false));

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="text-mono fg-3" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 14, marginBottom: 4 }}>
            Joining retro
          </div>
          {isFetchingRoom ? (
            <div className="fg-2 text-display" style={{ fontSize: 22, fontWeight: 600 }}>Loading…</div>
          ) : (
            <h1 className="text-display aurora-text" style={{ fontSize: 28, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
              {roomName || 'Retrospective'}
            </h1>
          )}
        </div>

        <GlassPanel strong style={{ padding: 28 }}>
          <h2
            className="text-display"
            style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            Pick a nickname
          </h2>
          <p className="fg-2" style={{ fontSize: 13, marginTop: 0, marginBottom: 18, lineHeight: 1.55 }}>
            You&apos;ll appear as this name in chat &amp; comments. Cards stay anonymous unless you reveal them.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              className="text-mono fg-2"
              htmlFor="nickname"
              style={{ display: 'block', marginBottom: 6, fontSize: 11 }}
            >
              Your nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Aria"
              maxLength={40}
              disabled={isLoading || isFetchingRoom}
              autoFocus
              className="field"
              style={{ marginBottom: 14 }}
            />

            {error && (
              <div
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
              disabled={isLoading || !nickname.trim() || isFetchingRoom}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
            >
              {isLoading ? 'Joining…' : 'Enter retro →'}
            </button>
          </form>
        </GlassPanel>

        <div className="text-mono fg-3" style={{ fontSize: 11, textAlign: 'center', marginTop: 16 }}>
          Aurora liquid-glass · anonymous by default
        </div>
      </div>
    </main>
  );
}
