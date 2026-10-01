// Renders the region screen's art from the maps themselves: one backdrop per region that names a
// camera in content/world/regions.json (`backdrop`), seen through the real game on that region's map
// (preview.html `?shot=view:…`, no player), and the treasure chest of the progress card from the quest
// chest model. Output: assets/generated/regions/ — re-run `pnpm assets:regions` after a map, palette
// or camera change. A new region needs only its `backdrop` entry.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { REGION_CHEST_ICON, REGION_CHEST_MODEL, RegionCatalog, regionBackdropPath } from '../../packages/schema/src/region';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { renderShots, type Shot } from './render-preview';

/** Backdrops fill the screen behind the region panels: 16:10, sharp on an iPad held either way. */
const BACKDROP_VIEWPORT = { width: 1440, height: 900 };

export async function regionArtShots(): Promise<Shot[]> {
  const catalog = RegionCatalog.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/regions.json'), 'utf8')));
  const backdrops = catalog.regions.flatMap((region) => {
    const view = region.backdrop;
    if (!view) return [];
    const shot = `view:${view.eye.join(',')}:${view.target.join(',')}:${view.fov}`;
    return [{ file: path.basename(regionBackdropPath(region.id)), query: { shot, quality: 'high', region: region.id }, viewport: BACKDROP_VIEWPORT }];
  });
  const chest: Shot = { file: path.basename(REGION_CHEST_ICON), query: { model: REGION_CHEST_MODEL, yaw: 35, pitch: 22, size: 256, bg: 'transparent' }, transparent: true };
  return [...backdrops, chest];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await renderShots([{ outDir: path.join(ASSETS_DIR, path.dirname(REGION_CHEST_ICON)), label: 'render-region-art', shots: regionArtShots }]);
}
