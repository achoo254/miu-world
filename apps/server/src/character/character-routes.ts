import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { CharacterDto, CharacterUpdate } from '@miu/schema/game';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters } from '../db/schema';
import { HttpError, parseInput } from '../http-error';

export interface CharacterRouteDeps {
  db: Db;
  content: ContentCatalog;
}

export function characterRoutes({ db, content }: CharacterRouteDeps): Router {
  const router = Router();

  async function load(childId: string): Promise<CharacterDto> {
    const [row] = await db.select().from(characters).where(eq(characters.childId, childId));
    if (!row) throw new HttpError(404, 'not-found');
    return CharacterDto.parse(row);
  }

  router.get('/character', requireParent, async (_req, res) => {
    res.json(await load(await activeChildId(db, res, content.consent.version)));
  });

  /** Name from the pick list; equipment only from the accessory catalogue, one item per slot. Species stays `cat` (MVP). */
  router.put('/character', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const input = parseInput(CharacterUpdate, req.body);
    if (!content.characterNames.has(input.name)) throw new HttpError(400, 'invalid-character-name');
    const slots = new Set<string>();
    for (const id of input.equipped) {
      const slot = content.accessories.get(id);
      if (!slot || slots.has(slot)) throw new HttpError(400, 'invalid-equipment');
      slots.add(slot);
    }
    await db.update(characters).set({ name: input.name, equipped: input.equipped }).where(eq(characters.childId, childId));
    res.json(await load(childId));
  });

  return router;
}
