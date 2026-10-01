// The region catalogue (content/world/regions.json, checked by `pnpm content:check`).
import { RegionCatalog, defaultRegion, mapForRegion, type Region } from '@miu/schema/region';
import regionsJson from '../../../../../content/world/regions.json';
import type { MusicMood } from '../sound/music';

const CATALOG = RegionCatalog.parse(regionsJson);
export const REGIONS: readonly Region[] = CATALOG.regions;

/** Region play starts in when no quest names one. */
export const DEFAULT_REGION = defaultRegion(CATALOG).id;

/** Generated map a region plays in (`assets/generated/world/<map>`). */
export const regionMap = (region: string): string => mapForRegion(CATALOG, region);

/** Region → the music pool played while walking about it (`music` in regions.json, checked by `pnpm content:check`). */
export const REGION_MUSIC: Readonly<Record<string, MusicMood>> = Object.fromEntries(REGIONS.flatMap((r) => (r.music ? [[r.id, r.music as MusicMood]] : [])));

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Badge text for a region whose map is not built yet; a built map is always open (nothing is locked). */
export function regionLockText(region: Region): string | null {
  if (region.status === 'open') return null;
  return region.status === 'v1' ? 'Sắp có' : 'Sắp mở';
}
