// The servers two browsers use to connect their voice: Cloudflare's public STUN server finds a direct path; when
// there is none (strict networks), Cloudflare's TURN relays the encrypted sound. TURN credentials are short-lived and
// asked from Cloudflare with the key in the server's env file (kept out of the repo); the server hands them to
// signed-in players only, keeps them a few minutes so a party joining together asks once, and never logs them.
// Without a key, or when Cloudflare cannot be reached, voice runs on STUN only (most home networks connect directly).
import { IceServer, type VoiceIceServers } from '@miu/schema/voice';
import { z } from 'zod';
import type { TurnConfig } from '../config';

export const CLOUDFLARE_TURN_API = 'https://rtc.live.cloudflare.com/v1/turn/keys';
export const STUN_ONLY: VoiceIceServers = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], ttlSeconds: 600 };

/** How long asked-for credentials last (seconds): short, as every player gets the same ones for a few minutes. */
export const TURN_TTL_S = 2 * 3_600;
/** Credentials are handed out this long after they were asked for, then asked for again. */
export const TURN_CACHE_MS = 10 * 60_000;
/** After a failure, STUN only for this long before asking Cloudflare again. */
const FAILURE_BACKOFF_MS = 60_000;
const REQUEST_TIMEOUT_MS = 5_000;

/** One of Cloudflare's servers (fields it may add later are left out). */
const CloudflareServer = z.object({
  urls: IceServer.shape.urls,
  username: z.string().min(1).max(256).optional(),
  credential: z.string().min(1).max(256).optional(),
});
type CloudflareServer = z.infer<typeof CloudflareServer>;
/** Cloudflare's answer: one server or a list (STUN and TURN). */
const CloudflareAnswer = z.object({ iceServers: z.union([CloudflareServer, z.array(CloudflareServer)]) });

/**
 * URLs on port 53 are left out: browsers often block or stall on them (Cloudflare's own advice), and the others
 * (3478, 5349, 80, 443) cover every network that 53 would.
 */
const usable = (url: string): boolean => !/:53(\?|$)/.test(url);

function cleaned(servers: readonly CloudflareServer[]): IceServer[] {
  return servers.flatMap(({ urls, username, credential }) => {
    const kept = (Array.isArray(urls) ? urls : [urls]).filter(usable);
    if (kept.length === 0) return [];
    return [{ urls: kept, ...(username ? { username } : {}), ...(credential ? { credential } : {}) }];
  });
}

export interface IceServerSourceOptions {
  turn: TurnConfig | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class IceServerSource {
  private readonly turn: TurnConfig | null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private cached: { servers: IceServer[]; at: number } | null = null;
  private failedAt = Number.NEGATIVE_INFINITY;
  /** The request under way, shared by everyone asking meanwhile. */
  private pending: Promise<VoiceIceServers> | null = null;

  constructor(options: IceServerSourceOptions) {
    this.turn = options.turn;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  /** STUN, plus TURN with credentials good for a while yet (STUN only without a key or after a failure). */
  async servers(): Promise<VoiceIceServers> {
    if (!this.turn) return STUN_ONLY;
    const now = this.now();
    if (this.cached && now - this.cached.at < TURN_CACHE_MS) return this.view(this.cached);
    if (now - this.failedAt < FAILURE_BACKOFF_MS) return STUN_ONLY;
    this.pending ??= this.ask(this.turn).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private view(cached: { servers: IceServer[]; at: number }): VoiceIceServers {
    const left = TURN_TTL_S - Math.floor((this.now() - cached.at) / 1000);
    return { iceServers: cached.servers, ttlSeconds: Math.max(1, left) };
  }

  private async ask(turn: TurnConfig): Promise<VoiceIceServers> {
    try {
      const res = await this.fetchImpl(`${CLOUDFLARE_TURN_API}/${encodeURIComponent(turn.keyId)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${turn.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TURN_TTL_S }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`TURN credentials answered ${res.status}`);
      const parsed = CloudflareAnswer.safeParse(await res.json());
      if (!parsed.success) throw new Error('TURN credentials of an unknown shape');
      const servers = cleaned(Array.isArray(parsed.data.iceServers) ? parsed.data.iceServers : [parsed.data.iceServers]).slice(0, 4);
      if (servers.length === 0) throw new Error('TURN credentials without usable servers');
      this.cached = { servers, at: this.now() };
      return this.view(this.cached);
    } catch (err) {
      // The status or the error's class only: never the body, the URL (it carries the key id) or the token.
      console.error('voice relay credentials failed', err instanceof Error && err.message.startsWith('TURN') ? err.message : err instanceof Error ? err.name : typeof err);
      this.failedAt = this.now();
      return STUN_ONLY;
    }
  }
}
