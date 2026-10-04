// Đồ sưu tầm (content/collectibles.json): one set of ten things per region, each thing an item of
// content/items (its name, picture and description live there). A completed quest or minigame run in a region
// drops one thing of that region's set; a full set pays its reward once. The server computes both.
import { z } from 'zod';
import { ContentId } from './content';
import { ProgressResponse } from './game';

export const CollectibleRarity = z.enum(['common', 'uncommon', 'rare']);
export type CollectibleRarity = z.infer<typeof CollectibleRarity>;

/** A thing of a set: an item id (content/items/<id>.json, kind `collectible`), how rare it drops, a line of lore. */
export const CollectibleEntry = z.strictObject({
  id: ContentId,
  rarity: CollectibleRarity,
  lore: z.string().min(1),
});
export type CollectibleEntry = z.infer<typeof CollectibleEntry>;

export const CollectibleSet = z.strictObject({
  /** The region whose quests and minigames drop this set (content/world/regions.json). */
  mapId: ContentId,
  name: z.string().min(1),
  description: z.string().min(1),
  /** English twins of the set's name and title, for the bilingual display. */
  en: z.strictObject({ name: z.string().min(1), title: z.string().min(1) }).optional(),
  items: z.array(CollectibleEntry).min(1),
  reward: z.strictObject({
    coins: z.number().int().positive(),
    title: z.string().min(1),
  }),
});
export type CollectibleSet = z.infer<typeof CollectibleSet>;

export const CollectibleCatalog = z.strictObject({
  version: z.literal(1),
  sets: z.array(CollectibleSet).min(1),
});
export type CollectibleCatalog = z.infer<typeof CollectibleCatalog>;

/** Things in every set (the Sổ sưu tập shows ten slots a page). */
export const SET_SIZE = 10;

/**
 * What does not fit the content: a set per known region at most, ten distinct things a set, a thing in one set
 * only, and (when `items` is given) each thing an item of kind `collectible`, every such item in a set.
 */
export function collectibleIssues(catalog: CollectibleCatalog, known: { regions: ReadonlySet<string>; items?: ReadonlyMap<string, { kind: string }> }): string[] {
  const issues: string[] = [];
  const maps = new Set<string>();
  const things = new Set<string>();
  for (const set of catalog.sets) {
    if (!known.regions.has(set.mapId)) issues.push(`set ${set.mapId}: no such region`);
    if (maps.has(set.mapId)) issues.push(`set ${set.mapId}: listed twice`);
    maps.add(set.mapId);
    if (set.items.length !== SET_SIZE) issues.push(`set ${set.mapId}: ${set.items.length} things, not ${SET_SIZE}`);
    for (const { id } of set.items) {
      if (things.has(id)) issues.push(`set ${set.mapId}: ${id} is in another set too`);
      things.add(id);
      const item = known.items?.get(id);
      if (known.items && !item) issues.push(`set ${set.mapId}: ${id} has no content/items/${id}.json`);
      else if (item && item.kind !== 'collectible') issues.push(`set ${set.mapId}: item ${id} is not of kind collectible`);
    }
  }
  for (const [id, item] of known.items ?? []) {
    if (item.kind === 'collectible' && !things.has(id)) issues.push(`item ${id} is a collectible in no set`);
  }
  return issues;
}

/** Ledger source of the thing dropped by a paid quest run (`quest:<id>` or `quest:<id>#<run>`). */
export const collectibleDropSource = (runSource: string): string => `drop:${runSource}`;
/** Ledger source of a full set's reward. */
export const collectionSource = (mapId: string): string => `collection:${mapId}`;
/** Region of a set reward's ledger source; null for any other source. */
export function collectionOfSource(source: string): string | null {
  return /^collection:([a-z0-9-]+)$/.exec(source)?.[1] ?? null;
}

/** One set as the selected child has it (`GET /api/collection`). */
export const CollectionSetDto = z.object({
  mapId: ContentId,
  /** Things she owns, with how many of each (only owned ones are listed). */
  owned: z.record(ContentId, z.number().int().positive()),
  found: z.number().int().min(0),
  total: z.number().int().positive(),
  complete: z.boolean(),
  claimed: z.boolean(),
  reward: z.object({ coins: z.number().int().positive(), title: z.string().min(1) }),
});
export type CollectionSetDto = z.infer<typeof CollectionSetDto>;

export const CollectionResponse = z.object({
  sets: z.array(CollectionSetDto),
  /** Titles of the sets whose reward she claimed, first claimed first. */
  titles: z.array(z.string()),
});
export type CollectionResponse = z.infer<typeof CollectionResponse>;

export const CollectionClaimRequest = z.strictObject({ mapId: ContentId });
export type CollectionClaimRequest = z.infer<typeof CollectionClaimRequest>;

export const CollectionClaimResponse = z.object({
  set: CollectionSetDto,
  /** False when the reward had been claimed before: nothing was paid this time. */
  granted: z.boolean(),
  /** Coins paid by this call (0 when not granted). */
  coins: z.number().int().min(0),
  title: z.string().min(1),
  progress: ProgressResponse,
});
export type CollectionClaimResponse = z.infer<typeof CollectionClaimResponse>;
