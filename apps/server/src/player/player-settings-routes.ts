import { and, eq, isNull } from 'drizzle-orm';
import { Router } from 'express';
import { PlayerOwnerSettings, PlayerOwnerSettingsPatch, PlayerSettingsPatch, PlayerSettingsView } from '@miu/schema/account';
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

const columns = {
  botsEnabled: childProfiles.botsEnabled,
  voiceChatAllowed: childProfiles.voiceChatAllowed,
  onlineAllowed: childProfiles.onlineAllowed,
  voiceSafetySeenAt: childProfiles.voiceSafetySeenAt,
};
type Row = { botsEnabled: boolean; voiceChatAllowed: boolean; onlineAllowed: boolean; voiceSafetySeenAt: Date | null };

const view = (row: Row): PlayerSettingsView =>
  PlayerSettingsView.parse({ botsEnabled: row.botsEnabled, voiceChatAllowed: row.voiceChatAllowed, onlineAllowed: row.onlineAllowed, voiceSafetySeen: row.voiceSafetySeenAt !== null });

/**
 * A player's switches. Her own companion bot switch (`GET`/`PUT /player-settings`, no PIN: it is hers), read together
 * with the account owner's switches and whether she saw the voice reminder. The account owner changes any switch of
 * any player of the account (`PATCH /players/:id/settings`, behind the optional PIN): voice chat and online play,
 * which only the owner can turn off and the server enforces (online tickets, the rooms, voice). The reminder shown
 * before her first voice chat is confirmed once per player (`POST /player-settings/voice-safety`). A change takes
 * effect at once in the online rooms.
 */
export function playerSettingsRoutes({ db, content, clock, events }: PlayerSettingsRouteDeps): Router {
  const router = Router();

  async function update(parentId: string, childId: string, patch: Partial<Pick<Row, 'botsEnabled' | 'voiceChatAllowed' | 'onlineAllowed'>>): Promise<Row> {
    const [row] = await db
      .update(childProfiles)
      .set(patch)
      .where(and(eq(childProfiles.id, childId), eq(childProfiles.parentId, parentId)))
      .returning(columns);
    if (!row) throw new HttpError(404, 'not-found');
    if (patch.botsEnabled !== undefined) events?.emit({ type: 'settings', childId, settings: { botsEnabled: row.botsEnabled } });
    if (patch.voiceChatAllowed !== undefined || patch.onlineAllowed !== undefined) {
      events?.emit({ type: 'controls', childId, controls: { voiceChatAllowed: row.voiceChatAllowed, onlineAllowed: row.onlineAllowed } });
    }
    return row;
  }

  router.get('/player-settings', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select(columns).from(childProfiles).where(eq(childProfiles.id, childId));
    if (!row) throw new HttpError(404, 'not-found');
    res.json(view(row));
  });

  router.put('/player-settings', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    // Her own switch only: the owner's switches are not hers to change (a body naming them is refused).
    const patch = parseInput(PlayerSettingsPatch, req.body);
    res.json(view(await update(auth(res).parent.id, childId, patch)));
  });

  router.post('/player-settings/voice-safety', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    // The first confirmation is kept; another one changes nothing.
    await db
      .update(childProfiles)
      .set({ voiceSafetySeenAt: clock() })
      .where(and(eq(childProfiles.id, childId), eq(childProfiles.parentId, auth(res).parent.id), isNull(childProfiles.voiceSafetySeenAt)));
    const [row] = await db.select(columns).from(childProfiles).where(eq(childProfiles.id, childId));
    if (!row) throw new HttpError(404, 'not-found');
    res.json(view(row));
  });

  router.patch('/players/:id/settings', requireParent, requireParentGate(clock), async (req, res) => {
    const { parent } = auth(res);
    // Ownership first: another account's player is "not found" whatever the body says.
    const player = await ownedPlayer(db, parent.id, idParam(req.params.id));
    const patch = parseInput(PlayerOwnerSettingsPatch, req.body);
    const row = await update(parent.id, player.id, patch);
    res.json(PlayerOwnerSettings.parse(row));
  });

  return router;
}
