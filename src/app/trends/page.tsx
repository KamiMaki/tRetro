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

type Tone = 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';

function toneToColor(tone: Tone): string {
  switch (tone) {
    case 'mint':   return 'oklch(0.82 0.16 175)';
    case 'cyan':   return 'oklch(0.78 0.14 210)';
    case 'violet': return 'oklch(0.68 0.20 285)';
    case 'pink':   return 'oklch(0.82 0.12 350)';
    case 'amber':  return 'oklch(0.85 0.14 75)';
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

        <div
          style={{
            padding: 'clamp(20px, 3vw, 32px)',
            maxWidth: 1400,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
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
              {/* Summary cards — one per metric, latest avg + sparkline + delta */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {METRIC_DEFS.map((def) => (
                  <MetricSummaryCard key={def.key} def={def} entries={ordered} />
                ))}
              </div>

              {/* Big per-metric trend panel — gradient bar + glow sparkline */}
              <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
                    Per-metric trend
                  </div>
                  <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
                    Anonymous team average per retro. Hollow dots mean nobody submitted that metric in that retro.
                  </div>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {METRIC_DEFS.map((def) => (
                    <MetricTrendRow key={def.key} def={def} entries={ordered} />
                  ))}
                </div>
              </GlassPanel>

              {/* Retro log table */}
              <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
                    Retro log
                  </div>
                  <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
                    Most recent first. Click a row to open the retro&apos;s read-only history view.
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

function MetricSummaryCard({
  def,
  entries,
}: {
  def: (typeof METRIC_DEFS)[number];
  entries: MetricsHistoryEntry[];
}) {
  const tint = toneToColor(def.tone as Tone);
  const valid = entries
    .map((e) => e.metrics.find((m) => m.metricKey === def.key)?.average ?? null)
    .filter((v): v is number => v != null);

  const latest = valid.length > 0 ? valid[valid.length - 1] : null;
  const prev = valid.length > 1 ? valid[valid.length - 2] : null;
  const delta = latest != null && prev != null ? latest - prev : null;
  const pct = latest != null ? Math.max(4, Math.min(100, ((latest - METRIC_SCORE_MIN) / (METRIC_SCORE_MAX - METRIC_SCORE_MIN)) * 100)) : 0;

  const deltaTone =
    delta == null ? 'var(--fg-3)' :
    delta > 0.1 ? 'oklch(0.82 0.16 175)' :
    delta < -0.1 ? 'oklch(0.78 0.18 25)' :
    'var(--fg-2)';

  return (
    <GlassPanel style={{ padding: 14, position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${tint} 0%, transparent 65%)`,
          filter: 'blur(18px)',
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
        <span style={{ fontSize: 18 }} aria-hidden="true">{def.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.label}</div>
          <div className="text-mono fg-3" style={{ fontSize: 10 }}>{def.shortLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8, position: 'relative' }}>
        <span className="text-display" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--fg-0)' }}>
          {latest == null ? '—' : latest.toFixed(1)}
        </span>
        <span className="text-mono fg-3" style={{ fontSize: 10 }}>/ {METRIC_SCORE_MAX}</span>
        <div style={{ flex: 1 }} />
        {delta != null && (
          <span
            className="text-mono"
            style={{ fontSize: 11, color: deltaTone, display: 'inline-flex', alignItems: 'center', gap: 2 }}
            title={`Change vs previous retro: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
              {delta > 0.1 ? (
                <path d="M4 1l3 4H1z" />
              ) : delta < -0.1 ? (
                <path d="M4 7L1 3h6z" />
              ) : (
                <rect x="1" y="3.4" width="6" height="1.2" rx="0.6" />
              )}
            </svg>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        )}
      </div>

      {/* Gradient bar */}
      <div className="bar-track" style={{ height: 8, borderRadius: 4, position: 'relative' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            background: `linear-gradient(90deg, ${tint}, color-mix(in oklch, ${tint} 60%, var(--aurora-violet)))`,
            boxShadow: `0 0 12px ${tint}`,
            transition: 'width .6s cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        />
      </div>
    </GlassPanel>
  );
}

function MetricTrendRow({
  def,
  entries,
}: {
  def: (typeof METRIC_DEFS)[number];
  entries: MetricsHistoryEntry[];
}) {
  const tint = toneToColor(def.tone as Tone);
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
        gridTemplateColumns: 'minmax(160px, 220px) 1fr 64px',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: tint,
            opacity: 0.9,
            color: 'oklch(0.18 0.04 270)',
            fontSize: 14,
            boxShadow: `0 0 16px ${tint}`,
          }}
        >
          {def.emoji}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--fg-0)' }}>{def.label}</div>
          <div className="text-mono fg-3" style={{ fontSize: 10 }}>
            {def.shortLabel} · {valid.length} sample{valid.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <SparklineChart points={points} color={tint} />

      <div className="text-mono text-display" style={{ fontSize: 18, textAlign: 'right', color: latest ? 'var(--fg-0)' : 'var(--fg-3)' }}>
        {latest ? latest.value.toFixed(1) : '—'}
      </div>
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

  const xFor = (i: number) => (points.length === 1 ? W / 2 : PAD_X + (innerW * i) / (points.length - 1));
  const yFor = (v: number) => H - PAD_Y - innerH * ((v - METRIC_SCORE_MIN) / range);

  // Stroke segments through valid points (gaps allow nulls).
  const segments: string[] = [];
  let cur: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.value == null) {
      if (cur.length > 1) segments.push(cur.join(' '));
      cur = [];
      continue;
    }
    const cmd = cur.length === 0 ? 'M' : 'L';
    cur.push(`${cmd} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`);
  }
  if (cur.length > 1) segments.push(cur.join(' '));

  // Build an area path under the line for a subtle fill.
  let areaPath = '';
  for (let i = 0; i < points.length; i++) {
    const v = points[i].value;
    if (v == null) continue;
    areaPath += `${areaPath ? 'L' : 'M'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)} `;
  }
  if (areaPath) {
    // close to baseline at right then back left
    const validIdx = points
      .map((p, i) => (p.value == null ? -1 : i))
      .filter((i) => i >= 0);
    const lastIdx = validIdx[validIdx.length - 1];
    const firstIdx = validIdx[0];
    areaPath += `L ${xFor(lastIdx).toFixed(1)} ${(H - PAD_Y).toFixed(1)} L ${xFor(firstIdx).toFixed(1)} ${(H - PAD_Y).toFixed(1)} Z`;
  }

  const gradId = `sp-grad-${color.replace(/[^a-z0-9]/gi, '')}`;
  const fillGradId = `sp-fill-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 60, display: 'block' }}
      role="img"
      aria-label="metric trend sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.40" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* mid-score reference line */}
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
      {areaPath && <path d={areaPath} fill={`url(#${fillGradId})`} />}
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      ))}
      {points.map((p, i) => (
        <circle
          key={p.date + i}
          cx={xFor(i)}
          cy={p.value == null ? H - PAD_Y : yFor(p.value)}
          r={p.value == null ? 2.6 : 3.4}
          fill={p.value == null ? 'transparent' : color}
          stroke={p.value == null ? 'var(--glass-border)' : 'oklch(1 0 0 / 0.85)'}
          strokeWidth={p.value == null ? 1 : 1.4}
        >
          <title>{`${p.roomName} · ${shortDate(p.date)} · ${p.value == null ? 'no data' : p.value.toFixed(1)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
