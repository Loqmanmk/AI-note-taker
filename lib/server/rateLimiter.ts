/**
 * Sliding-window rate limiter, kept in memory.
 *
 * Good enough for one server process. On a multi-instance or serverless
 * deployment each instance counts separately, so replace this with a shared
 * store (e.g. Redis) before launch.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt and reports whether it is allowed. */
  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const time = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => time - t < this.windowMs);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((recent[0] + this.windowMs - time) / 1000) };
    }

    recent.push(time);
    this.hits.set(key, recent);
    this.evictStale(time);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Keeps the map from growing forever as new clients appear. */
  private evictStale(time: number) {
    if (this.hits.size < 5000) return;
    for (const [key, times] of this.hits) {
      if (times.every((t) => time - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}
