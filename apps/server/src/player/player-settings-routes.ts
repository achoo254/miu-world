import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { PlayerSettings, PlayerSettingsPatch } from '@miu/schema/account';
import { activePlayerId, auth, requireParent, requireParentGate } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { childProfiles } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { idParam, ownedPlayer } from './owned-player';
import type { PlayerEvents } from './player-events';

export interface PlayerSettingsRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  events?: PlayerEvents;
}

const columns = { botsEnabled: childProfiles.botsEnabled };

/**
 * A player's companion bot switch: her own (`GET`/`PUT /player-settings`, no PIN: it is hers), and any player's
 * for the account owner (`PATCH /players/:id/settings`, behind the optional PIN). A change takes effect at once
 * in the online rooms. Online play has no switch: it is always on.
 */
export function playerSettingsRoutes({ db, content, clock, events }: PlayerSettingsRouteDeps): Router {
  const router = Router();

  async function update(parentId: string, childId: string, patch: PlayerSettingsPatch): Promise<PlayerSettings> {
    const [row] = await db
      .update(childProfiles)
      .set(patch)
      .where(and(eq(childProfiles.id, childId), eq(childProfiles.parentId, parentId)))
      .returning(columns);
    if (!row) throw new HttpError(404, 'not-found');
    events?.emit({ type: 'settings', childId, settings: row });
    return row;
  }

  router.get('/player-settings', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select(columns).from(childProfiles).where(eq(childProfiles.id, childId));
    if (!row) throw new HttpError(404, 'not-found');
    res.json(PlayerSettings.parse(row));
  });

  router.put('/player-settings', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const patch = parseInput(PlayerSettingsPatch, req.body);
    res.json(PlayerSettings.parse(await update(auth(res).parent.id, childId, patch)));
  });

  router.patch('/players/:id/settings', requireParent, requireParentGate(clock), async (req, res) => {
    const { parent } = auth(res);
    // Ownership first: another account's player is "not found" whatever the body says.
    const player = await ownedPlayer(db, parent.id, idParam(req.params.id));
    const patch = parseInput(PlayerSettingsPatch, req.body);
    res.json(PlayerSettings.parse(await update(parent.id, player.id, patch)));
  });

  return router;
}
