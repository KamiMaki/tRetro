import {
  formatTaipeiDateTime,
  formatTaipeiDate,
  formatTaipeiTime,
  taipeiTimestamp,
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
