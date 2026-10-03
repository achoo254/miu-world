// Renders each wearable item's picture for its Character Creator tile from its voxel JSON
// (content/accessories/*.json), on a transparent background, from the side that shows it best.
// Output: assets/generated/accessories/<id>.png — re-run `pnpm assets:accessories` after adding an item.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ACCESSORY_ART_DIR, accessoryArtPath } from '../../packages/schema/src/accessory-art';
import type { AccessoryItem } from '../../packages/voxel/src/accessory-schema';
import { ASSETS_DIR } from './asset-lib';
import { readAccessoryCatalog, renderShots, type Shot } from './render-preview';

/** Camera yaw per slot: worn behind (bags, wings) reads best from the back, the rest from the front. */
const YAW: Record<AccessoryItem['slot'], number> = { hat: 30, glasses: 20, scarf: 30, back: 210, wings: 200, shoes: 35, hand: 35, clothes: 25, vehicle: 35 };

export async function accessoryArtShots(): Promise<Shot[]> {
  return [...(await readAccessoryCatalog()).values()].map((item) => ({
    file: path.basename(accessoryArtPath(item.id)),
    query: { item: item.id, yaw: YAW[item.slot], pitch: 22, size: 128, bg: 'transparent' },
    transparent: true,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await renderShots([{ outDir: path.join(ASSETS_DIR, ACCESSORY_ART_DIR), label: 'render-accessory-art', shots: accessoryArtShots }]);
}
