'use client';

import { useEffect, useState } from 'react';
import {
  PHASE_LABELS,
  PHASE_EMOJI,
  PHASE_ORDER,
  type RoomPhase,
  type RoomPhaseState,
} from '@/lib/types';

interface PhaseBarProps {
  phaseState: RoomPhaseState;
  isScrumMaster: boolean;
  onSetPhase: (phase: RoomPhase, durationSec?: number | null) => void;
}

const QUICK_DURATIONS: Array<{ label: string; sec: number | null }> = [
  { label: 'No timer', sec: null },
  { label: '3', sec: 3 * 60 },
  { label: '5', sec: 5 * 60 },
  { label: '10', sec: 10 * 60 },
  { label: '15', sec: 15 * 60 },
];

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Time's up";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PhaseBar({ phaseState, isScrumMaster, onSetPhase }: PhaseBarProps) {
  // We don't store `now` in state; we just bump a tick counter every second
  // to force a re-render. Remaining is computed from Date.now() at render
  // time so the first paint after a phase change is correct (no off-by-one).
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!phaseState.durationSec) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phaseState.durationSec, phaseState.startedAt]);

  let remaining: number | null = null;
  if (phaseState.durationSec) {
    const startMs = new Date(phaseState.startedAt).getTime();
    const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
    remaining = Math.max(0, phaseState.durationSec - elapsedSec);
  }

  const [customMinutes, setCustomMinutes] = useState('');
  function handleCustomTimer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customMinutes.trim();
    if (!trimmed) return;
    const minutes = Number(trimmed);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return;
    onSetPhase(phaseState.phase, Math.round(minutes * 60));
    setCustomMinutes('');
  }

  return (
    <div className="phase-bar" role="region" aria-label="Retro phase timer">
      <div className="phase-bar-label">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="9" r="5.5" />
          <path d="M8 6v3l2 1.5" />
          <path d="M6 1.5h4" />
        </svg>
        <span>Timer</span>
      </div>

      <div className="phase-stages" role="tablist">
        {PHASE_ORDER.filter((p) => p !== 'closed').map((p) => {
          const isActive = p === phaseState.phase;
          const stageIndex = PHASE_ORDER.indexOf(p);
          const activeIndex = PHASE_ORDER.indexOf(phaseState.phase);
          const isPast = stageIndex < activeIndex;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!isScrumMaster}
              onClick={() => onSetPhase(p)}
              className={
                'phase-pill ' +
                (isActive ? 'phase-pill-active' : isPast ? 'phase-pill-past' : '')
              }
              title={isScrumMaster ? `Switch to ${PHASE_LABELS[p]}` : `Current phase: ${PHASE_LABELS[phaseState.phase]}`}
            >
              <span aria-hidden="true">{PHASE_EMOJI[p]}</span>
              <span>{PHASE_LABELS[p]}</span>
            </button>
          );
        })}
      </div>

      <div className="phase-meta">
        {remaining != null && (
          <span
            className="text-mono"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: remaining <= 30 ? 'oklch(0.85 0.14 25)' : 'var(--fg-0)',
              padding: '4px 10px',
              borderRadius: 8,
              background: remaining <= 30 ? 'oklch(0.65 0.18 25 / 0.16)' : 'var(--glass-highlight)',
              border: '1px solid ' + (remaining <= 30 ? 'oklch(0.65 0.18 25 / 0.32)' : 'var(--glass-border)'),
            }}
            aria-live="polite"
          >
            {formatRemaining(remaining)}
          </span>
        )}

        {isScrumMaster && (
          <div className="phase-timer-quick" aria-label="Quick timer presets">
            {QUICK_DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => onSetPhase(phaseState.phase, d.sec)}
                className="phase-timer-btn"
                title={
                  d.sec == null
                    ? `Stop timer for ${PHASE_LABELS[phaseState.phase]}`
                    : `Set ${d.sec / 60} min timer for ${PHASE_LABELS[phaseState.phase]}`
                }
              >
                {d.label}
                {d.sec != null && <span style={{ opacity: 0.6, marginLeft: 1 }}>m</span>}
              </button>
            ))}
            <form onSubmit={handleCustomTimer} className="phase-custom-timer">
              <input
                type="number"
                min={1}
                max={600}
                step={1}
                inputMode="numeric"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="min"
                aria-label="Custom timer minutes"
                title="Enter custom timer in minutes (1–600)"
              />
              <button
                type="submit"
                disabled={!customMinutes.trim()}
                title="Start custom timer"
              >
                ▶
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .phase-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }
        .phase-bar-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--fg-2);
          padding-right: 4px;
          border-right: 1px solid var(--glass-border);
          margin-right: 4px;
          height: 22px;
        }
        .phase-stages {
          display: inline-flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .phase-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--fg-2);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .phase-pill:disabled {
          cursor: default;
        }
        .phase-pill:hover:not(:disabled):not(.phase-pill-active) {
          background: var(--glass-highlight);
          color: var(--fg-0);
        }
        .phase-pill-active {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
          border-color: var(--aurora-violet);
          box-shadow: 0 0 0 3px oklch(0.68 0.20 285 / 0.18);
        }
        .phase-pill-past {
          color: var(--fg-3);
        }
        .phase-meta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          flex-wrap: wrap;
        }
        .phase-timer-quick {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px;
          background: var(--glass-highlight);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
        }
        .phase-timer-btn {
          padding: 4px 10px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--fg-2);
          background: transparent;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .phase-timer-btn:hover {
          background: var(--glass-bg-strong);
          color: var(--fg-0);
        }
        .phase-custom-timer {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 0 0 0 6px;
          margin-left: 2px;
          border-left: 1px solid var(--glass-border);
        }
        .phase-custom-timer input {
          width: 44px;
          padding: 4px 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--fg-0);
          background: transparent;
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          outline: none;
          transition: border-color 0.15s;
        }
        .phase-custom-timer input:focus {
          border-color: var(--aurora-violet);
        }
        .phase-custom-timer input::-webkit-outer-spin-button,
        .phase-custom-timer input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .phase-custom-timer button {
          padding: 4px 10px;
          font-size: 11px;
          color: var(--fg-1);
          background: transparent;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .phase-custom-timer button:hover:not(:disabled) {
          background: var(--aurora-violet);
          color: #fff;
        }
        .phase-custom-timer button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
