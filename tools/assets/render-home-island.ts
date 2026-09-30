// Renders the Home background: the chapter 1 forest map as a floating island under a fixed camera
// (preview.html `?shot=island`). Home is a React screen over this image, so the GPU stays for /play
// (validation decision `home_scene`). Output: assets/generated/home/island.png — deterministic;
// re-run `pnpm assets:home` whenever the map or the palette changes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS_DIR } from './asset-lib';
import { renderShots } from './render-preview';

export const ISLAND_PATH = 'generated/home/island.png';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await renderShots([
    {
      outDir: path.join(ASSETS_DIR, path.dirname(ISLAND_PATH)),
      label: 'render-home-island',
      shots: async () => [{ file: path.basename(ISLAND_PATH), query: { shot: 'island', quality: 'high' }, viewport: { width: 1600, height: 1000 }, transparent: true }],
    },
  ]);
}
