import {
  getDailyPassword,
  verifyPassword,
  msUntilTaipeiMidnight,
} from '@/lib/utils/dailyPassword';

describe('getDailyPassword', () => {
  it('returns yyyymmdd for noon UTC on 2026-05-10 (Taipei = same day)', () => {
    // 2026-05-10 12:00:00 UTC → 20:00 Taipei → date = 2026-05-10
    const now = new Date('2026-05-10T12:00:00Z');
    expect(getDailyPassword(now)).toBe('20260510');
  });

  it('rolls forward when UTC is still on previous day but Taipei has crossed midnight', () => {
    // 2026-05-09 17:00 UTC → 2026-05-10 01:00 Taipei → date = 2026-05-10
    const now = new Date('2026-05-09T17:00:00Z');
    expect(getDailyPassword(now)).toBe('20260510');
  });

  it('still returns previous Taipei day shortly before Taipei midnight', () => {
    // 2026-05-09 15:59 UTC → 2026-05-09 23:59 Taipei → date = 2026-05-09
    const now = new Date('2026-05-09T15:59:00Z');
    expect(getDailyPassword(now)).toBe('20260509');
  });

  it('handles year/month boundaries', () => {
    // 2025-12-31 16:30 UTC → 2026-01-01 00:30 Taipei
    const now = new Date('2025-12-31T16:30:00Z');
    expect(getDailyPassword(now)).toBe('20260101');
  });

  it('returns 8-character yyyymmdd format', () => {
    const pwd = getDailyPassword();
    expect(pwd).toMatch(/^\d{8}$/);
  });
});

describe('verifyPassword', () => {
  const fixedNow = new Date('2026-05-10T06:00:00Z'); // 14:00 Taipei → 2026-05-10

  it('accepts the correct daily password', () => {
    expect(verifyPassword('20260510', fixedNow)).toBe(true);
  });

  it('rejects yesterday or tomorrow', () => {
    expect(verifyPassword('20260509', fixedNow)).toBe(false);
    expect(verifyPassword('20260511', fixedNow)).toBe(false);
  });

  it('rejects empty / wrong-length / non-string inputs', () => {
    expect(verifyPassword('', fixedNow)).toBe(false);
    expect(verifyPassword('2026051', fixedNow)).toBe(false);
    expect(verifyPassword('202605100', fixedNow)).toBe(false);
    expect(verifyPassword(undefined, fixedNow)).toBe(false);
    expect(verifyPassword(null, fixedNow)).toBe(false);
    expect(verifyPassword(20260510 as unknown, fixedNow)).toBe(false);
  });
});

describe('msUntilTaipeiMidnight', () => {
  it('returns ~24h shortly after Taipei midnight', () => {
    // 2026-05-09 16:01 UTC → 2026-05-10 00:01 Taipei
    const now = new Date('2026-05-09T16:01:00Z');
    const ms = msUntilTaipeiMidnight(now);
    // Roughly 23h59min ahead — allow generous slack
    expect(ms).toBeGreaterThan(23 * 3600 * 1000);
    expect(ms).toBeLessThanOrEqual(24 * 3600 * 1000);
  });

  it('returns a small positive number just before Taipei midnight', () => {
    // 2026-05-09 15:59:30 UTC → 2026-05-09 23:59:30 Taipei
    const now = new Date('2026-05-09T15:59:30Z');
    const ms = msUntilTaipeiMidnight(now);
    expect(ms).toBeGreaterThanOrEqual(60_000);
    expect(ms).toBeLessThanOrEqual(60_000 * 5);
  });
});
