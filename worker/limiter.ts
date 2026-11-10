import { sleep } from "./log";

export type Limit = { limit: number; windowMs: number };

/**
 * Thrown instead of waiting when a shutdown is requested mid-wait.
 *
 * Callers must treat this as "stop", never as "the request failed": no request
 * was sent, and no quota was spent.
 */
export class RateLimitAborted extends Error {
  constructor() {
    super("stopped while waiting for a rate-limit slot");
    this.name = "RateLimitAborted";
  }
}

/** Longest single sleep inside a wait, so a stop request is noticed promptly. */
const SLICE_MS = 250;

/**
 * Sliding-window rate limiter.
 *
 * Two jobs:
 *  1. Keep the crawler under a fraction of the published quota — not at it. A
 *     crawler that runs at 100% of the limit spends its life in 429s.
 *  2. Accept a global pause. When Riot answers 429 with a retry-after, every
 *     request in flight must stop, not just the one that was rejected.
 *
 * Reservations are serialised through a promise chain so concurrent fetch
 * loops can't both decide there is one slot left and take two.
 */
export class RateLimiter {
  private hits: number[] = [];
  private pausedUntil = 0;
  private chain: Promise<void> = Promise.resolve();
  private stopCheck?: () => boolean;

  constructor(
    private readonly limits: Limit[],
    private readonly budgetPercent = 0.65,
  ) {
    if (limits.length === 0) throw new Error("RateLimiter needs at least one limit");
  }

  /**
   * Install a stop predicate. A wait in progress is checked every SLICE_MS, so
   * a shutdown never has to sit out the rest of a quota window.
   */
  setStopCheck(check: () => boolean): void {
    this.stopCheck = check;
  }

  acquire(): Promise<void> {
    const next = this.chain.then(() => this.reserve());
    // Keep the chain alive even if a reservation throws.
    this.chain = next.catch(() => undefined);
    return next;
  }

  /** Sleep that aborts on shutdown. Used for retry backoff as well as waits. */
  async wait(ms: number): Promise<void> {
    const until = Date.now() + Math.max(0, ms);
    for (;;) {
      if (this.stopCheck?.()) throw new RateLimitAborted();
      const left = until - Date.now();
      if (left <= 0) return;
      await sleep(Math.min(left, SLICE_MS));
    }
  }

  /** Called when Riot answers 429; blocks every waiter for the given duration. */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }

  /** Introspection for the stats command and tests. */
  snapshot(): { hits: number; pausedForMs: number; effective: number[] } {
    const now = Date.now();
    const longest = Math.max(...this.limits.map((entry) => entry.windowMs));
    return {
      hits: this.hits.filter((hit) => now - hit < longest).length,
      pausedForMs: Math.max(0, this.pausedUntil - now),
      effective: this.limits.map((entry) => this.capacity(entry)),
    };
  }

  private capacity(limit: Limit): number {
    return Math.max(1, Math.floor(limit.limit * this.budgetPercent));
  }

  private async reserve(): Promise<void> {
    for (;;) {
      const now = Date.now();

      if (now < this.pausedUntil) {
        await this.wait(this.pausedUntil - now + 5);
        continue;
      }

      const longest = Math.max(...this.limits.map((entry) => entry.windowMs));
      this.hits = this.hits.filter((hit) => now - hit < longest);

      let waitMs = 0;
      for (const limit of this.limits) {
        const capacity = this.capacity(limit);
        const inWindow = this.hits.filter((hit) => now - hit < limit.windowMs);
        if (inWindow.length < capacity) continue;

        // The oldest hit that must leave the window before another slot frees.
        const blocking = inWindow[inWindow.length - capacity];
        if (blocking !== undefined) {
          waitMs = Math.max(waitMs, limit.windowMs - (now - blocking));
        }
      }

      if (waitMs <= 0) {
        this.hits.push(now);
        return;
      }

      await this.wait(waitMs + 2);
    }
  }
}
