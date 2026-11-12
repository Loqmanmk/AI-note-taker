import { describe, expect, it } from "vitest";
import { RateLimiter } from "../lib/server/rateLimiter";

describe("RateLimiter", () => {
  it("blocks after the limit and allows again after the window", () => {
    let time = 0;
    const limiter = new RateLimiter(2, 1000, () => time);

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);

    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    time = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("counts each client separately", () => {
    const limiter = new RateLimiter(1, 1000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });
});
