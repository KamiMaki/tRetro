'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CardDTOv2, Tag, ActionItem, Room } from '@/lib/types';
import { SECTIONS, SECTION_LABELS } from '@/lib/types';
import { TagBadge } from '@/components/board/TagBadge';
import { DrawingThumbnail } from '@/components/board/DrawingThumbnail';
import { AuroraBg, GlassPanel, Logo, Avatar } from '@/components/ui/Aurora';

interface HistoryData {
  room: Room;
  cards: CardDTOv2[];
  tags: Tag[];
  actionItems: ActionItem[];
  participantCount: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SECTION_META: Record<string, { tone: 'mint' | 'pink' | 'amber' | 'violet'; symbol: string }> = {
  'went-well':  { tone: 'mint',   symbol: '✓' },
  'to-improve': { tone: 'pink',   symbol: '!' },
  'thanks':     { tone: 'amber',  symbol: '★' },
  'deep-dive':  { tone: 'violet', symbol: '?' },
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
      <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', isolation: 'isolate' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Logo size={28} />
          <div className="text-mono fg-2" style={{ fontSize: 12, marginTop: 14 }}>Loading history…</div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', isolation: 'isolate' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ color: 'oklch(0.85 0.14 25)', marginBottom: 12 }}>{error ?? 'Unknown error'}</div>
          <Link href="/" className="btn">← Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const { room, cards, actionItems, tags } = data;

  return (
    <main style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <AuroraBg />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top bar */}
        <header
          style={{
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
          <Link href="/" className="btn btn-ghost">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M10 3l-5 5 5 5" />
            </svg>
            Dashboard
          </Link>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={handleExportMd}>Export MD</button>
          <button type="button" className="btn" onClick={handleExportHtml}>Export HTML</button>
        </header>

        <div style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1600, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Hero */}
          <div>
            <div className="text-mono fg-3" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Retro · history
            </div>
            <h1 className="text-display aurora-text" style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: 0, lineHeight: 1.1, fontWeight: 600 }}>
              {room.name}
            </h1>
            {room.closedAt && (
              <div className="text-mono fg-2" style={{ marginTop: 8, fontSize: 12 }}>
                Closed on {formatDate(room.closedAt)}
              </div>
            )}
          </div>

          {/* Stats */}
          <GlassPanel style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <Stat label="Participants" value={data.participantCount} />
            <Stat label="Cards" value={cards.length} />
            <Stat label="Action items" value={actionItems.length} />
            <Stat label="Tags" value={tags.length} />
            <div style={{ flex: 1 }} />
            <Stat label="Created" value={formatDate(room.createdAt)} />
          </GlassPanel>

          {/* Board sections */}
          <div className="history-grid">
            {SECTIONS.map((section) => {
              const sectionCards = cards.filter((c) => c.section === section);
              const meta = SECTION_META[section];
              return (
                <div key={section} className="col" data-col={section} style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
                  <GlassPanel style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="col-header">
                      <div className="col-icon" aria-hidden="true">{meta.symbol}</div>
                      <div style={{ flex: 1 }}>
                        <div className="text-display" style={{ fontSize: 14, fontWeight: 600 }}>
                          {SECTION_LABELS[section]}
                        </div>
                        <div className="text-mono fg-3" style={{ fontSize: 11 }}>
                          {sectionCards.length} card{sectionCards.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '14px 12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sectionCards.length === 0 ? (
                        <div className="fg-3 text-mono" style={{ textAlign: 'center', fontSize: 12, padding: '32px 0', opacity: 0.6 }}>no cards</div>
                      ) : (
                        sectionCards.map((card) => <HistoryCard key={card.id} card={card} tone={meta.tone} />)
                      )}
                    </div>
                  </GlassPanel>
                </div>
              );
            })}
          </div>

          {/* Action items */}
          {actionItems.length > 0 && (
            <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
                  Action items <span className="fg-2" style={{ fontSize: 13, fontWeight: 400 }}>· {actionItems.length}</span>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {actionItems.map((item) => (
                  <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                        background: item.isCompleted ? 'var(--aurora-mint)' : 'transparent',
                        border: '1px solid ' + (item.isCompleted ? 'var(--aurora-mint)' : 'var(--glass-border)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {item.isCompleted && (
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="oklch(0.15 0.04 270)" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-7" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: item.isCompleted ? 'var(--fg-3)' : 'var(--fg-0)',
                          textDecoration: item.isCompleted ? 'line-through' : 'none',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </div>
                      <div className="text-mono fg-2" style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {item.assignee && <span>→ {item.assignee}</span>}
                        {item.dueDate && <span>due {item.dueDate}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )}
        </div>
      </div>

      <style jsx>{`
        .history-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 720px) {
          .history-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1280px) {
          .history-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-mono fg-3" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div className="text-display fg-0" style={{ fontSize: 18, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

function HistoryCard({ card, tone }: { card: CardDTOv2; tone: 'mint' | 'pink' | 'amber' | 'violet' }) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className="sticky-card" data-tone={tone}>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--fg-0)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 8 }}>
        {card.content}
      </div>
      {card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {card.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}
      {card.reactions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {card.reactions.map((r) => (
            <span
              key={r.emoji}
              className="text-mono"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 999, fontSize: 11,
                background: 'var(--glass-highlight)',
                border: '1px solid var(--glass-border)',
                color: 'var(--fg-1)',
              }}
            >
              <span style={{ fontSize: 12 }}>{r.emoji}</span>{r.count}
            </span>
          ))}
        </div>
      )}
      {card.drawings.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {card.drawings.map((drawing) => (
            <DrawingThumbnail key={drawing.id} drawing={drawing} />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)', fontSize: 11 }}>
        <Avatar
          name={card.authorNickname}
          anon={!card.isRevealed}
          size={18}
        />
        <span className="text-mono fg-2">
          {card.isRevealed && card.authorNickname ? card.authorNickname : 'anonymous'}
        </span>
        <div style={{ flex: 1 }} />
        {card.voteCount > 0 && (
          <span className="text-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'oklch(0.92 0.10 350)' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3 6.5a3 3 0 015 0L8 7l.5-.5a3 3 0 115 4L8 14 3 10.5a3 3 0 010-4z" />
            </svg>
            {card.voteCount}
          </span>
        )}
        {card.comments.length > 0 && (
          <button
            type="button"
            onClick={() => setCommentsOpen((p) => !p)}
            aria-expanded={commentsOpen}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 6px', borderRadius: 999, fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'var(--glass-highlight)', color: 'var(--fg-2)',
              border: '1px solid var(--glass-border)', cursor: 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 4h10v6H8l-3 3v-3H3z" />
            </svg>
            {card.comments.length}
          </button>
        )}
      </div>
      {commentsOpen && card.comments.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {card.comments.map((comment) => (
            <div key={comment.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--glass-highlight)' }}>
              <div className="text-mono" style={{ fontSize: 10, marginBottom: 2, color: 'var(--fg-2)' }}>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{comment.authorNickname}</span>
                <span style={{ color: 'var(--fg-3)' }}> · {formatDateTime(comment.createdAt)}</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--fg-0)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
