// Builds one region of a map as the game holds it (128 x 128 columns, the whole height): the outer land
// generated from the map's seed (packages/voxel outland-*.ts), with the core's own region file laid over
// the columns of the core. Pure data in and out, so it runs the same in the region worker and, when module
// workers fail, on the main thread.
import { VoxelWorld, decodeWorld } from '@miu/voxel/chunk-format';
import { outlandBlocks, type OutlandSpec } from '@miu/voxel/outland';
import { planOutland, type OutlandPlan } from '@miu/voxel/outland-plan';
import { fillOutlandRegion } from '@miu/voxel/outland-region';
import { REGION_CHUNKS } from '@miu/voxel/region-format';

export interface RegionBuilderInit {
  /** The core's size (entities.json `size`). */
  size: [number, number, number];
  waterLevel: number;
  /** Absent: the map ends at its edge, and only the core's regions exist. */
  outland: OutlandSpec | null;
  blocks: ReadonlyArray<{ id: number; name: string }>;
}

/** Builds region (rx, rz): `core` is the core's region file there, when the region overlaps the core. */
export type RegionBuilder = (rx: number, rz: number, core: Uint8Array | null) => VoxelWorld;

export function createRegionBuilder(init: RegionBuilderInit): { build: RegionBuilder; plan: OutlandPlan | null } {
  const plan = init.outland ? planOutland(init.outland, init.size, init.waterLevel) : null;
  const ids = plan ? outlandBlocks(init.blocks, init.outland?.soil) : null;
  const shape = [REGION_CHUNKS, init.size[1] / 16, REGION_CHUNKS] as const;
  const build: RegionBuilder = (rx, rz, core) => {
    const out = new VoxelWorld(shape);
    if (plan && ids) fillOutlandRegion(plan, ids, rx, rz, out);
    if (core) {
      // The core's file holds whole chunks from the region's corner (narrower at the core's far edge).
      const part = decodeWorld(core);
      for (let cy = 0; cy < part.chunks[1]; cy++) {
        for (let cz = 0; cz < part.chunks[2]; cz++) {
          for (let cx = 0; cx < part.chunks[0]; cx++) out.chunkData(cx, cy, cz).set(part.chunkData(cx, cy, cz));
        }
      }
    }
    return out;
  };
  return { build, plan };
}
