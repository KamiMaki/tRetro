'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Room } from '@/lib/types';
import { Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
  onCloseRoom: () => void;
  onReopenRoom: () => void;
  onOpenFacilitator: () => void;
}

const STATUS_COLORS: Record<RoomHeaderProps['connectionStatus'], string> = {
  connected: 'var(--status-live-fg)',
  connecting: 'var(--status-warn-fg)',
  disconnected: 'var(--fg-3)',
  error: 'var(--status-error-fg)',
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
  onReopenRoom,
  onOpenFacilitator,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
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


  const handleCopyAiPrompt = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/export?format=ai`);
      if (!res.ok) return;
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2200);
    } catch {
      // clipboard may fail in iframe / insecure context — silently no-op
    }
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
        background: 'var(--glass-bg-strong)',
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
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
              minWidth: 0,
            }}
          >
            {room?.name ?? 'Loading…'}
          </div>
          <Link
            href="/?status=closed"
            className="text-mono fg-3 past-retros-link"
            title="Browse past (closed) retros"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--glass-highlight)',
              border: '1px solid var(--glass-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.5-3.5L3 6" />
              <path d="M3 3v3h3" />
              <path d="M8 5v3l2 2" />
            </svg>
            Past retros
          </Link>
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

      {/* Guide — per-phase tips and prompts */}
      <button
        type="button"
        className="btn"
        onClick={onOpenFacilitator}
        title="Guide (per-phase tips & prompts)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M13 3v5h5" />
          <path d="M8 13h8M8 17h5" />
        </svg>
        Guide
      </button>

      {/* Share — three-node share icon */}
      <button type="button" className="btn" onClick={handleCopyLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="M8.3 10.7l7.4-4.4" />
          <path d="M8.3 13.3l7.4 4.4" />
        </svg>
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* SM-only actions */}
      {isScrumMaster && (
        <>
          <button
            type="button"
            className="btn"
            onClick={handleCopyAiPrompt}
            title="Copy a ready-to-paste summary prompt + retro content to your clipboard. Paste into ChatGPT / Claude / Gemini for theme synthesis."
            style={{
              background: aiCopied ? 'oklch(0.78 0.15 175 / 0.20)' : undefined,
              borderColor: aiCopied ? 'oklch(0.78 0.15 175 / 0.45)' : undefined,
              color: aiCopied ? 'oklch(0.92 0.12 175)' : undefined,
            }}
          >
            {/* Sparkle / wand icon — fits the "summary prompt" intent */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
              <path d="M19 4l.8 1.6L21.4 6.4 19.8 7.2 19 9l-.8-1.8L16.6 6.4 18.2 5.6z" />
              <path d="M5.5 17l.6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6 1.2-.6z" />
            </svg>
            {aiCopied ? 'Copied · paste into AI' : 'Summary Prompt'}
          </button>
          <button type="button" className="btn" onClick={handleExportMD} title="Export Markdown">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 11V2M5 5l3-3 3 3M3 11v3h10v-3" />
            </svg>
            MD
          </button>
          <button type="button" className="btn" onClick={handleExportHTML} title="Export HTML">
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

      {isScrumMaster && room?.status === 'closed' && (
        <button
          type="button"
          className="btn"
          onClick={onReopenRoom}
          title="Reopen this retro for further edits"
          style={{
            background: 'oklch(0.78 0.15 175 / 0.18)',
            borderColor: 'oklch(0.78 0.15 175 / 0.35)',
            color: 'oklch(0.92 0.12 175)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8a5 5 0 1 1 1.5 3.5L3 10" />
            <path d="M3 13v-3h3" />
          </svg>
          Reopen
        </button>
      )}

      <ThemeToggle />
    </header>
  );
}
