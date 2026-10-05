// Reading and changing a player's bond with her pet (table pet_bonds). The needs are stored as they were at
// `stats_at` and drift from there when read (packages/quest pet-bond.ts); every change runs in a transaction with
// the bond's row locked, so two taps at once never both pay XP.
import { and, eq } from 'drizzle-orm';
import { STARTING_STATS, bondXp, decayedStats, petLevel, unlockedTricks } from '@miu/quest/pet-bond';
import type { PetBond, PetCareStats } from '@miu/schema/pet-care';
import type { Db } from '../db/client';
import { petBonds } from '../db/schema';
import type { Tx } from '../reward/reward-ledger';

export type PetBondRow = typeof petBonds.$inferSelect;

/** A bond nobody has cared for yet: the starting needs, counted from now. */
function freshRow(childId: string, petId: string, now: Date): PetBondRow {
  return { childId, petId, name: null, ...STARTING_STATS, statsAt: now, careXp: 0, walkSeconds: 0, carePaidAt: {}, walkedAt: null };
}

/** The needs of a row at `now`. */
export function statsAt(row: PetBondRow, now: Date): PetCareStats {
  return decayedStats({ happiness: row.happiness, fullness: row.fullness, cleanliness: row.cleanliness }, now.getTime() - row.statsAt.getTime());
}

/** The bond as the care screen shows it, at `now`, with what the pet wears. */
export function bondView(row: PetBondRow, now: Date, gear: readonly string[]): PetBond {
  const xp = bondXp(row.careXp, row.walkSeconds);
  const { level, levelXp, nextLevelXp } = petLevel(xp);
  return { name: row.name, stats: statsAt(row, now), level, xp, levelXp, nextLevelXp, tricks: unlockedTricks(level), gear: [...gear] };
}

/** The bond with `petId` as stored, or a fresh one (nothing written). */
export async function readBond(db: Db, childId: string, petId: string, now: Date): Promise<PetBondRow> {
  const [row] = await db
    .select()
    .from(petBonds)
    .where(and(eq(petBonds.childId, childId), eq(petBonds.petId, petId)));
  return row ?? freshRow(childId, petId, now);
}

/**
 * Runs `change` on the bond's row, locked for the transaction (made first when the pet has none yet), and writes
 * back what it returns. Returns the row before and after.
 */
export async function changeBond(
  db: Db,
  childId: string,
  petId: string,
  now: Date,
  change: (row: PetBondRow, tx: Tx) => Promise<Partial<Omit<PetBondRow, 'childId' | 'petId'>>> | Partial<Omit<PetBondRow, 'childId' | 'petId'>>,
): Promise<{ before: PetBondRow; after: PetBondRow }> {
  return db.transaction(async (tx) => {
    await tx.insert(petBonds).values(freshRow(childId, petId, now)).onConflictDoNothing();
    const [before] = await tx
      .select()
      .from(petBonds)
      .where(and(eq(petBonds.childId, childId), eq(petBonds.petId, petId)))
      .for('update');
    if (!before) throw new Error('pet bond row vanished inside its transaction');
    const patch = await change(before, tx);
    const [after] = await tx
      .update(petBonds)
      .set(patch)
      .where(and(eq(petBonds.childId, childId), eq(petBonds.petId, petId)))
      .returning();
    return { before, after: after ?? before };
  });
}
