// The camera of each frame of the owner's detail mocks (designs/<folder>/<frame>.png, 02/10/2026) on the map
// that follows it, so the review page sets the frame beside the same view in the game. One file per map,
// content/world/mock-views/<map id>.json: a view stands at a landmark of the map (entities.json `landmarks`,
// zones first) and looks from `eye` to `look`, both offsets in blocks from that landmark, so a view keeps
// its subject when the map is laid out again.
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';

const offset = z.tuple([z.number(), z.number(), z.number()]);

export const mockViewsSchema = z.object({
  views: z.array(
    z.object({
      /** The mock frame, `<folder under designs/>/<file name without .png>`. */
      frame: z.string().regex(/^[a-z0-9-]+\/[a-z]-\d{2}-[a-z0-9-]+$/),
      /** The landmark the view is framed on. */
      at: z.string(),
      eye: offset,
      look: offset.default([0, 0, 0]),
      fov: z.number().min(20).max(100).default(60),
      /** How far round the landmark the map is loaded, in blocks: an overview reaches its far hills and falls. */
      reach: z.number().int().min(60).max(900).default(140),
      /** `dusk` for the mocks' evening and night frames: the evening sky, lanterns aglow. */
      mood: z.enum(['day', 'dusk']).default('day'),
    }),
  ),
});
export type MockView = z.infer<typeof mockViewsSchema>['views'][number];

export const mockViewsFile = (mapId: string): string => path.join(REPO_ROOT, 'content/world/mock-views', `${mapId}.json`);
export const mockFramePath = (frame: string): string => path.join(REPO_ROOT, 'designs', `${frame}.png`);

/** A map's mock views; none when it has no file. */
export async function readMockViews(mapId: string): Promise<MockView[]> {
  const file = mockViewsFile(mapId);
  try {
    await access(file);
  } catch {
    return [];
  }
  return mockViewsSchema.parse(JSON.parse(await readFile(file, 'utf8'))).views;
}

/**
 * The picture a view is saved as under the map's review folder: `mock__<folder>__<frame>.png`, which the
 * review page splits back into the frame it sits beside.
 */
export const mockShotFile = (frame: string): string => `mock__${frame.replace('/', '__')}.png`;
