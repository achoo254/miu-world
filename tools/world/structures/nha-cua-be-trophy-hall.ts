// The child's trophy room (Phòng truyền thống; owner, 08/10/2026: the badges she earns decorate her home, "phòng
// truyền thống đầy đủ"): a little hall of its own on the lawn behind the vegetable garden, in the house's colours,
// its door on the side lane. Inside, the cabinet of event badges against the back wall (each event badge's live
// edition on the lower shelf, its commemorative one above), the achievement plaques over it (one per category,
// three star sockets each), a pedestal for each collection set's cup down either side wall, a rug, plants,
// lanterns. Every badge, cup and star is a display spot (packages/schema trophy-room.ts): it stands only once the
// server says she earned it, an empty stand in its place until then.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ACHIEVEMENT_CATEGORIES } from '../../../packages/schema/src/achievement';
import { CollectibleCatalog } from '../../../packages/schema/src/collectible';
import { Item } from '../../../packages/schema/src/item';
import { LiveEvent } from '../../../packages/schema/src/live-event';
import { PLAQUE_STARS, trophyKey } from '../../../packages/schema/src/trophy-room';
import { PACK } from '../map-kit';
import { REPO_ROOT } from '../../assets/asset-lib';
import type { ZoneMapContext } from '../zone-map';
import { placeHouse, type HouseBlocks } from './buildings';

/** The hall's outer box: its north wall, the door in its middle, faces the side lane. */
export const TROPHY_HALL = { x0: 103, z0: 92, w: 15, d: 13, wall: 7 } as const;

/** What the hall shows, in display order: the badge pairs (live, commemorative) of the events, the sets' map ids. */
export interface TrophyContent {
  badges: Array<{ item: string; commemorative: string; icon: string }>;
  sets: string[];
}

export async function readTrophyContent(): Promise<TrophyContent> {
  const dir = path.join(REPO_ROOT, 'content');
  const json = async (file: string): Promise<unknown> => JSON.parse(await readFile(path.join(dir, file), 'utf8'));
  const items = new Map<string, Item>();
  for (const file of (await readdir(path.join(dir, 'items'))).filter((f) => f.endsWith('.json')).sort()) {
    const item = Item.parse(await json(`items/${file}`));
    items.set(item.id, item);
  }
  const badges: TrophyContent['badges'] = [];
  for (const file of (await readdir(path.join(dir, 'events'))).filter((f) => f.endsWith('.json')).sort()) {
    for (const reward of LiveEvent.parse(await json(`events/${file}`)).rewards) {
      if (reward.kind !== 'badge') continue;
      const icon = items.get(reward.item)?.icon;
      if (!icon) throw new Error(`trophy hall: badge ${reward.item} is not in content/items`);
      badges.push({ item: reward.item, commemorative: reward.commemorativeItem, icon });
    }
  }
  return { badges, sets: CollectibleCatalog.parse(await json('collectibles.json')).sets.map((s) => s.mapId) };
}

const BX = PACK.box;
const PROPS = 'generated/props';
/** A badge's medal by its item's icon (the same picture the backpack shows). */
const MEDALS: Readonly<Record<string, string>> = {
  firstMedal: `${PROPS}/medal-gold.glb`,
  secondMedal: `${PROPS}/medal-silver.glb`,
  thirdMedal: `${PROPS}/medal-bronze.glb`,
  ribbon: `${PROPS}/ribbon.glb`,
};
const M = {
  cabinet: `${BX}/ncb-trophy-cabinet.glb`,
  pedestal: `${BX}/ncb-cup-pedestal.glb`,
  medalGhost: `${BX}/ncb-medal-ghost.glb`,
  cup: `${PROPS}/trophy.glb`,
  cupGhost: `${BX}/ncb-cup-ghost.glb`,
  star: `${PROPS}/glowing-star.glb`,
  starSocket: `${BX}/ncb-star-socket.glb`,
  plaque: (category: string): string => `${BX}/ncb-plaque-${category}.glb`,
  rug: `${BX}/xma-rug.glb`,
  plant: `${PACK.furniture}/pottedPlant.glb`,
  wallLantern: `${BX}/tv-wall-lantern.glb`,
  flowerPot: `${BX}/nt-flower-pot.glb`,
};

/** How tall the pieces stand in the hall (the catalog's sizes are for a medal or a star out in the world). */
export const TROPHY_SIZES: Readonly<Record<string, number>> = {
  [`${PROPS}/medal-gold.glb`]: 0.7,
  [`${PROPS}/medal-silver.glb`]: 0.7,
  [`${PROPS}/medal-bronze.glb`]: 0.7,
  [`${PROPS}/ribbon.glb`]: 0.7,
  [`${PROPS}/trophy.glb`]: 0.75,
  [`${PROPS}/glowing-star.glb`]: 0.36,
};

/** The cabinet's four columns and its two shelves (its own frame: x across, shelves' tops). */
const CABINET_COLUMNS = [-1.5, -0.5, 0.5, 1.5];
const SHELF_LIVE = 0.3;
const SHELF_COMMEMORATIVE = 1.45;
/** Where the stars sit on a plaque (its own frame): three across its cream panel. */
const PLAQUE_STAR_X = [-0.45, 0, 0.45];
const PLAQUE_STAR_Y = 0.3;

/** Builds the hall and its display spots; returns its roof's box (for the house's colours). */
export function buildTrophyHall(ctx: ZoneMapContext, blocks: HouseBlocks, content: TrophyContent, stand: number): { roof: readonly [number, number, number, number, number, number]; walls: readonly [number, number, number, number, number, number] } {
  const { x0, z0, w, d, wall } = TROPHY_HALL;
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const front = placeHouse(ctx.world, x0, z0, w, d, wall, stand, blocks);
  ctx.keepOut(x0 - 2, z0 - 3, x1 + 2, z1 + 2);
  // Flower pots either side of the door, clear of its doorstep.
  for (const [x, z] of front.lamps) ctx.prop(M.flowerPot, x - Math.sign(front.door[0] - x), z, 0);
  // Inside: the floor's middle, its back wall (the cabinet's) and its side walls (the cups').
  const mid = x0 + w / 2;
  const back = z1;
  const yaw = 180; // the cabinet, the plaques and the badges face the door (north)

  // The badge cabinet against the back wall: each event badge's live edition on the lower shelf, its commemorative
  // one on the upper, from the least to the best left to right as she looks at it.
  if (content.badges.length > CABINET_COLUMNS.length) throw new Error(`trophy hall: the cabinet holds ${CABINET_COLUMNS.length} badges, the events give ${content.badges.length}: add a cabinet`);
  const cab = { x: mid, z: back - 0.45 };
  ctx.propAt(M.cabinet, [cab.x, stand, cab.z], yaw);
  for (const [i, badge] of content.badges.entries()) {
    const medal = MEDALS[badge.icon];
    if (!medal) throw new Error(`trophy hall: no medal model for the badge icon ${badge.icon} (${badge.item})`);
    // Turned 180°, the cabinet's own +x is the world's -x: its first column is at her left.
    const x = cab.x - (CABINET_COLUMNS[i] ?? 0);
    for (const [item, shelf] of [[badge.item, SHELF_LIVE], [badge.commemorative, SHELF_COMMEMORATIVE]] as const) {
      const at = [x, stand + shelf, cab.z - 0.05] as const;
      ctx.trophySpot(trophyKey.badge(item), { model: medal, at, yaw }, { model: M.medalGhost, at, yaw });
    }
  }

  // The plaques over the cabinet, one per achievement category, three star sockets each.
  const plaqueY = stand + 3.3;
  const plaqueZ = back - 0.05;
  for (const [i, category] of ACHIEVEMENT_CATEGORIES.entries()) {
    const px = mid - (i - (ACHIEVEMENT_CATEGORIES.length - 1) / 2) * 2.4;
    ctx.propAt(M.plaque(category), [px, plaqueY, plaqueZ], yaw);
    for (let n = 1; n <= PLAQUE_STARS; n++) {
      const at = [px - (PLAQUE_STAR_X[n - 1] ?? 0), plaqueY + PLAQUE_STAR_Y, plaqueZ - 0.08] as const;
      ctx.trophySpot(trophyKey.star(category, n), { model: M.star, at, yaw }, { model: M.starSocket, at, yaw });
    }
  }

  // A pedestal for each collection set's cup, down the west wall then the east one, north to south.
  const perSide = Math.ceil(content.sets.length / 2);
  const first = z0 + 2.2;
  const step = (back - 0.8 - first) / Math.max(perSide - 1, 1);
  for (const [i, mapId] of content.sets.entries()) {
    const west = i < perSide;
    const row = west ? i : i - perSide;
    const x = west ? x0 + 1.55 : x1 - 0.55;
    const z = first + row * step;
    const face = west ? 90 : 270;
    ctx.propAt(M.pedestal, [x, stand, z], face);
    const at = [x, stand + 1, z] as const;
    ctx.trophySpot(trophyKey.cup(mapId), { model: M.cup, at, yaw: face }, { model: M.cupGhost, at, yaw: face });
  }

  // A rug in the middle to sit on, plants and lanterns on the front wall either side of the door.
  ctx.propAt(M.rug, [mid, stand, z0 + d / 2], 0);
  for (const x of [front.doorway.x0 - 2.5, front.doorway.x0 + front.doorway.width + 2.5]) {
    ctx.centredAt(M.plant, [x, stand, z0 + 1.5], 0);
    ctx.propAt(M.wallLantern, [x, stand + 2.4, z0 + 1], 180);
  }
  // Her place before the cabinet, where the room's list opens.
  ctx.target({ id: 'nha-truyen-thong', name: 'Phòng truyền thống', label: 'Xem phòng truyền thống', at: [mid, stand, back - 2.2], yaw, radius: 2.8 });
  ctx.landmark('phong-truyen-thong', 'Phòng truyền thống', Math.floor(mid), z0 + 3, stand);
  return { roof: [x0 - 1, stand + wall, z0 - 1, x1 + 1, front.roofTop, z1 + 1], walls: [x0, stand, z0, x1, stand + wall - 1, z1] };
}
