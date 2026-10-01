// Renders each pet's picture for its Character Creator tile from its model (content/pets.json), on a
// transparent background, in the same three-quarter view as the character portraits. Output:
// assets/generated/pets/<id>.png — re-run `pnpm assets:pets` after adding a pet.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { PetCatalog, petArtPath } from '../../packages/schema/src/pet';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { renderShots, type Shot } from './render-preview';

export async function petShots(): Promise<Shot[]> {
  const { pets } = PetCatalog.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/pets.json'), 'utf8')));
  return pets.map((pet) => ({
    file: path.basename(petArtPath(pet.id)),
    query: { model: pet.model, anim: 'idle', t: 0, yaw: 35, pitch: 14, size: 256, bg: 'transparent' },
    transparent: true,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await renderShots([{ outDir: path.join(ASSETS_DIR, path.dirname(petArtPath('x'))), label: 'render-pet-art', shots: petShots }]);
}
