/**
 * In-memory sliding-window rate limiter. Keyed by an arbitrary string
 * (e.g. client IP). Resets on process restart — acceptable for the
 * low-traffic team-auth path, which is the only caller today.
 *
 * Future work: persist to SQLite if rate-limit bypass via deploy/restart
 * becomes a real concern.
 */

export interface RateLimitOptions {
  /** Window for counting failures, in ms. */
  windowMs: number;
  /** Number of failures within the window that trips the block. */
  maxAttempts: number;
  /** How long the block lasts once tripped, in ms. */
  blockMs: number;
}

interface RateLimitState {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

export interface RateLimitOk {
  ok: true;
}

export interface RateLimitBlocked {
  ok: false;
  retryAfterSec: number;
}

export class RateLimiter {
  private readonly store = new Map<string, RateLimitState>();

  constructor(
    private readonly options: RateLimitOptions,
    private readonly now: () => number = Date.now,
  ) {}

  /** Check whether `key` is currently allowed. Pure read, no mutation. */
  check(key: string): RateLimitOk | RateLimitBlocked {
    const t = this.now();
    const state = this.store.get(key);
    if (state && state.blockedUntil > t) {
      return { ok: false, retryAfterSec: Math.ceil((state.blockedUntil - t) / 1000) };
    }
    return { ok: true };
  }

  /**
   * Record a failed attempt. If the count crosses `maxAttempts` within
   * `windowMs`, the key is blocked for `blockMs`.
   */
  recordFailure(key: string): void {
    const t = this.now();
    const state = this.store.get(key);
    if (!state || t - state.firstAttemptAt > this.options.windowMs) {
      this.store.set(key, { count: 1, firstAttemptAt: t, blockedUntil: 0 });
      return;
    }
    state.count += 1;
    if (state.count >= this.options.maxAttempts) {
      state.blockedUntil = t + this.options.blockMs;
    }
  }

  /** Successful attempt — clear the counter so legitimate users reset. */
  recordSuccess(key: string): void {
    this.store.delete(key);
  }

  /** Test hook — wipe all state. */
  __resetForTests(): void {
    this.store.clear();
  }
}

/**
 * Module-level singleton used by `POST /api/teams/auth`. Five failed
 * password attempts within 60 seconds from the same IP triggers a
 * five-minute block.
 */
export const teamAuthLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxAttempts: 5,
  blockMs: 5 * 60 * 1000,
});

/**
 * Module-level singleton used by `POST /api/teams`. Each create is a
 * scrypt computation (~50-100ms), so unbounded creation by an insider
 * burns the single Node thread. Ten teams per hour per IP is plenty
 * for legitimate use.
 */
export const teamCreateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 10,
  blockMs: 60 * 60 * 1000,
});

/**
 * Best-effort client IP. Defends against an `X-Forwarded-For` spoof
 * by reading the *last* entry — the one the closest trusted proxy
 * appended — rather than the first (attacker-controlled) entry. Behind
 * a chain of trusted proxies (Vercel, Cloudflare, nginx) this is the
 * proxy-set value; in raw-Node deployments with no proxy it falls back
 * to `x-real-ip` then a constant so dev never accidentally locks
 * itself out.
 *
 * Threat model: a single attacker hammering team-auth from one IP
 * should not be able to bypass the limiter by rotating an
 * `X-Forwarded-For` value per request. Picking the trailing entry
 * mirrors the standard reverse-proxy convention (each hop appends),
 * so the client-controlled portion of the header is ignored.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
