import { describe, expect, it } from 'vitest';
import { PlayerPresence, ServerWsMessage } from '@miu/schema/multiplayer';
import { PETS } from '../../ui/kit/ui-art';
import { ACCESSORIES, resolveOutfitEntry } from '../content/accessories';
import { equippedVehicle } from '../player/vehicle-ride';

// What another player sees of a child is built from her presence alone, through the same catalogue the child
// herself dresses from. These walk the whole catalogue, so an item added later is covered without a new test.
const presenceWith = (outfit: string[], pet: string | null = null, riding = false) => ({ id: 'player-x', displayName: 'Bạn', species: 'cat', outfit, pet, riding, x: 1, y: 2, z: 3 });

describe('what other players can see of a child', () => {
  it('carries every accessory of the catalogue in a presence and resolves it to a model', () => {
    for (const id of ACCESSORIES.keys()) {
      expect(PlayerPresence.safeParse(presenceWith([id])).success, id).toBe(true);
      expect(() => resolveOutfitEntry(id), id).not.toThrow();
    }
  });

  it('carries a full outfit of one item per slot, whatever the number of slots grows to', () => {
    const perSlot = new Map<string, string>();
    for (const [id, item] of ACCESSORIES) if (!perSlot.has(item.slot)) perSlot.set(item.slot, id);
    const parsed = PlayerPresence.parse(presenceWith([...perSlot.values()]));
    expect(parsed.outfit).toEqual([...perSlot.values()]);
  });

  it('finds the vehicle of every vehicle item so a rider is drawn on it', () => {
    const vehicles = [...ACCESSORIES].filter(([, item]) => item.slot === 'vehicle');
    expect(vehicles.length).toBeGreaterThan(0);
    for (const [id] of vehicles) expect(equippedVehicle([id])?.ride, id).toBeDefined();
  });

  it('carries every pet of the catalogue and the riding flag through the wire format', () => {
    for (const pet of PETS) expect(PlayerPresence.safeParse(presenceWith([], pet.id)).success, pet.id).toBe(true);
    expect(PlayerPresence.parse(presenceWith([])).riding).toBe(false);
    const move = ServerWsMessage.parse({ type: 'move', id: 'player-x', x: 1, y: 2, z: 3, yaw: 0, speed: 0, riding: true });
    expect(move.type === 'move' && move.riding).toBe(true);
  });
});
