'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/ui/Aurora';
import {
  METRIC_DEFS,
  type MetricAggregate,
  type MetricKey,
  type OwnMetricScores,
} from '@/lib/types';

interface MetricsPanelProps {
  metricsAggregate: MetricAggregate[];
  ownMetricScores: OwnMetricScores;
  onSubmit: (scores: OwnMetricScores) => void;
}

const DEFAULT_SCORE = 70;

function isPlainObject(o: unknown): o is Record<string, unknown> {
  return !!o && typeof o === 'object' && !Array.isArray(o);
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
      METRIC_DEFS.map((d) => [d.key, ownMetricScores[d.key] ?? DEFAULT_SCORE]),
    ) as Record<MetricKey, number>,
  );

  // Re-sync draft when server-side own scores change (e.g. after first submit
  // or when reconnecting to a room you've already submitted to).
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
      {/* Header */}
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
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
          }}
        >
          📊
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Sprint metrics
          </div>
          <div className="text-mono fg-3" style={{ fontSize: 11, marginTop: 2 }}>
            Anonymous · team average only ·{' '}
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
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {METRIC_DEFS.map((def) => {
          const agg = aggregateByKey.get(def.key);
          const avg = agg?.average ?? null;
          const subs = agg?.submissions ?? 0;
          return (
            <AggregateRow
              key={def.key}
              emoji={def.emoji}
              label={def.label}
              shortLabel={def.shortLabel}
              tone={def.tone}
              average={avg}
              submissions={subs}
            />
          );
        })}
      </div>

      {/* Own form (private) */}
      {expanded && (
        <div
          id="metrics-form"
          style={{
            padding: 16,
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
            Drag a slider to score each dimension from 1 to 100. Your individual
            scores stay private — only the team average is ever shown to others.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {METRIC_DEFS.map((def) => (
              <SliderRow
                key={def.key}
                emoji={def.emoji}
                label={def.label}
                shortLabel={def.shortLabel}
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

interface AggregateRowProps {
  emoji: string;
  label: string;
  shortLabel: string;
  tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
  average: number | null;
  submissions: number;
}

function AggregateRow({ emoji, label, shortLabel, tone, average, submissions }: AggregateRowProps) {
  const pct = average == null ? 0 : Math.max(0, Math.min(100, average));
  const tint = toneToColor(tone);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 70px',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 14 }} aria-hidden="true">
          {emoji}
        </span>
        <span style={{ fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <div
        className="bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={average ?? 0}
        aria-label={`${shortLabel} team average ${average ?? 'no submissions'}`}
        style={{ position: 'relative' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 'inherit',
            background: `linear-gradient(90deg, ${tint}, var(--aurora-violet))`,
            transition: 'width 0.6s cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="text-mono" style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 600 }}>
          {average == null ? '—' : average.toFixed(1)}
        </div>
        <div className="text-mono fg-3" style={{ fontSize: 10 }}>
          {submissions} sub
          {submissions === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

interface SliderRowProps {
  emoji: string;
  label: string;
  shortLabel: string;
  tone: 'mint' | 'cyan' | 'violet' | 'pink' | 'amber';
  value: number;
  hasSubmitted: boolean;
  onChange: (v: number) => void;
}

function SliderRow({ emoji, label, shortLabel, tone, value, hasSubmitted, onChange }: SliderRowProps) {
  const tint = toneToColor(tone);
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 60px',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 14 }} aria-hidden="true">
          {emoji}
        </span>
        <span style={{ fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        step={1}
        value={value}
        aria-label={`Your ${shortLabel} score`}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          width: '100%',
          accentColor: tint,
          height: 20,
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
            fontSize: 13,
            color: 'var(--fg-0)',
            fontWeight: 600,
          }}
        >
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
