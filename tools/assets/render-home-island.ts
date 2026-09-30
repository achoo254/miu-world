// Renders the Home and world-map background: the world overview map (one floating island per region,
// tools/world/generate-world-overview.ts) from the shared overview camera (preview.html `?world=`). Home
// is a React screen over this image, so the GPU stays for /play (validation decision `home_scene`).
// Output: assets/generated/home/world.png — deterministic; re-run `pnpm assets:home` after
// `pnpm world:overview` or a palette change.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORLD_OVERVIEW_IMAGE, WORLD_OVERVIEW_MAP } from '../../packages/voxel/src/world-overview';
import { ASSETS_DIR } from './asset-lib';
import { renderShots } from './render-preview';

export const WORLD_IMAGE_PATH = 'generated/home/world.png';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await renderShots([
    {
      outDir: path.join(ASSETS_DIR, path.dirname(WORLD_IMAGE_PATH)),
      label: 'render-home-island',
      shots: async () => [{ file: path.basename(WORLD_IMAGE_PATH), query: { world: WORLD_OVERVIEW_MAP }, viewport: { ...WORLD_OVERVIEW_IMAGE }, transparent: true }],
    },
  ]);
}
