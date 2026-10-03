// The styles of the child's home (content/home/decor.json, mock panels 11 and 12) as the screen shows them,
// and the thing in the house that opens the screen.
import type { CSSProperties } from 'react';
import { HomeDecorCatalog, type DecorSide } from '@miu/schema/home-decor';
import decorJson from '../../../../../content/home/decor.json';
import type { TextKey } from '../i18n/i18n';

export const DECOR_CATALOG = HomeDecorCatalog.parse(decorJson);

/** The decorating notebook on the living room's sideboard (map `nha-cua-be`). */
export const DECOR_TARGET = 'nha-trang-tri';

export const SIDE_LABELS: Readonly<Record<DecorSide, TextKey>> = { inside: 'decor.inside', outside: 'decor.outside' };

/** Picks that differ from what is saved: what "Lưu" sends. */
export function changedPicks(saved: Readonly<Record<string, string>>, draft: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(draft).filter(([slot, option]) => saved[slot] !== option));
}

/** A style's colours as bands across its round chip (the decorating screen, the shop). */
export function swatchStyle(colours: readonly string[]): CSSProperties {
  if (colours.length === 1) return { background: colours[0] };
  const step = 100 / colours.length;
  return { background: `linear-gradient(135deg, ${colours.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})` };
}
