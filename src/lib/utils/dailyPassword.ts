/**
 * Daily-rotating password — yyyymmdd in Asia/Taipei (UTC+8, no DST).
 *
 * The system gates all access behind this password. It rotates at midnight
 * Taipei time so that yesterday's link no longer works tomorrow without
 * re-sharing it.
 */

export const AUTH_COOKIE_NAME = 'tretro-auth';
export const PASSWORD_QUERY_PARAM = 'password';

const TAIPEI_OFFSET_MINUTES = 8 * 60; // UTC+8, no DST in Taiwan

/** Return the current calendar date in Taipei as yyyymmdd. */
export function getDailyPassword(now: Date = new Date()): string {
  // Shift the wall clock by the Taipei offset and read UTC parts so the
  // result is the calendar date for someone living in Taipei.
  const taipei = new Date(now.getTime() + TAIPEI_OFFSET_MINUTES * 60 * 1000);
  const y = taipei.getUTCFullYear();
  const m = String(taipei.getUTCMonth() + 1).padStart(2, '0');
  const d = String(taipei.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Constant-time-ish equality check; ok for short fixed-length tokens. */
export function verifyPassword(input: unknown, now: Date = new Date()): boolean {
  if (typeof input !== 'string') return false;
  const expected = getDailyPassword(now);
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Milliseconds until the next Taipei midnight. Used to cap the auth-cookie
 * lifetime so it expires together with the password rotation.
 */
export function msUntilTaipeiMidnight(now: Date = new Date()): number {
  const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MINUTES * 60 * 1000);
  const nextTaipeiMidnightUtcMs = Date.UTC(
    taipeiNow.getUTCFullYear(),
    taipeiNow.getUTCMonth(),
    taipeiNow.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  ) - TAIPEI_OFFSET_MINUTES * 60 * 1000;
  return Math.max(60_000, nextTaipeiMidnightUtcMs - now.getTime());
}
