'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Room, CardDTO, ActionItem } from '@/lib/types';
import { Avatar, Logo } from '@/components/ui/Aurora';
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
  cards: CardDTO[];
  actionItems: ActionItem[];
  onCloseRoom: () => void;
  onReopenRoom: () => void;
  onOpenFacilitator: () => void;
  onOpenSettings: () => void;
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
  onOpenSettings,
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

  const handleExportCSV = async () => {
    const res = await fetch(`/api/rooms/${roomId}/export?format=csv`);
    if (!res.ok) return;
    const text = await res.text();
    download(text, `retro-${roomId}.csv`, 'text/csv;charset=utf-8');
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

      <ThemeToggle />

      {/* Facilitator guide — useful for any participant running the meeting */}
      <button
        type="button"
        className="btn"
        onClick={onOpenFacilitator}
        title="主持人指南（每個階段的技巧與提問）"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 2h7l3 3v9H3z" />
          <path d="M5 6h6M5 9h6M5 12h4" />
        </svg>
        主持人指南
      </button>

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
          <button
            type="button"
            className="btn"
            onClick={handleCopyAiPrompt}
            title="複製整理好的 AI prompt + retro 內容到剪貼簿，貼到 ChatGPT / Claude / Gemini 即可取得主題摘要"
            style={{
              background: aiCopied ? 'oklch(0.78 0.15 175 / 0.20)' : undefined,
              borderColor: aiCopied ? 'oklch(0.78 0.15 175 / 0.45)' : undefined,
              color: aiCopied ? 'oklch(0.92 0.12 175)' : undefined,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2 2M10.6 10.6l2 2M3.4 12.6l2-2M10.6 5.4l2-2" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
            {aiCopied ? '已複製 · 貼到 AI' : '複製 AI prompt'}
          </button>
          <button type="button" className="btn" onClick={handleExportMD} title="Export as Markdown">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 11V2M5 5l3-3 3 3M3 11v3h10v-3" />
            </svg>
            MD
          </button>
          <button type="button" className="btn" onClick={handleExportHTML} title="匯出 HTML">
            HTML
          </button>
          <button type="button" className="btn" onClick={handleExportCSV} title="匯出 CSV（卡片 + action items 同表）">
            CSV
          </button>
          <button
            type="button"
            className="btn"
            onClick={onOpenSettings}
            title="房間設定（webhook digest）"
            aria-label="房間設定"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
            </svg>
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
    </header>
  );
}
