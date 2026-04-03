'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CardDTOv2, Tag, ActionItem, Room } from '@/lib/types';
import { SECTIONS, SECTION_LABELS } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';

interface HistoryData {
  room: Room;
  cards: CardDTOv2[];
  tags: Tag[];
  actionItems: ActionItem[];
  participantCount: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SECTION_STYLES: Record<string, { header: string; border: string }> = {
  'went-well':  { header: 'bg-green-500',  border: 'border-green-200 dark:border-green-800' },
  'to-improve': { header: 'bg-red-500',    border: 'border-red-200 dark:border-red-800' },
  'thanks':     { header: 'bg-blue-500',   border: 'border-blue-200 dark:border-blue-800' },
  'deep-dive':  { header: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
};

export default function HistoryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}/history`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? 'Failed to load history');
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  function handleExportMd() {
    window.open(`/api/rooms/${roomId}/export?format=md`, '_blank');
  }

  function handleExportHtml() {
    window.open(`/api/rooms/${roomId}/export?format=html`, '_blank');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-400 dark:text-gray-500">Loading history…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <p className="text-red-500">{error ?? 'Unknown error'}</p>
          <Link href="/" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { room, cards, actionItems } = data;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{room.name}</h1>
            {room.closedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Closed on {formatDate(room.closedAt)}
              </span>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export MD
            </button>
            <button
              onClick={handleExportHtml}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export HTML
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{data.participantCount} participants</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{cards.length} cards</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{actionItems.length} action items</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Created {formatDate(room.createdAt)}</span>
        </div>

        {/* Board sections — read-only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SECTIONS.map((section) => {
            const sectionCards = cards.filter((c) => c.section === section);
            const styles = SECTION_STYLES[section];
            return (
              <div
                key={section}
                className={`flex flex-col rounded-xl border ${styles.border} bg-white dark:bg-gray-900 overflow-hidden shadow-sm`}
              >
                <div className={`${styles.header} px-4 py-3 flex items-center justify-between`}>
                  <h2 className="text-white font-semibold text-sm tracking-wide">
                    {SECTION_LABELS[section]}
                  </h2>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {sectionCards.length}
                  </span>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {sectionCards.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">No cards</p>
                  )}
                  {sectionCards.map((card) => (
                    <HistoryCard key={card.id} card={card} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action items */}
        {actionItems.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              Action Items ({actionItems.length})
            </h2>
            <ul className="space-y-2">
              {actionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    item.isCompleted
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {item.isCompleted && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`flex-1 ${item.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.description}
                    {item.assignee && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">→ {item.assignee}</span>
                    )}
                    {item.dueDate && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">due {item.dueDate}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

function HistoryCard({ card }: { card: CardDTOv2 }) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-2">
      <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
        {card.content}
      </p>

      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      {/* Reactions (read-only) */}
      {card.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.reactions.map((r) => (
            <span
              key={r.emoji}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              {r.emoji} {r.count}
            </span>
          ))}
        </div>
      )}

      {/* Drawings */}
      {card.drawings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.drawings.map((drawing) => (
            <DrawingThumbnail key={drawing.id} drawing={drawing} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 gap-2 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-2">
          {card.isRevealed && card.authorNickname && (
            <span>{card.authorNickname}</span>
          )}
          {card.voteCount > 0 && (
            <span className="flex items-center gap-0.5 text-rose-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {card.voteCount}
            </span>
          )}
        </div>
        {card.comments.length > 0 && (
          <button
            onClick={() => setCommentsOpen((p) => !p)}
            className="flex items-center gap-0.5 hover:text-indigo-500 transition"
            aria-expanded={commentsOpen}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.105-.895 2-2 2H7l-4 4V6c0-1.105.895-2 2-2h14c1.105 0 2 .895 2 2v10z" />
            </svg>
            {card.comments.length}
          </button>
        )}
      </div>

      {commentsOpen && card.comments.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {card.comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{comment.authorNickname}</span>
                <span className="text-gray-400 dark:text-gray-500">{formatDateTime(comment.createdAt)}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
