import {
  formatTaipeiDateTime,
  formatTaipeiDate,
  formatTaipeiTime,
  taipeiTimestamp,
  parseDbDate,
} from '@/lib/utils/datetime';

// These assertions hold regardless of the host machine's local timezone
// because the helpers pin Asia/Taipei via Intl `timeZone`, not the host TZ.
describe('Taipei datetime helpers (UTC+8, no DST)', () => {
  const utcMidnight = '2025-01-01T00:00:00Z'; // == 08:00 on the same Taipei day

  it('formatTaipeiDateTime shifts UTC midnight to 08:00 Taipei', () => {
    expect(formatTaipeiDateTime(utcMidnight)).toBe('2025-01-01 08:00');
  });

  it('formatTaipeiDate returns the Taipei calendar date', () => {
    expect(formatTaipeiDate(utcMidnight)).toBe('2025-01-01');
  });

  it('formatTaipeiTime returns 08:00 for UTC midnight', () => {
    expect(formatTaipeiTime(utcMidnight)).toBe('08:00');
  });

  it('taipeiTimestamp includes the shifted time and the (UTC+8) marker', () => {
    expect(taipeiTimestamp(utcMidnight)).toBe('2025-01-01 08:00:00 (UTC+8)');
  });

  it('rolls the date forward when a UTC evening crosses Taipei midnight', () => {
    // 2025-01-01T20:00:00Z == 2025-01-02 04:00 Taipei
    expect(formatTaipeiDateTime('2025-01-01T20:00:00Z')).toBe('2025-01-02 04:00');
  });

  it('accepts a Date instance as well as a string', () => {
    expect(formatTaipeiDate(new Date(utcMidnight))).toBe('2025-01-01');
  });
});

// Regression: SQLite datetime('now') is UTC but has NO zone marker
// ("YYYY-MM-DD HH:MM:SS"). Parsing it as local double-shifted every displayed
// time by the Taipei offset (e.g. real 07:50 showed as 23:50).
describe('zone-less DB timestamps are treated as UTC', () => {
  it('parseDbDate normalises a SQLite-format string to the UTC instant', () => {
    expect(parseDbDate('2026-05-30 23:50:00').toISOString()).toBe('2026-05-30T23:50:00.000Z');
  });

  it('formatTaipeiTime renders 07:50 for UTC 23:50 (next Taipei day)', () => {
    expect(formatTaipeiTime('2026-05-30 23:50:00')).toBe('07:50');
  });

  it('formatTaipeiDateTime rolls the date forward across Taipei midnight', () => {
    expect(formatTaipeiDateTime('2026-05-30 23:50:00')).toBe('2026-05-31 07:50');
  });

  it('formatTaipeiDate gives the Taipei calendar day for a zone-less UTC string', () => {
    expect(formatTaipeiDate('2026-05-30 23:50:00')).toBe('2026-05-31');
  });

  it('still honours an explicit Z suffix (no double-shift)', () => {
    expect(formatTaipeiDateTime('2025-01-01T00:00:00Z')).toBe('2025-01-01 08:00');
    expect(parseDbDate('2025-01-01T00:00:00Z').toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('handles zone-less ISO (T separator, no zone) as UTC too', () => {
    expect(parseDbDate('2026-05-30T23:50:00').toISOString()).toBe('2026-05-30T23:50:00.000Z');
  });
});
