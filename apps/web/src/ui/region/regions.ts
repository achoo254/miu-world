// The region catalogue (content/world/regions.json, checked by `pnpm content:check`).
import { RegionCatalog, type Region } from '@miu/schema/region';
import regionsJson from '../../../../../content/world/regions.json';

export const REGIONS: readonly Region[] = RegionCatalog.parse(regionsJson).regions;

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Badge text for a region that is not open yet. */
export function regionLockText(region: Region): string | null {
  if (region.status === 'open') return null;
  if (region.status === 'level') return `Cần Lv.${region.level ?? ''}`;
  return region.status === 'v1' ? 'Sắp có' : 'Sắp mở';
}
