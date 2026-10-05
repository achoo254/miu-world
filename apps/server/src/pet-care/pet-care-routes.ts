import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { PetCareRequest, PetCareResponse, PetCareStats, PetCareStatusResponse } from '@miu/schema/pet-care';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';

export interface PetCareRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock?: () => Date;
}

interface PetCareRecord {
  stats: PetCareStats;
  lastCareAt: number;
}

// In-memory state keyed by childId, seeded with friendly baseline
const petCareState = new Map<string, PetCareRecord>();

function getPetCare(childId: string): PetCareRecord {
  const existing = petCareState.get(childId);
  if (existing) return existing;
  const initial: PetCareRecord = {
    stats: {
      happiness: 80,
      fullness: 75,
      cleanliness: 85,
    },
    lastCareAt: Date.now(),
  };
  petCareState.set(childId, initial);
  return initial;
}

function calculateTier(stats: PetCareStats): { tier: 1 | 2 | 3; title: string } {
  const avg = (stats.happiness + stats.fullness + stats.cleanliness) / 3;
  if (avg >= 85) return { tier: 3, title: 'Tri Kỷ Nhỏ' };
  if (avg >= 60) return { tier: 2, title: 'Bạn Thân Thiết' };
  return { tier: 1, title: 'Bạn Đồng Hành' };
}

export function petCareRoutes({ db, content }: PetCareRouteDeps): Router {
  const router = Router();

  /** Get pet care status for the active child's current pet */
  router.get('/character/pet/care', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select().from(characters).where(eq(characters.childId, childId));
    if (!row || !row.pet) {
      const empty: PetCareStatusResponse = {
        hasPet: false,
        petId: null,
      };
      return res.json(empty);
    }

    const petDef = content.pets.get(row.pet);
    const petName = petDef?.name ?? 'Thú cưng';
    const record = getPetCare(childId);
    const { tier, title } = calculateTier(record.stats);

    const body: PetCareStatusResponse = {
      hasPet: true,
      petId: row.pet,
      petName,
      stats: record.stats,
      friendshipTier: tier,
      title,
    };
    res.json(body);
  });

  /** Perform a pet care action (feed, pet, bath, play) */
  router.post('/character/pet/care', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select().from(characters).where(eq(characters.childId, childId));
    if (!row || !row.pet) throw new HttpError(400, 'no-pet-equipped');

    const petDef = content.pets.get(row.pet);
    const petName = petDef?.name ?? 'Bé cưng';
    const input = parseInput(PetCareRequest, req.body);
    const record = getPetCare(childId);

    let message = '';
    let emote = '';

    switch (input.action) {
      case 'feed': {
        let hungerBonus = 30;
        let happyBonus = 20;

        if (input.itemId) {
          const recipe = content.recipes.get(input.itemId);
          if (recipe) {
            hungerBonus = recipe.hungerRestore;
            happyBonus = recipe.happinessBonus;
          }
          // If child owns item in shop_inventory, consume 1
          const [owned] = await db
            .select()
            .from(shopInventory)
            .where(eq(shopInventory.childId, childId));
          if (owned && owned.qty > 0) {
            await db
              .update(shopInventory)
              .set({ qty: owned.qty - 1 })
              .where(eq(shopInventory.childId, childId));
          }
        }

        record.stats.fullness = Math.min(100, record.stats.fullness + hungerBonus);
        record.stats.happiness = Math.min(100, record.stats.happiness + happyBonus);
        message = `${petName} ăn thật ngon miệng và no nê! 🥕`;
        emote = 'yummy';
        break;
      }
      case 'pet': {
        record.stats.happiness = Math.min(100, record.stats.happiness + 20);
        message = `${petName} dụi đầu vào lòng bàn tay bạn thật âu yếm! ❤️`;
        emote = 'love';
        break;
      }
      case 'bath': {
        record.stats.cleanliness = Math.min(100, record.stats.cleanliness + 35);
        record.stats.happiness = Math.min(100, record.stats.happiness + 10);
        message = `${petName} thích mê làn nước mát và bọt xà phòng thơm phức! 🫧`;
        emote = 'sparkles';
        break;
      }
      case 'play': {
        record.stats.happiness = Math.min(100, record.stats.happiness + 25);
        record.stats.fullness = Math.max(20, record.stats.fullness - 5);
        message = `${petName} nhảy múa tung tăng theo điệu nhạc vui vẻ! 🎵`;
        emote = 'dance';
        break;
      }
    }

    record.lastCareAt = Date.now();
    const { tier, title } = calculateTier(record.stats);

    const body: PetCareResponse = {
      stats: record.stats,
      message,
      emote,
      friendshipTier: tier,
      title,
    };
    res.json(body);
  });

  return router;
}
