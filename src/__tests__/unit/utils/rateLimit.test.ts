import { RateLimiter, getClientIp } from '@/lib/utils/rateLimit';

describe('RateLimiter', () => {
  it('allows attempts within the budget', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 3, blockMs: 300_000 }, () => now);
    expect(limiter.check('a').ok).toBe(true);
    limiter.recordFailure('a');
    expect(limiter.check('a').ok).toBe(true);
    limiter.recordFailure('a');
    expect(limiter.check('a').ok).toBe(true);
  });

  it('blocks once maxAttempts reached within the window', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 3, blockMs: 300_000 }, () => now);
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    limiter.recordFailure('a'); // 3rd failure trips the block
    const result = limiter.check('a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 5-minute block ≈ 300 seconds
      expect(result.retryAfterSec).toBe(300);
    }
  });

  it('resets the counter after the window elapses', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 3, blockMs: 300_000 }, () => now);
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    now += 61_000; // window expires
    limiter.recordFailure('a'); // fresh window, counter resets to 1
    expect(limiter.check('a').ok).toBe(true);
  });

  it('clears state on successful attempt', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 2, blockMs: 300_000 }, () => now);
    limiter.recordFailure('a');
    limiter.recordSuccess('a');
    limiter.recordFailure('a'); // counts as 1, not 2
    expect(limiter.check('a').ok).toBe(true);
  });

  it('lifts the block after blockMs', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 2, blockMs: 60_000 }, () => now);
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    expect(limiter.check('a').ok).toBe(false);
    now += 61_000;
    expect(limiter.check('a').ok).toBe(true);
  });

  it('keys are isolated', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxAttempts: 2, blockMs: 60_000 });
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    expect(limiter.check('a').ok).toBe(false);
    expect(limiter.check('b').ok).toBe(true);
  });
});

describe('getClientIp', () => {
  const make = (headers: Record<string, string>): Request =>
    new Request('http://localhost/', { headers });

  it('returns first x-forwarded-for entry', () => {
    expect(getClientIp(make({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(make({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('returns "unknown" when no IP header present', () => {
    expect(getClientIp(make({}))).toBe('unknown');
  });
});
