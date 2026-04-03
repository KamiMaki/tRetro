'use client';

import { useState } from 'react';
import type { Room, CardDTO, ActionItem } from '@/lib/types';

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

const STATUS_COLORS = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-gray-400',
  error: 'bg-red-500',
};

const STATUS_LABELS = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Error',
};

export function RoomHeader({
  room,
  participants,
  connectionStatus,
  isScrumMaster,
  roomId,
  cards,
  actionItems,
  onCloseRoom,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const onlineCount = participants.filter((p) => p.isOnline).length;

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
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-20">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg shrink-0">tRetro</span>
          {room && (
            <>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <h1 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{room.name}</h1>
              {room.status === 'closed' && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Closed
                </span>
              )}
            </>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[connectionStatus]}`} />
            <span className="hidden sm:inline">{STATUS_LABELS[connectionStatus]}</span>
          </div>

          {/* Online count */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{onlineCount}</span>
          </div>

          {/* Share link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>

          {/* SM-only: Export */}
          {isScrumMaster && (
            <>
              <button
                onClick={handleExportMD}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
              >
                Export MD
              </button>
              <button
                onClick={handleExportHTML}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
              >
                Export HTML
              </button>
            </>
          )}

          {/* SM-only: Close room */}
          {isScrumMaster && room?.status === 'active' && (
            <>
              {showCloseConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Close room?</span>
                  <button
                    onClick={handleCloseRoom}
                    className="text-sm px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="text-sm px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition"
                >
                  Close Room
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
