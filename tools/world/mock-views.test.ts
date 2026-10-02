import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import { mockFramePath, readMockViews } from './mock-views';

const dir = path.join(REPO_ROOT, 'content/world/mock-views');
const maps = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

describe.each(maps)('mock views of %s', (mapId) => {
  it('frame mocks that exist, from landmarks of the map, each frame once', async () => {
    const views = await readMockViews(mapId);
    const entities = JSON.parse(await readFile(path.join(ASSETS_DIR, 'generated/world', mapId, 'entities.json'), 'utf8')) as { landmarks: Array<{ id: string }> };
    const landmarks = new Set(entities.landmarks.map((l) => l.id));
    for (const v of views) {
      await expect(access(mockFramePath(v.frame)), v.frame).resolves.toBeUndefined();
      expect(landmarks.has(v.at), `${v.frame} at ${v.at}`).toBe(true);
    }
    expect(new Set(views.map((v) => v.frame)).size).toBe(views.length);
  });
});
