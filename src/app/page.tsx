'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { RoomSummary, SectionType } from '@/lib/types';
import { SECTIONS, SECTION_EMOJIS, SECTION_LABELS } from '@/lib/types';
import { AuroraBg, GlassPanel, Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useShortcuts } from '@/lib/hooks/useShortcuts';
import { KeyboardHelp, type KeyboardHelpItem } from '@/components/ui/KeyboardHelp';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function relDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

const HUE_RING = [285, 175, 350, 75, 210];
function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return HUE_RING[Math.abs(h) % HUE_RING.length];
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (() => {
    const s = searchParams.get('status');
    return s === 'active' || s === 'closed' ? s : 'all';
  })();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('Sprint 25 · Aether');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>(initialStatus);
  const [helpOpen, setHelpOpen] = useState(false);

  const SHORTCUTS: KeyboardHelpItem[] = [
    { keys: '/', description: 'Focus search', group: 'Navigation' },
    { keys: 'n', description: 'New retro', group: 'Actions' },
    { keys: '?', description: 'Show this help', group: 'Help' },
  ];

  useShortcuts([
    {
      keys: '/',
      description: 'Focus search',
      handler: () => {
        const el = document.getElementById('dashboard-search') as HTMLInputElement | null;
        el?.focus();
        el?.select();
      },
    },
    {
      keys: 'n',
      description: 'New retro',
      handler: () => {
        setShowCreate(true);
        setCreateError(null);
      },
    },
    {
      keys: '?',
      description: 'Open help',
      handler: () => setHelpOpen(true),
    },
  ]);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to load rooms');
      const data = await res.json();
      setRooms(data);
    } catch {
      setError('Could not load rooms. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to create room');
      }
      const { joinUrl } = await res.json();
      router.push(joinUrl);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [rooms, search, statusFilter, sortBy]);

  const activeRooms = filteredRooms.filter((r) => r.status === 'active');
  const closedRooms = filteredRooms.filter((r) => r.status === 'closed');

  return (
    <main style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <AuroraBg />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '20px 32px',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Logo />
          <div style={{ flex: 1, minWidth: 16 }} />
          <GlassPanel
            style={{
              borderRadius: 999,
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: 280,
              maxWidth: '100%',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--fg-2)" strokeWidth="1.5" aria-hidden="true">
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              id="dashboard-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search retros…"
              aria-label="Search retros"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--fg-0)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
            <span className="text-mono fg-3" style={{ fontSize: 11 }}>
              ⌘K
            </span>
          </GlassPanel>
          <ThemeToggle />
        </header>

        {/* Hero */}
        <div style={{ padding: '12px 32px 24px' }}>
          <div
            className="text-mono fg-2"
            style={{ fontSize: 12, marginBottom: 6 }}
          >
            <span className="live-dot" style={{ marginRight: 8 }} />
            {rooms.length} retro{rooms.length === 1 ? '' : 's'} ·{' '}
            {activeRooms.length} active session{activeRooms.length === 1 ? '' : 's'}
          </div>
          <h1
            className="text-display"
            style={{ fontSize: 'clamp(32px, 5vw, 48px)', margin: 0, lineHeight: 1.05, fontWeight: 600 }}
          >
            Welcome back to <span className="aurora-text">tRetro</span>
          </h1>
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: '0 32px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreate(true);
              setCreateError(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3v10M3 8h10" />
            </svg>
            New retro
          </button>

          <GlassPanel style={{ display: 'flex', alignItems: 'center', padding: 3, borderRadius: 10 }}>
            {([
              ['date', 'Recent'],
              ['name', 'A → Z'],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSortBy(k)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: sortBy === k ? 'var(--glass-bg-strong)' : 'transparent',
                  color: sortBy === k ? 'var(--fg-0)' : 'var(--fg-2)',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {l}
              </button>
            ))}
          </GlassPanel>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'active', 'closed'] as const).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 999,
                    fontFamily: 'var(--font-mono)',
                    background: active ? 'var(--glass-bg-strong)' : 'transparent',
                    color: active ? 'var(--fg-0)' : 'var(--fg-2)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Boards grid */}
        <div style={{ padding: '0 32px 32px', flex: 1 }}>
          {loading && (
            <div className="fg-2" style={{ textAlign: 'center', padding: '64px 0' }}>
              Loading retros…
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'oklch(0.78 0.16 25)' }}>
              {error}
            </div>
          )}
          {!loading && !error && filteredRooms.length === 0 && (
            <GlassPanel style={{ padding: 48, textAlign: 'center' }}>
              <div className="text-display fg-1" style={{ fontSize: 20, marginBottom: 6 }}>
                {rooms.length === 0 ? 'No retros yet' : 'No matches'}
              </div>
              <div className="fg-2" style={{ fontSize: 14 }}>
                {rooms.length === 0
                  ? 'Click “New retro” to spin up your first board.'
                  : 'Try a different search or filter.'}
              </div>
            </GlassPanel>
          )}

          {!loading && !error && activeRooms.length > 0 && (
            <>
              <SectionLabel>Active</SectionLabel>
              <BoardGrid rooms={activeRooms} />
            </>
          )}
          {!loading && !error && closedRooms.length > 0 && (
            <>
              <SectionLabel>Closed</SectionLabel>
              <BoardGrid rooms={closedRooms} />
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <NewRoomModal
          name={roomName}
          setName={setRoomName}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          creating={creating}
          error={createError}
        />
      )}

      <KeyboardHelp
        open={helpOpen}
        items={SHORTCUTS}
        onClose={() => setHelpOpen(false)}
      />
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 8 }}>
      <span
        className="text-mono fg-3"
        style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
    </div>
  );
}

function BoardGrid({ rooms }: { rooms: RoomSummary[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}
    >
      {rooms.map((room, i) => (
        <BoardCard key={room.id} room={room} delay={Math.min(i, 12) * 0.04} />
      ))}
    </div>
  );
}

function BoardCard({ room, delay }: { room: RoomSummary; delay: number }) {
  const isActive = room.status === 'active';
  const hue = hueFor(room.id);
  // Active room: go straight to the board (auto-creates guest participant).
  // Closed room: read-only history view.
  const href = isActive ? `/room/${room.id}` : `/room/${room.id}/history`;
  const lastActive = relDate(room.lastActivityAt);

  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        animation: `drop-in 0.5s ${delay}s both cubic-bezier(0.34, 1.4, 0.5, 1)`,
      }}
    >
      <GlassPanel
        strong
        style={{
          padding: 18,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.25s cubic-bezier(0.2, 0.7, 0.3, 1)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, oklch(0.7 0.2 ${hue} / 0.5), transparent 65%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            position: 'relative',
          }}
        >
          <span className="text-mono fg-2" style={{ fontSize: 11 }}>
            {formatDate(room.createdAt)} · active {lastActive}
          </span>
          <span
            className={`text-mono status-pill ${isActive ? 'status-live' : 'status-closed'}`}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999 }}
          >
            {isActive ? 'live' : 'closed'}
          </span>
        </div>
        <h3
          className="text-display"
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--fg-0)',
          }}
        >
          {room.name}
        </h3>

        {/* Section preview row */}
        <div
          aria-label="Card counts per section"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginTop: 14,
          }}
        >
          {SECTIONS.map((s) => (
            <SectionBadge
              key={s}
              section={s}
              count={room.sectionCounts[s] ?? 0}
            />
          ))}
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--glass-border)',
            gap: 8,
          }}
        >
          <div style={{ display: 'inline-flex', gap: 12 }}>
            <Stat icon="users" value={room.participantCount} label="people" />
            <Stat icon="cards" value={room.cardCount} label="cards" />
            <Stat icon="check" value={room.actionItemCount} label="actions" />
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
}

function SectionBadge({ section, count }: { section: SectionType; count: number }) {
  const emoji = SECTION_EMOJIS[section];
  const label = SECTION_LABELS[section];
  const isEmpty = count === 0;
  return (
    <div
      title={`${label}: ${count} card${count === 1 ? '' : 's'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '4px 6px',
        borderRadius: 8,
        background: isEmpty ? 'transparent' : 'var(--glass-highlight)',
        border: '1px solid var(--glass-border)',
        opacity: isEmpty ? 0.42 : 1,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--fg-1)',
        minWidth: 0,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontWeight: 600, color: isEmpty ? 'var(--fg-3)' : 'var(--fg-0)' }}>{count}</span>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: 'users' | 'cards' | 'check'; value: number; label: string }) {
  const path = {
    users: 'M11 14a4 4 0 10-6 0M14 14a4 4 0 10-6 0M8 6a2 2 0 110-4 2 2 0 010 4zM5 6a2 2 0 100 0',
    cards: 'M3 5h10v8H3zM5 3h6',
    check: 'M3 8l3 3 6-6',
  }[icon];
  return (
    <span
      className="text-mono fg-2"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
      title={`${value} ${label}`}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
      {value}
    </span>
  );
}

function NewRoomModal({
  name,
  setName,
  onClose,
  onSubmit,
  creating,
  error,
}: {
  name: string;
  setName: (s: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
  error: string | null;
}) {
  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100%)', position: 'relative', zIndex: 81 }}>
        <GlassPanel strong style={{ padding: 28 }}>
          <div
            className="text-mono fg-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            New retro
          </div>
          <h2 className="text-display" style={{ margin: '0 0 18px', fontSize: 26, fontWeight: 600 }}>
            Create a retro board
          </h2>

          <form onSubmit={onSubmit}>
            <label
              className="text-mono fg-2"
              style={{ display: 'block', marginBottom: 6, fontSize: 11 }}
              htmlFor="roomName"
            >
              Title
            </label>
            <input
              id="roomName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              className="field"
              style={{ marginBottom: 16 }}
            />

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: 'oklch(0.85 0.14 25)',
                  background: 'oklch(0.65 0.18 25 / 0.12)',
                  border: '1px solid oklch(0.65 0.18 25 / 0.25)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create board'}
              </button>
            </div>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
