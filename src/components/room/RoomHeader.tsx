'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Room, CardDTO, ActionItem } from '@/lib/types';
import { Avatar, GlassPanel, IconBtn, Logo } from '@/components/ui/Aurora';

interface ParticipantSummary {
  id: string;
  nickname: string;
  isScrumMaster: boolean;
  isOnline: boolean;
}

interface RoomHeaderProps {
  room: Room | null;
  participants: ParticipantSummary[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isScrumMaster: boolean;
  roomId: string;
  cards: CardDTO[];
  actionItems: ActionItem[];
  onCloseRoom: () => void;
}

const STATUS_COLORS: Record<RoomHeaderProps['connectionStatus'], string> = {
  connected: 'oklch(0.82 0.16 175)',
  connecting: 'oklch(0.85 0.14 75)',
  disconnected: 'oklch(0.55 0.04 270)',
  error: 'oklch(0.65 0.18 25)',
};

const STATUS_LABELS: Record<RoomHeaderProps['connectionStatus'], string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Offline',
  error: 'Error',
};

export function RoomHeader({
  room,
  participants,
  connectionStatus,
  isScrumMaster,
  roomId,
  onCloseRoom,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const onlineCount = participants.filter((p) => p.isOnline).length;
  const isLive = connectionStatus === 'connected';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}/join`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportMD = async () => {
    const res = await fetch(`/api/rooms/${roomId}/export?format=md`);
    if (!res.ok) return;
    const text = await res.text();
    download(text, `retro-${roomId}.md`, 'text/markdown');
  };

  const handleExportHTML = async () => {
    const res = await fetch(`/api/rooms/${roomId}/export?format=html`);
    if (!res.ok) return;
    const text = await res.text();
    download(text, `retro-${roomId}.html`, 'text/html');
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseRoom = () => {
    onCloseRoom();
    setShowCloseConfirm(false);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        padding: '14px clamp(16px, 3vw, 28px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--glass-border)',
        background: 'oklch(0.13 0.03 270 / 0.45)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Logo size={20} />
      </Link>
      <div style={{ width: 1, height: 22, background: 'var(--glass-border)' }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="text-display"
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--fg-0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {room?.name ?? 'Loading…'}
        </div>
        <div className="text-mono fg-3" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLive && <span className="live-dot" />}
          <span style={{ color: STATUS_COLORS[connectionStatus] }}>
            {STATUS_LABELS[connectionStatus]}
          </span>
          <span>· {onlineCount} present</span>
          {room?.status === 'closed' && (
            <span
              style={{
                marginLeft: 4,
                padding: '1px 8px',
                borderRadius: 999,
                background: 'oklch(0.65 0.18 25 / 0.18)',
                color: 'oklch(0.92 0.10 25)',
                fontSize: 10,
                border: '1px solid oklch(0.65 0.18 25 / 0.3)',
              }}
            >
              closed
            </span>
          )}
        </div>
      </div>

      {/* Avatars stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {participants.slice(0, 5).map((p, i) => (
          <div
            key={p.id}
            style={{
              marginLeft: i ? -8 : 0,
              opacity: p.isOnline ? 1 : 0.45,
              filter: p.isOnline ? 'none' : 'grayscale(0.4)',
            }}
            title={`${p.nickname}${p.isScrumMaster ? ' (SM)' : ''}${p.isOnline ? '' : ' · offline'}`}
          >
            <Avatar name={p.nickname} size={26} colorIndex={i} />
          </div>
        ))}
        {participants.length > 5 && (
          <span className="text-mono fg-3" style={{ marginLeft: 6, fontSize: 11 }}>
            +{participants.length - 5}
          </span>
        )}
      </div>

      {/* Share */}
      <button type="button" className="btn" onClick={handleCopyLink}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 8h6M8 5l3 3-3 3" />
          <circle cx="13" cy="8" r="2" />
          <circle cx="3" cy="8" r="2" />
        </svg>
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* SM-only actions */}
      {isScrumMaster && (
        <>
          <button type="button" className="btn" onClick={handleExportMD} title="Export as Markdown">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 11V2M5 5l3-3 3 3M3 11v3h10v-3" />
            </svg>
            MD
          </button>
          <button type="button" className="btn" onClick={handleExportHTML} title="Export as HTML">
            HTML
          </button>
        </>
      )}

      {isScrumMaster && room?.status === 'active' && (
        <>
          {showCloseConfirm ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="text-mono fg-2" style={{ fontSize: 11 }}>Close?</span>
              <button type="button" className="btn btn-danger" onClick={handleCloseRoom} style={{ padding: '4px 10px' }}>
                Yes
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCloseConfirm(false)} style={{ padding: '4px 10px' }}>
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowCloseConfirm(true)}
            >
              Close room
            </button>
          )}
        </>
      )}
    </header>
  );
}
