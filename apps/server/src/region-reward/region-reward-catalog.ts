import path from 'node:path';
import type { PlayableQuest } from '@miu/schema/content';
import { RegionCatalog } from '@miu/schema/region';
import { RegionRewardCatalog, regionRewardIssues, type RegionRewardEntry } from '@miu/schema/region-reward';
import type { AccessoryItem } from '@miu/voxel/accessory-schema';
import { readContentJson } from '../content/content-catalog';
import { CONTENT_DIR } from '../content/content-dir';

/** The region chests the server pays (content/region-rewards.json), by region id. */
export interface RegionRewards {
  /** Side-quest minigame runs a region's bonus asks for. */
  minigameGoal: number;
  entries: ReadonlyMap<string, RegionRewardEntry>;
}

/**
 * Active quests of each region in one category, by region id, in catalogue order: `main`, the lessons a chest
 * counts; `side`, the minigames characters offer (its small bonus).
 */
export function questsByRegion(quests: Iterable<PlayableQuest>, category: 'main' | 'side'): Map<string, string[]> {
  const byRegion = new Map<string, string[]>();
  for (const quest of quests) {
    if (quest.status !== 'active' || quest.category !== category) continue;
    byRegion.set(quest.region, [...(byRegion.get(quest.region) ?? []), quest.id]);
  }
  return byRegion;
}

/**
 * The chests checked against the regions and the wearables they give. A catalogue that does not fit the
 * content fails the boot (and `pnpm content:check`), never a request. `lessons`: lesson quests per region,
 * checked when given (the content check passes the shipped quests; the server's tests play fixture quests).
 */
export function loadRegionRewards(accessories: ReadonlyMap<string, AccessoryItem>, dir: string = CONTENT_DIR, lessons?: ReadonlyMap<string, number>): RegionRewards {
  const catalog = readContentJson(RegionRewardCatalog, path.join(dir, 'region-rewards.json'));
  const regions = readContentJson(RegionCatalog, path.join(dir, 'world/regions.json'));
  const issues = regionRewardIssues(catalog, {
    regions: new Map(regions.regions.map((r) => [r.id, { open: r.status === 'open' }])),
    wearables: new Map([...accessories.values()].map((item) => [item.id, { region: item.unlock?.region }])),
    lessons,
  });
  if (issues.length > 0) throw new Error(`invalid region rewards: ${issues.join('; ')}`);
  return { minigameGoal: catalog.minigameGoal, entries: new Map(catalog.regions.map((entry) => [entry.region, entry])) };
}
