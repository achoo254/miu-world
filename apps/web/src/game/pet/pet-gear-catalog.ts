// What a pet may wear (content/pet-gear.json, checked by `pnpm content:check`), for the game (drawn on the pet,
// hers and the other players') and the care screen (names, pictures).
import { PetGearCatalog, gearSlot, type PetGearItem } from '@miu/schema/pet-gear';
import type { PetGearSlot } from '@miu/schema/pet-care';
import petGearJson from '../../../../../content/pet-gear.json';
import type { PetGearLook } from '../entities/pet-companion';

export const PET_GEAR: ReadonlyMap<string, PetGearItem> = new Map(PetGearCatalog.parse(petGearJson).items.map((item) => [item.id, item]));

/** The looks of the gear among `ids` the catalogue knows (an id it no longer has is left off). */
export function gearLooks(ids: readonly string[]): PetGearLook[] {
  return ids.flatMap((id) => {
    const item = PET_GEAR.get(id);
    return item ? [{ id, shape: item.shape, colors: item.colors }] : [];
  });
}

/** The slot of a piece of gear (null for one the catalogue does not have). */
export const gearSlotOf = (id: string): PetGearSlot | null => {
  const item = PET_GEAR.get(id);
  return item ? gearSlot(item) : null;
};
