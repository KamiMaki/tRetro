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
  { label: '無計時', sec: null },
  { label: '3 分', sec: 3 * 60 },
  { label: '5 分', sec: 5 * 60 },
  { label: '10 分', sec: 10 * 60 },
  { label: '15 分', sec: 15 * 60 },
];

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '時間到';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PhaseBar({ phaseState, isScrumMaster, onSetPhase }: PhaseBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!phaseState.durationSec) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phaseState.durationSec, phaseState.startedAt]);

  let remaining: number | null = null;
  if (phaseState.durationSec) {
    const startMs = new Date(phaseState.startedAt).getTime();
    const elapsedSec = Math.floor((now - startMs) / 1000);
    remaining = Math.max(0, phaseState.durationSec - elapsedSec);
  }

  return (
    <div className="phase-bar" role="region" aria-label="目前的 retro 階段">
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
              title={isScrumMaster ? `切換到 ${PHASE_LABELS[p]}` : `目前階段：${PHASE_LABELS[phaseState.phase]}`}
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
          <div className="phase-timer-quick" aria-label="快速計時">
            {QUICK_DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => onSetPhase(phaseState.phase, d.sec)}
                className="phase-timer-btn"
                title={`為 ${PHASE_LABELS[phaseState.phase]} 設定 ${d.label} 計時`}
              >
                {d.label}
              </button>
            ))}
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
      `}</style>
    </div>
  );
}
