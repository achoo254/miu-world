// The styles of the child's home (content/home/decor.json, mock panels 11 and 12) as the screen shows them,
// and the thing in the house that opens the screen.
import { HomeDecorCatalog, type DecorSide } from '@miu/schema/home-decor';
import decorJson from '../../../../../content/home/decor.json';

export const DECOR_CATALOG = HomeDecorCatalog.parse(decorJson);

/** The decorating notebook on the living room's sideboard (map `nha-cua-be`). */
export const DECOR_TARGET = 'nha-trang-tri';

export const SIDE_LABELS: Readonly<Record<DecorSide, string>> = { inside: 'Trong nhà', outside: 'Ngoài nhà' };

/** Picks that differ from what is saved: what "Lưu" sends. */
export function changedPicks(saved: Readonly<Record<string, string>>, draft: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(draft).filter(([slot, option]) => saved[slot] !== option));
}
