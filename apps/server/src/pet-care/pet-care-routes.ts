// The pet's care screen, for the selected player and the pet she takes along (never a pet or player named in the
// request): its needs, bond level and tricks, its name and what it wears. The server counts every number; the web
// app only says what she did.
import { and, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { CARE_XP, applyCare, bondXp, careXpDue, petLevel, unlockedTricks, walkCredit } from '@miu/quest/pet-bond';
import {
  PetCareRequest,
  PetGearRequest,
  PetNameRequest,
  PetTrickRequest,
  type PetBondChange,
  type PetBondResponse,
  type PetCareStatusResponse,
} from '@miu/schema/pet-care';
import { gearIssues } from '@miu/schema/pet-gear';
import { CharacterDto } from '@miu/schema/game';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { CharacterEvents } from '../character/character-events';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { ownedItems } from '../shop/shop-routes';
import { bondView, changeBond, readBond, statsAt, type PetBondRow } from './pet-bond-store';

export interface PetCareRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  /** Told when the pet's gear changes (the others see it). */
  events?: CharacterEvents;
}

/** Happiness a trick adds (a little: tricks are play, not a way to raise the bond). */
const TRICK_JOY = 3;

/** What a change of the bond brought, from the rows before and after. */
function bondChange(before: PetBondRow, after: PetBondRow, now: Date, gear: readonly string[]): PetBondChange {
  const was = petLevel(bondXp(before.careXp, before.walkSeconds)).level;
  const bond = bondView(after, now, gear);
  const opened = new Set(unlockedTricks(was));
  return { bond, xpGained: bond.xp - bondXp(before.careXp, before.walkSeconds), levelUp: bond.level > was, unlocked: bond.tricks.filter((t) => !opened.has(t)) };
}

export function petCareRoutes({ db, content, clock, events }: PetCareRouteDeps): Router {
  const router = Router();

  /** The selected player's character row; her pet must be one the catalogue still has. */
  async function withPet(childId: string): Promise<{ petId: string; gear: string[] }> {
    const [row] = await db.select({ pet: characters.pet, petGear: characters.petGear }).from(characters).where(eq(characters.childId, childId));
    if (!row?.pet || !content.pets.has(row.pet)) throw new HttpError(400, 'no-pet-equipped');
    return { petId: row.pet, gear: row.petGear };
  }

  router.get('/character/pet/care', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select({ pet: characters.pet, petGear: characters.petGear }).from(characters).where(eq(characters.childId, childId));
    if (!row?.pet || !content.pets.has(row.pet)) {
      const none: PetCareStatusResponse = { hasPet: false, petId: null };
      return res.json(none);
    }
    const now = clock();
    const body: PetCareStatusResponse = { hasPet: true, petId: row.pet, bond: bondView(await readBond(db, childId, row.pet, now), now, row.petGear) };
    res.json(body);
  });

  /**
   * A care scene (feed, pet, bath, play, nap): lifts the need it answers and pays bond XP when that care was not
   * paid in the last half minute. Feeding a cooked dish she owns uses one up (409 `not-owned` without one).
   */
  router.post('/character/pet/care', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { petId, gear } = await withPet(childId);
    const input = parseInput(PetCareRequest, req.body);
    const dish = input.itemId === undefined ? undefined : [...content.recipes.values()].find((r) => r.resultItemId === input.itemId);
    if (input.itemId !== undefined && (input.action !== 'feed' || !dish)) throw new HttpError(400, 'invalid-item');
    const now = clock();
    const { before, after } = await changeBond(db, childId, petId, now, async (row, tx) => {
      if (dish) {
        const used = await tx
          .update(shopInventory)
          .set({ qty: sql`${shopInventory.qty} - 1` })
          .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, dish.resultItemId), sql`${shopInventory.qty} > 0`))
          .returning({ qty: shopInventory.qty });
        if (used.length === 0) throw new HttpError(409, 'not-owned');
      }
      const stats = applyCare(statsAt(row, now), input.action, dish ? { fullness: dish.hungerRestore, happiness: dish.happinessBonus } : undefined);
      const paidAt = row.carePaidAt[input.action];
      const pays = careXpDue(paidAt === undefined ? undefined : Date.parse(paidAt), now.getTime());
      return {
        ...stats,
        statsAt: now,
        ...(pays ? { careXp: row.careXp + CARE_XP, carePaidAt: { ...row.carePaidAt, [input.action]: now.toISOString() } } : {}),
      };
    });
    res.json(bondChange(before, after, now, gear));
  });

  /** Time walking together, reported about once a minute while she plays with her pet along; counted by the clock. */
  router.post('/character/pet/walk', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { petId, gear } = await withPet(childId);
    const now = clock();
    const { before, after } = await changeBond(db, childId, petId, now, (row) => ({
      walkSeconds: row.walkSeconds + walkCredit(row.walkedAt?.getTime() ?? null, now.getTime()),
      walkedAt: now,
    }));
    res.json(bondChange(before, after, now, gear));
  });

  /** A trick from the menu: only one the bond level has opened (403 `trick-locked`). */
  router.post('/character/pet/trick', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { petId, gear } = await withPet(childId);
    const { trick } = parseInput(PetTrickRequest, req.body);
    const now = clock();
    const { after } = await changeBond(db, childId, petId, now, (row) => {
      if (!unlockedTricks(petLevel(bondXp(row.careXp, row.walkSeconds)).level).includes(trick)) throw new HttpError(403, 'trick-locked');
      const stats = statsAt(row, now);
      return { ...stats, happiness: Math.min(100, stats.happiness + TRICK_JOY), statsAt: now };
    });
    const body: PetBondResponse = { bond: bondView(after, now, gear) };
    res.json(body);
  });

  /** Names the pet from the list (`content/names/pet-names.json`); null gives it back its kind's name. */
  router.put('/character/pet/name', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { petId, gear } = await withPet(childId);
    const { name } = parseInput(PetNameRequest, req.body);
    if (name !== null && !content.petNames.has(name)) throw new HttpError(400, 'invalid-pet-name');
    const now = clock();
    const { after } = await changeBond(db, childId, petId, now, () => ({ name }));
    const body: PetBondResponse = { bond: bondView(after, now, gear) };
    res.json(body);
  });

  /** What the pet wears: gear she bought (403 `gear-not-owned` otherwise), at most one per slot. The others see it. */
  router.put('/character/pet/gear', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { petId } = await withPet(childId);
    const { gear } = parseInput(PetGearRequest, req.body);
    if (gearIssues(gear, content.petGear).length > 0) throw new HttpError(400, 'invalid-pet-gear');
    if (gear.length > 0) {
      const owned = await ownedItems(db, childId);
      if (gear.some((id) => !owned.has(id))) throw new HttpError(403, 'gear-not-owned');
    }
    const [saved] = await db.update(characters).set({ petGear: gear }).where(eq(characters.childId, childId)).returning();
    if (!saved) throw new HttpError(404, 'not-found');
    events?.emit(childId, CharacterDto.parse(saved));
    const now = clock();
    const body: PetBondResponse = { bond: bondView(await readBond(db, childId, petId, now), now, saved.petGear) };
    res.json(body);
  });

  return router;
}
