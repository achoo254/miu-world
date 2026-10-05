// How often a player may ask others to be friends: a few requests in a window, and the same player (or bot) not
// again soon after. In memory: a restart forgets it, which only ever lets a request through early.

export interface FriendLimiterOptions {
  now?: () => number;
  /** Requests a player may send within `windowMs`. */
  perWindow?: number;
  windowMs?: number;
  /** The same pair once within this long (a declined request is not asked again at once). */
  pairGapMs?: number;
}

export class FriendRequestLimiter {
  private readonly now: () => number;
  private readonly perWindow: number;
  private readonly windowMs: number;
  private readonly pairGapMs: number;
  private readonly sent = new Map<string, number[]>();
  private readonly pairs = new Map<string, number>();

  constructor(options: FriendLimiterOptions = {}) {
    this.now = options.now ?? Date.now;
    this.perWindow = options.perWindow ?? 10;
    this.windowMs = options.windowMs ?? 10 * 60_000;
    this.pairGapMs = options.pairGapMs ?? 10 * 60_000;
  }

  /** Whether `from` may ask `to` now; counts the request when it may. */
  allow(from: string, to: string): boolean {
    const now = this.now();
    const recent = (this.sent.get(from) ?? []).filter((at) => now - at < this.windowMs);
    const pair = `${from}>${to}`;
    const last = this.pairs.get(pair);
    if (recent.length >= this.perWindow || (last !== undefined && now - last < this.pairGapMs)) {
      this.sent.set(from, recent);
      return false;
    }
    recent.push(now);
    this.sent.set(from, recent);
    this.pairs.set(pair, now);
    this.prune(now);
    return true;
  }

  /** Forgets what is past every window, so the maps do not grow with every player ever seen. */
  private prune(now: number): void {
    for (const [pair, at] of this.pairs) if (now - at >= this.pairGapMs) this.pairs.delete(pair);
    for (const [from, times] of this.sent) if (times.every((at) => now - at >= this.windowMs)) this.sent.delete(from);
  }
}
