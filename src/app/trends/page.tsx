'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  METRIC_DEFS,
  METRIC_SCORE_MAX,
  METRIC_SCORE_MIN,
  type MetricAggregate,
  type MetricKey,
  type MetricsHistoryEntry,
} from '@/lib/types';
import { AuroraBg, GlassPanel, Logo } from '@/components/ui/Aurora';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function toneToColor(tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber'): string {
  switch (tone) {
    case 'mint':
      return 'oklch(0.78 0.15 175)';
    case 'cyan':
      return 'oklch(0.72 0.13 210)';
    case 'violet':
      return 'oklch(0.62 0.20 285)';
    case 'pink':
      return 'oklch(0.72 0.14 350)';
    case 'amber':
      return 'oklch(0.78 0.14 75)';
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TrendsPage() {
  const [history, setHistory] = useState<MetricsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/metrics/history?limit=50')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load metrics history');
        return res.json();
      })
      .then((body) => {
        const entries: MetricsHistoryEntry[] = Array.isArray(body?.history) ? body.history : [];
        setHistory(entries);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load trends'))
      .finally(() => setLoading(false));
  }, []);

  // Order oldest → newest so the trend reads left-to-right.
  const ordered = useMemo(
    () => [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [history],
  );

  const submissionTotal = useMemo(
    () =>
      ordered.reduce((acc, entry) => {
        const max = entry.metrics.reduce((m, x) => Math.max(m, x.submissions || 0), 0);
        return acc + max;
      }, 0),
    [ordered],
  );

  return (
    <main style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <AuroraBg />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header
          style={{
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
          <Link href="/" className="btn btn-ghost">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M10 3l-5 5 5 5" />
            </svg>
            Dashboard
          </Link>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
        </header>

        <div style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1400, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="text-mono fg-3" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sprint metrics
            </div>
            <h1 className="text-display aurora-text" style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: 0, lineHeight: 1.1, fontWeight: 600 }}>
              Trends across all retros
            </h1>
            <div className="text-mono fg-2" style={{ marginTop: 8, fontSize: 12 }}>
              {loading
                ? 'Loading metrics history…'
                : error
                  ? error
                  : ordered.length === 0
                    ? 'No metric submissions yet.'
                    : `${ordered.length} retro${ordered.length === 1 ? '' : 's'} · ${submissionTotal} total submission${submissionTotal === 1 ? '' : 's'} · oldest left → newest right`}
            </div>
          </div>

          {!loading && !error && ordered.length > 0 && (
            <>
              <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
                    Per-metric trend
                  </div>
                  <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
                    Anonymous team average per retro. Empty dots = no submissions for that metric in that retro.
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {METRIC_DEFS.map((def) => (
                    <MetricTrendRow key={def.key} def={def} entries={ordered} />
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
                    Retro log
                  </div>
                  <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
                    Most recent first. Click a row to open the retro.
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Retro</Th>
                        {METRIC_DEFS.map((def) => (
                          <Th key={def.key} center>
                            <span aria-hidden="true" style={{ marginRight: 4 }}>{def.emoji}</span>
                            {def.shortLabel}
                          </Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ordered].reverse().map((entry) => (
                        <RetroRow key={entry.roomId} entry={entry} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th
      className="text-mono fg-3"
      style={{
        textAlign: center ? 'center' : 'left',
        padding: '10px 14px',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 500,
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-highlight)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function RetroRow({ entry }: { entry: MetricsHistoryEntry }) {
  const byKey = new Map<MetricKey, MetricAggregate>();
  for (const m of entry.metrics) byKey.set(m.metricKey, m);
  return (
    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--fg-2)' }}>
        {fullDate(entry.createdAt)}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <Link
          href={`/room/${entry.roomId}/history`}
          style={{ color: 'var(--fg-0)', textDecoration: 'none', fontWeight: 500 }}
        >
          {entry.roomName}
        </Link>
      </td>
      {METRIC_DEFS.map((def) => {
        const m = byKey.get(def.key);
        const v = m?.average ?? null;
        return (
          <td
            key={def.key}
            style={{
              padding: '10px 14px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: v == null ? 'var(--fg-3)' : 'var(--fg-0)',
            }}
          >
            {v == null ? '—' : v.toFixed(1)}
          </td>
        );
      })}
    </tr>
  );
}

function MetricTrendRow({
  def,
  entries,
}: {
  def: (typeof METRIC_DEFS)[number];
  entries: MetricsHistoryEntry[];
}) {
  const tint = toneToColor(def.tone);
  const points = entries.map((e) => {
    const m = e.metrics.find((x) => x.metricKey === def.key);
    return { date: e.createdAt, roomName: e.roomName, value: m?.average ?? null };
  });
  const valid = points.filter((p) => p.value != null) as Array<{ date: string; roomName: string; value: number }>;
  const latest = valid.length > 0 ? valid[valid.length - 1] : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 220px) 1fr',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">{def.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: 'var(--fg-0)' }}>{def.label}</div>
            <div className="text-mono fg-3" style={{ fontSize: 10 }}>
              {def.shortLabel} · {valid.length === 0 ? 'no data' : `latest ${latest!.value.toFixed(1)}`}
            </div>
          </div>
        </div>
      </div>

      <SparklineChart points={points} color={tint} />
    </div>
  );
}

function SparklineChart({
  points,
  color,
}: {
  points: Array<{ date: string; roomName: string; value: number | null }>;
  color: string;
}) {
  if (points.length === 0) {
    return (
      <div className="text-mono fg-3" style={{ fontSize: 11 }}>
        no data
      </div>
    );
  }

  const W = 600;
  const H = 60;
  const PAD_X = 8;
  const PAD_Y = 8;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const range = METRIC_SCORE_MAX - METRIC_SCORE_MIN;

  const xFor = (i: number) => {
    if (points.length === 1) return W / 2;
    return PAD_X + (innerW * i) / (points.length - 1);
  };
  const yFor = (v: number) => {
    const t = (v - METRIC_SCORE_MIN) / range;
    return H - PAD_Y - innerH * t;
  };

  // Build path through valid points only — gaps for nulls.
  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.value == null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      continue;
    }
    const cmd = current.length === 0 ? 'M' : 'L';
    current.push(`${cmd} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`);
  }
  if (current.length > 1) segments.push(current.join(' '));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 60, display: 'block' }}
      role="img"
      aria-label="metric trend sparkline"
    >
      {/* baseline */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={H - PAD_Y}
        y2={H - PAD_Y}
        stroke="var(--glass-border)"
        strokeWidth={1}
      />
      {/* mid-score reference */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={yFor((METRIC_SCORE_MIN + METRIC_SCORE_MAX) / 2)}
        y2={yFor((METRIC_SCORE_MIN + METRIC_SCORE_MAX) / 2)}
        stroke="var(--glass-border)"
        strokeWidth={0.5}
        strokeDasharray="3 4"
        opacity={0.4}
      />
      {/* line segments */}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* dots */}
      {points.map((p, i) => (
        <circle
          key={p.date + i}
          cx={xFor(i)}
          cy={p.value == null ? H - PAD_Y : yFor(p.value)}
          r={p.value == null ? 2.4 : 3}
          fill={p.value == null ? 'transparent' : color}
          stroke={p.value == null ? 'var(--glass-border)' : 'transparent'}
          strokeWidth={1}
        >
          <title>{`${p.roomName} · ${shortDate(p.date)} · ${p.value == null ? 'no data' : p.value.toFixed(1)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
