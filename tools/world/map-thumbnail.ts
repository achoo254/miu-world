// `pnpm tsx tools/world/map-thumbnail.ts <map id> <out.png> [pixels per block]`: a top-down picture of a
// generated map, read from its region files and entities.json, for judging a layout without a browser:
// each column coloured by its top block and shaded by height, props as small dots, quest characters red,
// quest things yellow, villagers and animals blue, the spawn white. Not an asset (write it outside assets/).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { CHUNK_SIZE, VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { insertRegion } from '../../packages/voxel/src/region-format';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { REPO_ROOT, readJson } from '../assets/asset-lib';
import { mapDir } from './map-kit';

/** Plain colours of the blocks seen from above (by name in content/blocks.json); anything else is grey. */
const TOP: Record<string, [number, number, number]> = {
  grass: [104, 170, 82], dirt: [134, 96, 67], stone: [128, 128, 128], sand: [222, 205, 150], log: [110, 82, 50], leaves: [58, 128, 52],
  planks: [184, 142, 90], path: [170, 166, 156], water: [64, 128, 210], 'rock-moss': [96, 120, 90], 'birch-log': [215, 210, 190],
  'leaves-autumn': [214, 128, 48], riverbed: [110, 104, 92], snow: [245, 245, 245], 'brick-red': [178, 64, 52], 'brick-grey': [140, 140, 146],
  'wood-red': [168, 70, 50], glass: [180, 220, 235], 'roof-blue': [58, 102, 178], asphalt: [60, 62, 66], 'leaves-pink': [236, 160, 190],
  board: [40, 80, 60], 'tree-log': [110, 82, 50], 'tree-birch-log': [215, 210, 190],
};

async function main(): Promise<void> {
  const [mapId, out, scaleArg] = process.argv.slice(2);
  if (!mapId || !out) throw new Error('usage: map-thumbnail.ts <map id> <out.png> [pixels per block]');
  const scale = Number(scaleArg ?? 2);
  const dir = mapDir(mapId);
  const entities = worldEntitiesSchema.parse(JSON.parse(await readFile(path.join(dir, 'entities.json'), 'utf8')));
  const [sx, sy, sz] = entities.size;
  const world = new VoxelWorld([sx / CHUNK_SIZE, sy / CHUNK_SIZE, sz / CHUNK_SIZE]);
  for (const file of await readdir(path.join(dir, 'regions'))) {
    const [, rx = '0', rz = '0'] = /^r(\d+)-(\d+)\.bin$/.exec(file) ?? [];
    insertRegion(world, Number(rx), Number(rz), new Uint8Array(await readFile(path.join(dir, 'regions', file))));
  }
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const colourOf = new Map(table.blocks.map((b) => [b.id, TOP[b.name] ?? [150, 150, 150]] as const));

  const png = new PNG({ width: sx * scale, height: sz * scale });
  const paint = (x: number, z: number, [r, g, b]: readonly [number, number, number], size = scale): void => {
    for (let dx = 0; dx < size; dx++) {
      for (let dz = 0; dz < size; dz++) {
        const px = Math.floor(x * scale) + dx;
        const pz = Math.floor(z * scale) + dz;
        if (px < 0 || pz < 0 || px >= png.width || pz >= png.height) continue;
        const i = (pz * png.width + px) * 4;
        png.data[i] = r;
        png.data[i + 1] = g;
        png.data[i + 2] = b;
        png.data[i + 3] = 255;
      }
    }
  };
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      let y = sy - 1;
      while (y > 0 && world.get(x, y, z) === 0) y--;
      const [r = 0, g = 0, b = 0] = colourOf.get(world.get(x, y, z)) ?? [];
      const shade = 0.75 + 0.5 * (y / sy);
      paint(x, z, [Math.min(255, r * shade), Math.min(255, g * shade), Math.min(255, b * shade)]);
    }
  }
  const dot = Math.max(1, Math.round(scale * 1.5));
  for (const p of entities.props) paint(p.position[0], p.position[2], [70, 50, 30], Math.max(1, Math.round(scale / 2)));
  for (const a of entities.ambients ?? []) paint(a.position[0], a.position[2], [40, 90, 230], dot);
  for (const t of entities.interactables) paint(t.position[0], t.position[2], t.kind === 'npc' ? [220, 30, 30] : [245, 200, 20], dot);
  paint(entities.spawn.position[0] - 1, entities.spawn.position[2] - 1, [255, 255, 255], dot * 2);
  await writeFile(out, PNG.sync.write(png));
  console.log(`${mapId}: ${sx} x ${sz} blocks → ${out} (${png.width} x ${png.height}), ${entities.props.length} props, ${entities.interactables.length} targets, ${entities.ambients?.length ?? 0} ambients`);
}

await main();
