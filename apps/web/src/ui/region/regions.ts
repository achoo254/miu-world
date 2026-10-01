// The region catalogue (content/world/regions.json, checked by `pnpm content:check`).
import { RegionCatalog, type Region } from '@miu/schema/region';
import regionsJson from '../../../../../content/world/regions.json';

export const REGIONS: readonly Region[] = RegionCatalog.parse(regionsJson).regions;

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Badge text for a region whose map is not built yet; a built map is always open (nothing is locked). */
export function regionLockText(region: Region): string | null {
  if (region.status === 'open') return null;
  return region.status === 'v1' ? 'Sắp có' : 'Sắp mở';
}
