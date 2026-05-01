/**
 * Vote-consensus utilities — keep anonymous, only show aggregate ratios.
 *
 * Rules:
 *   - >= 70%   strong consensus  → mint
 *   - 40–70%  mixed signal       → amber
 *   - < 40%   weak / no signal   → neutral
 *
 * Denominator is the number of participants in the room (regardless of
 * online status), capped at >=1 to avoid division by zero. We never
 * reveal individual voters.
 */

export type ConsensusLevel = 'strong' | 'mixed' | 'weak';

export interface ConsensusResult {
  pct: number; // 0–100
  level: ConsensusLevel;
  label: string; // e.g. "8/12 · 67%"
}

export function computeConsensus(
  voteCount: number,
  denominator: number,
): ConsensusResult {
  const denom = Math.max(1, denominator);
  const ratio = Math.min(1, voteCount / denom);
  const pct = Math.round(ratio * 100);
  const level: ConsensusLevel =
    pct >= 70 ? 'strong' : pct >= 40 ? 'mixed' : 'weak';
  return {
    pct,
    level,
    label: `${voteCount}/${denom} · ${pct}%`,
  };
}
