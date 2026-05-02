'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/ui/Aurora';
import {
  METRIC_DEFS,
  METRIC_DEFAULT_SCORE,
  METRIC_SCORE_MAX,
  METRIC_SCORE_MIN,
  type MetricAggregate,
  type MetricKey,
  type OwnMetricScores,
} from '@/lib/types';

interface MetricsPanelProps {
  metricsAggregate: MetricAggregate[];
  ownMetricScores: OwnMetricScores;
  onSubmit: (scores: OwnMetricScores) => void;
}

const SCORE_RANGE = METRIC_SCORE_MAX - METRIC_SCORE_MIN; // 9

function isPlainObject(o: unknown): o is Record<string, unknown> {
  return !!o && typeof o === 'object' && !Array.isArray(o);
}

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

/** Normalised 0..1 percentage from a 1..10 score. */
function pctFromScore(score: number | null): number {
  if (score == null) return 0;
  return ((score - METRIC_SCORE_MIN) / SCORE_RANGE) * 100;
}

function scoreEmoji(score: number | null): string {
  if (score == null) return '⚪️';
  if (score <= 3) return '😟';
  if (score <= 5) return '😐';
  if (score <= 7) return '🙂';
  if (score <= 9) return '😄';
  return '🤩';
}

export function MetricsPanel({ metricsAggregate, ownMetricScores, onSubmit }: MetricsPanelProps) {
  const totalSubmissions = useMemo(() => {
    if (!Array.isArray(metricsAggregate)) return 0;
    return metricsAggregate.reduce((max, m) => Math.max(max, m.submissions || 0), 0);
  }, [metricsAggregate]);

  const aggregateByKey = useMemo(() => {
    const map = new Map<MetricKey, MetricAggregate>();
    for (const m of metricsAggregate) map.set(m.metricKey, m);
    return map;
  }, [metricsAggregate]);

  const hasOwnScores = isPlainObject(ownMetricScores) && Object.keys(ownMetricScores).length > 0;

  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Record<MetricKey, number>>(() =>
    Object.fromEntries(
      METRIC_DEFS.map((d) => [d.key, ownMetricScores[d.key] ?? METRIC_DEFAULT_SCORE]),
    ) as Record<MetricKey, number>,
  );

  useEffect(() => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const def of METRIC_DEFS) {
        const incoming = ownMetricScores[def.key];
        if (typeof incoming === 'number' && incoming !== prev[def.key]) {
          next[def.key] = incoming;
        }
      }
      return next;
    });
  }, [ownMetricScores]);

  function handleSubmit() {
    const payload: OwnMetricScores = {};
    for (const def of METRIC_DEFS) payload[def.key] = draft[def.key];
    onSubmit(payload);
  }

  function handleSliderChange(key: MetricKey, value: number) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            boxShadow: '0 4px 14px oklch(0.62 0.20 285 / 0.30)',
          }}
        >
          📊
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Sprint metrics
          </div>
          <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
            Anonymous · scale 1–10 ·{' '}
            {totalSubmissions === 0
              ? 'no submissions yet'
              : `${totalSubmissions} submission${totalSubmissions === 1 ? '' : 's'}`}
            {hasOwnScores ? ' · you submitted' : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls="metrics-form"
          className="btn"
          style={{ fontSize: 12 }}
        >
          {expanded ? 'Hide my scores' : hasOwnScores ? 'Update my scores' : 'Submit my scores'}
          <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .18s' }}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Aggregate (always visible) */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {METRIC_DEFS.map((def) => {
          const agg = aggregateByKey.get(def.key);
          const avg = agg?.average ?? null;
          const subs = agg?.submissions ?? 0;
          const ownScore = ownMetricScores[def.key];
          const distribution = agg?.distribution ?? new Array(METRIC_SCORE_MAX).fill(0);
          return (
            <AggregateRow
              key={def.key}
              emoji={def.emoji}
              label={def.shortLabel}
              chineseLabel={def.label}
              tone={def.tone}
              average={avg}
              submissions={subs}
              distribution={distribution}
              ownScore={typeof ownScore === 'number' ? ownScore : null}
            />
          );
        })}
      </div>

      {expanded && (
        <div
          id="metrics-form"
          style={{
            padding: 18,
            borderTop: '1px solid var(--glass-border)',
            background: 'oklch(0.68 0.20 285 / 0.06)',
          }}
        >
          <div
            className="text-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
              color: 'var(--fg-2)',
            }}
          >
            Your private scores
          </div>
          <div className="fg-2" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
            Drag a slider to score each dimension from 1 to 10. Your individual scores stay private —
            only the team average and an anonymous histogram are shown to others.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {METRIC_DEFS.map((def) => (
              <SliderRow
                key={def.key}
                emoji={def.emoji}
                label={def.shortLabel}
                tone={def.tone}
                value={draft[def.key]}
                hasSubmitted={typeof ownMetricScores[def.key] === 'number'}
                onChange={(v) => handleSliderChange(def.key, v)}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              style={{ padding: '8px 16px' }}
            >
              {hasOwnScores ? 'Update anonymous scores' : 'Save anonymous scores'}
            </button>
            <span className="text-mono fg-3" style={{ fontSize: 11 }}>
              You can change these any time. Resubmitting overwrites your previous values.
            </span>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

interface AggregateRowProps {
  emoji: string;
  label: string;
  chineseLabel: string;
  tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
  average: number | null;
  submissions: number;
  distribution: number[];
  ownScore: number | null;
}

function AggregateRow({
  emoji,
  label,
  chineseLabel,
  tone,
  average,
  submissions,
  distribution,
  ownScore,
}: AggregateRowProps) {
  const tint = toneToColor(tone);
  const pct = pctFromScore(average);
  const ownPct = pctFromScore(ownScore);
  const maxBucket = Math.max(1, ...distribution);

  // Detect outliers — any score that's just one person far below or above the median.
  const lowOutlier = distribution.slice(0, 3).reduce((a, b) => a + b, 0); // scores 1–3
  const highOutlier = distribution.slice(-3).reduce((a, b) => a + b, 0); // scores 8–10
  const flagLow = submissions >= 3 && lowOutlier > 0 && lowOutlier <= Math.max(1, Math.round(submissions * 0.2));
  const flagHigh = submissions >= 3 && highOutlier > 0 && highOutlier <= Math.max(1, Math.round(submissions * 0.2));

  return (
    <div className="agg-row">
      <div className="agg-meta">
        <span className="agg-emoji" aria-hidden="true">{emoji}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span className="agg-label">{label}</span>
          <span className="agg-sublabel">{chineseLabel}</span>
        </div>
      </div>

      <div className="agg-track-wrap">
        <div
          className="agg-track"
          role="progressbar"
          aria-valuemin={METRIC_SCORE_MIN}
          aria-valuemax={METRIC_SCORE_MAX}
          aria-valuenow={average ?? 0}
          aria-label={`${label} team average ${average ?? 'no submissions'}${ownScore != null ? `, your score ${ownScore}` : ''}`}
        >
          <div
            className="agg-fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${tint}, var(--aurora-violet))`,
            }}
          />
          {ownScore != null && (
            <div
              className="agg-own-tick"
              style={{ left: `calc(${ownPct}% - 1px)` }}
              title={`Your score: ${ownScore}`}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="agg-histogram" aria-label={`Distribution of ${submissions} submissions`}>
          {distribution.map((count, i) => {
            const score = i + METRIC_SCORE_MIN;
            const h = (count / maxBucket) * 100;
            const empty = count === 0;
            return (
              <div
                key={score}
                className={'agg-bar ' + (empty ? 'agg-bar-empty' : '')}
                style={{
                  height: empty ? 4 : `max(6px, ${h}%)`,
                  background: empty
                    ? 'transparent'
                    : `linear-gradient(180deg, ${tint}, color-mix(in oklch, ${tint} 60%, transparent))`,
                }}
                title={`${score}: ${count}`}
              />
            );
          })}
        </div>
      </div>

      <div className="agg-readout">
        <span className="agg-score">
          <span aria-hidden="true" style={{ marginRight: 3 }}>{scoreEmoji(average)}</span>
          {average == null ? '—' : average.toFixed(1)}
        </span>
        <span className="agg-sub-meta">
          {ownScore != null ? `you · ${ownScore}` : `${submissions} sub${submissions === 1 ? '' : 's'}`}
        </span>
        {(flagLow || flagHigh) && submissions >= 3 && (
          <span
            className={'agg-outlier ' + (flagLow ? 'agg-outlier-low' : 'agg-outlier-high')}
            title={
              flagLow
                ? `Outlier: ${lowOutlier} low score${lowOutlier === 1 ? '' : 's'} (1–3)`
                : `Outlier: ${highOutlier} high score${highOutlier === 1 ? '' : 's'} (8–10)`
            }
          >
            {flagLow ? '⚠ low' : '★ high'}
          </span>
        )}
      </div>

      <style jsx>{`
        .agg-row {
          display: grid;
          grid-template-columns: 130px minmax(0, 1fr) 96px;
          align-items: center;
          gap: 14px;
        }
        .agg-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .agg-emoji {
          font-size: 18px;
          line-height: 1;
        }
        .agg-label {
          font-size: 13px;
          color: var(--fg-0);
          font-weight: 600;
          line-height: 1.1;
        }
        .agg-sublabel {
          font-size: 10.5px;
          color: var(--fg-3);
          font-family: var(--font-mono);
        }
        .agg-track-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .agg-track {
          position: relative;
          height: 8px;
          border-radius: 999px;
          background: var(--glass-border);
          overflow: hidden;
        }
        .agg-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.2, 0.7, 0.3, 1);
        }
        .agg-own-tick {
          position: absolute;
          top: -2px;
          width: 2px;
          height: calc(100% + 4px);
          background: var(--fg-0);
          box-shadow: 0 0 0 1px oklch(0 0 0 / 0.4);
          border-radius: 1px;
          pointer-events: none;
        }
        .agg-histogram {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          align-items: end;
          gap: 2px;
          height: 28px;
          padding: 0 1px;
        }
        .agg-bar {
          width: 100%;
          border-radius: 2px 2px 1px 1px;
          transition: height 0.4s cubic-bezier(0.2, 0.7, 0.3, 1);
        }
        .agg-bar-empty {
          background: var(--glass-border);
          opacity: 0.45;
        }
        .agg-readout {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          text-align: right;
        }
        .agg-score {
          font-size: 14px;
          color: var(--fg-0);
          font-weight: 700;
          font-family: var(--font-mono);
          line-height: 1.1;
          display: inline-flex;
          align-items: center;
        }
        .agg-sub-meta {
          font-size: 10.5px;
          color: var(--fg-3);
          font-family: var(--font-mono);
        }
        .agg-outlier {
          margin-top: 2px;
          font-size: 9.5px;
          font-family: var(--font-mono);
          padding: 1px 6px;
          border-radius: 999px;
          line-height: 1.4;
        }
        .agg-outlier-low {
          background: oklch(0.65 0.18 25 / 0.16);
          color: oklch(0.92 0.10 25);
          border: 1px solid oklch(0.65 0.18 25 / 0.30);
        }
        .agg-outlier-high {
          background: oklch(0.78 0.15 175 / 0.16);
          color: oklch(0.92 0.12 175);
          border: 1px solid oklch(0.78 0.15 175 / 0.30);
        }
      `}</style>
    </div>
  );
}

interface SliderRowProps {
  emoji: string;
  label: string;
  tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
  value: number;
  hasSubmitted: boolean;
  onChange: (v: number) => void;
}

function SliderRow({ emoji, label, tone, value, hasSubmitted, onChange }: SliderRowProps) {
  const tint = toneToColor(tone);
  const pct = pctFromScore(value);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 64px',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 16 }} aria-hidden="true">{emoji}</span>
        <span style={{ fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <input
        type="range"
        min={METRIC_SCORE_MIN}
        max={METRIC_SCORE_MAX}
        step={1}
        value={value}
        aria-label={`Your ${label} score`}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          width: '100%',
          accentColor: tint,
          height: 22,
          background: `linear-gradient(90deg, ${tint} 0%, ${tint} ${pct}%, var(--glass-border) ${pct}%, var(--glass-border) 100%)`,
          borderRadius: 999,
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
        }}
      />
      <div style={{ textAlign: 'right' }}>
        <div
          className="text-mono"
          style={{
            fontSize: 16,
            color: 'var(--fg-0)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span aria-hidden="true">{scoreEmoji(value)}</span>
          {value}
        </div>
        {hasSubmitted && (
          <div className="text-mono fg-3" style={{ fontSize: 10 }}>
            saved
          </div>
        )}
      </div>
    </div>
  );
}
