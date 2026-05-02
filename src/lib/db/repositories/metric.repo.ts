import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import {
  METRIC_KEYS,
  METRIC_SCORE_MIN,
  METRIC_SCORE_MAX,
  type MetricAggregate,
  type MetricKey,
  type MetricsHistoryEntry,
  type OwnMetricScores,
} from '../../types';

interface AggregateRow {
  metric_key: string;
  avg_score: number | null;
  submission_count: number;
}

interface DistributionRow {
  metric_key: string;
  score: number;
  count: number;
}

interface OwnRow {
  metric_key: string;
  score: number;
}

interface HistoryAggregateRow {
  room_id: string;
  room_name: string;
  created_at: string;
  closed_at: string | null;
  metric_key: string;
  avg_score: number | null;
  submission_count: number;
}

const KEY_SET: ReadonlySet<MetricKey> = new Set(METRIC_KEYS);

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return METRIC_SCORE_MIN;
  return Math.max(METRIC_SCORE_MIN, Math.min(METRIC_SCORE_MAX, Math.round(value)));
}

function zeroDistribution(): number[] {
  return new Array(METRIC_SCORE_MAX).fill(0);
}

function emptyAggregate(): MetricAggregate[] {
  return METRIC_KEYS.map((metricKey) => ({
    metricKey,
    average: null,
    submissions: 0,
    distribution: zeroDistribution(),
  }));
}

export const metricRepo = {
  /**
   * Upsert one participant's scores for a room.
   * `participantId` is consumed for dedup ONLY — it never leaves the server.
   * Unknown metric keys are silently ignored.
   * Returns the metrics that were actually written so the caller can decide
   * whether to broadcast.
   */
  submit(
    roomId: string,
    participantId: string,
    scores: OwnMetricScores,
  ): MetricKey[] {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO metric_submissions (id, room_id, participant_id, metric_key, score)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(room_id, participant_id, metric_key)
       DO UPDATE SET score = excluded.score, updated_at = datetime('now')`,
    );

    const written: MetricKey[] = [];
    const tx = db.transaction(() => {
      for (const [key, raw] of Object.entries(scores)) {
        if (!KEY_SET.has(key as MetricKey)) continue;
        if (typeof raw !== 'number') continue;
        const score = clampScore(raw);
        stmt.run(generateId(), roomId, participantId, key, score);
        written.push(key as MetricKey);
      }
    });
    tx();
    return written;
  },

  /**
   * Anonymous team aggregate for a single room. Always returns one row per
   * defined metric (with `average: null` when no submissions yet) so the UI
   * can render a stable list. Each entry also carries a histogram so the UI
   * can highlight low/high outliers without revealing identities.
   */
  getAggregateByRoomId(roomId: string): MetricAggregate[] {
    const db = getDb();
    const aggRows = db
      .prepare(
        `SELECT metric_key, AVG(score) as avg_score, COUNT(*) as submission_count
         FROM metric_submissions
         WHERE room_id = ?
         GROUP BY metric_key`,
      )
      .all(roomId) as AggregateRow[];

    const distRows = db
      .prepare(
        `SELECT metric_key, score, COUNT(*) as count
         FROM metric_submissions
         WHERE room_id = ?
         GROUP BY metric_key, score`,
      )
      .all(roomId) as DistributionRow[];

    const distByKey = new Map<MetricKey, number[]>();
    for (const row of distRows) {
      if (!KEY_SET.has(row.metric_key as MetricKey)) continue;
      const dist = distByKey.get(row.metric_key as MetricKey) ?? zeroDistribution();
      const idx = Math.max(METRIC_SCORE_MIN, Math.min(METRIC_SCORE_MAX, Math.round(row.score))) - METRIC_SCORE_MIN;
      dist[idx] = (dist[idx] ?? 0) + row.count;
      distByKey.set(row.metric_key as MetricKey, dist);
    }

    const byKey = new Map<MetricKey, MetricAggregate>();
    for (const row of aggRows) {
      if (!KEY_SET.has(row.metric_key as MetricKey)) continue;
      byKey.set(row.metric_key as MetricKey, {
        metricKey: row.metric_key as MetricKey,
        average: row.avg_score == null ? null : Math.round(row.avg_score * 10) / 10,
        submissions: row.submission_count,
        distribution: distByKey.get(row.metric_key as MetricKey) ?? zeroDistribution(),
      });
    }
    return METRIC_KEYS.map(
      (k) =>
        byKey.get(k) ?? {
          metricKey: k,
          average: null,
          submissions: 0,
          distribution: zeroDistribution(),
        },
    );
  },

  /**
   * Submitter's own scores. Only ever sent privately to that participant.
   */
  getOwnScores(roomId: string, participantId: string): OwnMetricScores {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT metric_key, score FROM metric_submissions
         WHERE room_id = ? AND participant_id = ?`,
      )
      .all(roomId, participantId) as OwnRow[];

    const out: OwnMetricScores = {};
    for (const r of rows) {
      if (KEY_SET.has(r.metric_key as MetricKey)) {
        out[r.metric_key as MetricKey] = r.score;
      }
    }
    return out;
  },

  /**
   * Anonymous team-aggregate history across the most recent rooms.
   * Returns one entry per room (newest first), each with the full metric set.
   */
  getTeamHistory(limit = 12): MetricsHistoryEntry[] {
    const db = getDb();
    const rows = db
      .prepare(
        `WITH recent AS (
           SELECT id, name, created_at, closed_at FROM rooms
           ORDER BY created_at DESC
           LIMIT ?
         )
         SELECT
           r.id            AS room_id,
           r.name          AS room_name,
           r.created_at    AS created_at,
           r.closed_at     AS closed_at,
           ms.metric_key   AS metric_key,
           AVG(ms.score)   AS avg_score,
           COUNT(ms.score) AS submission_count
         FROM recent r
         LEFT JOIN metric_submissions ms ON ms.room_id = r.id
         GROUP BY r.id, ms.metric_key
         ORDER BY r.created_at DESC`,
      )
      .all(limit) as HistoryAggregateRow[];

    const byRoom = new Map<string, MetricsHistoryEntry>();
    for (const row of rows) {
      let entry = byRoom.get(row.room_id);
      if (!entry) {
        entry = {
          roomId: row.room_id,
          roomName: row.room_name,
          createdAt: row.created_at,
          closedAt: row.closed_at,
          metrics: emptyAggregate(),
        };
        byRoom.set(row.room_id, entry);
      }
      if (row.metric_key && KEY_SET.has(row.metric_key as MetricKey)) {
        const idx = entry.metrics.findIndex((m) => m.metricKey === row.metric_key);
        if (idx >= 0) {
          entry.metrics[idx] = {
            metricKey: row.metric_key as MetricKey,
            average: row.avg_score == null ? null : Math.round(row.avg_score * 10) / 10,
            submissions: row.submission_count,
            distribution: zeroDistribution(),
          };
        }
      }
    }
    return Array.from(byRoom.values());
  },
};
