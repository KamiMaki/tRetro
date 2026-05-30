/**
 * Centralised Taipei (UTC+8, no DST) date formatting.
 *
 * These helpers rely on the Intl `timeZone` option rather than the host's
 * local timezone, so they return Taipei wall-clock time identically on the
 * server (any deploy region) and in the browser (any visitor location).
 *
 * `server.ts` additionally pins `process.env.TZ='Asia/Taipei'` so that any
 * stray `toLocale*` / `Date#toString` without an explicit zone, plus server
 * logs, also read as Taipei.
 */

export const TAIPEI_TZ = 'Asia/Taipei';

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Break a date into Taipei-zone calendar parts. `hourCycle: 'h23'` avoids the
 * "24:00" edge some locales emit at midnight.
 */
function taipeiParts(input: Date | string | number): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TAIPEI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(toDate(input))) out[p.type] = p.value;
  return out;
}

/** "2026-05-30 14:23" in Taipei time. */
export function formatTaipeiDateTime(input: Date | string | number): string {
  const p = taipeiParts(input);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** "2026-05-30" — Taipei calendar date only. */
export function formatTaipeiDate(input: Date | string | number): string {
  const p = taipeiParts(input);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "14:23" — compact Taipei wall-clock time (used for comment timestamps). */
export function formatTaipeiTime(input: Date | string | number): string {
  const p = taipeiParts(input);
  return `${p.hour}:${p.minute}`;
}

/**
 * "2026-05-30 14:23:07 (UTC+8)" — explicit, unambiguous stamp for export
 * file headers (replaces a bare UTC `toISOString()`).
 */
export function taipeiTimestamp(input: Date | string | number = new Date()): string {
  const p = taipeiParts(input);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} (UTC+8)`;
}
