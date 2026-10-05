// `GET /api/voice/ice-servers`: the servers a signed-in player's browser connects her voice through (STUN, and TURN
// with short-lived credentials when the server has a key). Only for the player playing now; a few times in ten
// minutes per player is plenty (once per voice joined, again before the credentials run out).
import { Router } from 'express';
import { VoiceIceServers } from '@miu/schema/voice';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { HttpError } from '../http-error';
import type { IceServerSource } from './ice-servers';

export interface VoiceRouteDeps {
  db: Db;
  content: ContentCatalog;
  ice: IceServerSource;
  now?: () => number;
  /** Requests per player in `windowMs`. */
  perWindow?: number;
  windowMs?: number;
}

export function voiceRoutes({ db, content, ice, now = Date.now, perWindow = 30, windowMs = 10 * 60_000 }: VoiceRouteDeps): Router {
  const router = Router();
  const asked = new Map<string, number[]>();

  /** Counts a request of `childId`; false once she asked too often. */
  function allow(childId: string): boolean {
    const at = now();
    const recent = (asked.get(childId) ?? []).filter((t) => at - t < windowMs);
    if (recent.length >= perWindow) {
      asked.set(childId, recent);
      return false;
    }
    recent.push(at);
    asked.set(childId, recent);
    // A record of recent asks only: a busy server drops the oldest players' counts rather than growing.
    if (asked.size > 10_000) asked.delete(asked.keys().next().value ?? '');
    return true;
  }

  router.get('/voice/ice-servers', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    if (!allow(childId)) throw new HttpError(429, 'rate-limited');
    // Credentials: never kept by a cache on the way.
    res.set('Cache-Control', 'no-store');
    res.json(VoiceIceServers.parse(await ice.servers()));
  });

  return router;
}
