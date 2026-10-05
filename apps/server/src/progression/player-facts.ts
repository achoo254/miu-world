import { asc, eq } from 'drizzle-orm';
import type { AchievementMetric } from '@miu/schema/achievement';
import { collectionOfSource } from '@miu/schema/collectible';
import { regionRewardOfSource } from '@miu/schema/region-reward';
import { skillGiftOfSource } from '@miu/schema/progression';
import { levelFromXp } from '@miu/quest/level';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress, rewardLedger, shopInventory, skillProgress } from '../db/schema';
import { gateOfSource } from '../quest/knowledge-gate';
import { questOfSource, type Tx } from '../reward/reward-ledger';

/** One ledger row as the journey and the achievements read it. */
export interface LedgerRow {
  source: string;
  xp: number;
  coins: number;
  skillXp: Record<string, number>;
  items: Record<string, number>;
  createdAt: Date;
}

/** Everything the server already keeps about a player's play: no new data is collected for these screens. */
export interface PlayerRecord {
  quests: Array<{ questId: string; completedAt: Date | null; stars: number | null }>;
  /** Oldest first. */
  ledger: LedgerRow[];
  skills: ReadonlyMap<string, number>;
  /** Story items and collectibles (inventory_items), with a count above zero. */
  inventory: ReadonlyMap<string, number>;
  /** Her cupboard (shop_inventory): bought or received wearables, home styles, boosters, with a count above zero. */
  cupboard: ReadonlyMap<string, number>;
}

export async function loadPlayerRecord(db: Db | Tx, childId: string): Promise<PlayerRecord> {
  const quests = await db.select({ questId: questProgress.questId, completedAt: questProgress.completedAt, stars: questProgress.stars }).from(questProgress).where(eq(questProgress.childId, childId));
  const ledger = await db
    .select({ source: rewardLedger.source, xp: rewardLedger.xp, coins: rewardLedger.coins, skillXp: rewardLedger.skillXp, items: rewardLedger.items, createdAt: rewardLedger.createdAt })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId))
    .orderBy(asc(rewardLedger.createdAt), asc(rewardLedger.source));
  const skills = await db.select().from(skillProgress).where(eq(skillProgress.childId, childId));
  const inventory = await db.select().from(inventoryItems).where(eq(inventoryItems.childId, childId));
  const cupboard = await db.select().from(shopInventory).where(eq(shopInventory.childId, childId));
  return {
    quests,
    ledger,
    skills: new Map(skills.map((s) => [s.skillId, s.xp])),
    inventory: new Map(inventory.filter((i) => i.qty > 0).map((i) => [i.itemId, i.qty])),
    cupboard: new Map(cupboard.filter((i) => i.qty > 0).map((i) => [i.itemId, i.qty])),
  };
}

/**
 * The active lessons and minigame side quests of each region, in catalogue order (story chapters, co-op challenges and
 * zone guardians are neither).
 */
export function regionQuests(content: ContentCatalog): { lessons: Map<string, string[]>; minigames: Map<string, string[]> } {
  const lessons = new Map<string, string[]>();
  const minigames = new Map<string, string[]>();
  for (const quest of content.quests.values()) {
    if (quest.status !== 'active') continue;
    const category = quest.category ?? 'main';
    const into = category === 'side' ? minigames : category === 'main' ? lessons : null;
    if (!into) continue;
    into.set(quest.region, [...(into.get(quest.region) ?? []), quest.id]);
  }
  return { lessons, minigames };
}

/** Counts every achievement metric reads, computed once per request. */
export interface PlayerFacts {
  lessonsDone: ReadonlySet<string>;
  threeStars: number;
  lessonsByRegion: ReadonlyMap<string, number>;
  regionsStarted: number;
  regionsComplete: number;
  questRuns: number;
  minigameRuns: number;
  minigameRunsByRegion: ReadonlyMap<string, number>;
  minigamesTried: number;
  bossWins: number;
  playerLevel: number;
  skillLevels: ReadonlyMap<string, number>;
  subjectLevels: ReadonlyMap<string, number>;
  coinsEarned: number;
  collectibles: number;
  collectionSets: number;
  regionChests: number;
  regionTiers: number;
  wearablesOwned: number;
  shopPurchases: number;
  olympiadRuns: number;
  olympiadAwards: number;
  mailGifts: number;
  gatesOpened: number;
  skillGifts: number;
  coopRuns: number;
  coopChallenges: number;
}

const count = <T>(list: readonly T[], keep: (item: T) => boolean): number => list.filter(keep).length;

export function playerFacts(content: ContentCatalog, record: PlayerRecord): PlayerFacts {
  const { lessons, minigames } = regionQuests(content);
  const done = new Set(record.quests.filter((q) => q.completedAt !== null).map((q) => q.questId));
  const categoryOf = (id: string): string | null => {
    const quest = content.quests.get(id);
    return quest?.status === 'active' ? (quest.category ?? 'main') : null;
  };
  const isLesson = (id: string): boolean => categoryOf(id) === 'main';
  const lessonsDone = new Set([...done].filter(isLesson));
  const lessonsByRegion = new Map([...lessons].map(([region, ids]) => [region, ids.filter((id) => lessonsDone.has(id)).length]));
  const sources = record.ledger.map((row) => row.source);
  const runs = sources.flatMap((source) => questOfSource(source) ?? []);
  const sideRuns = runs.filter((id) => categoryOf(id) === 'side');
  const regionOf = new Map([...minigames].flatMap(([region, ids]) => ids.map((id) => [id, region] as const)));
  const minigameRunsByRegion = new Map<string, number>();
  for (const id of sideRuns) {
    const region = regionOf.get(id);
    if (region) minigameRunsByRegion.set(region, (minigameRunsByRegion.get(region) ?? 0) + 1);
  }
  const skillLevels = new Map(content.subjects.flatMap((s) => s.skills.map((k) => [k.id, levelFromXp(record.skills.get(k.id) ?? 0, content.skillCurve).level] as const)));
  const subjectLevels = new Map(
    content.subjects.map((s) => [s.id, levelFromXp(s.skills.reduce((sum, k) => sum + (record.skills.get(k.id) ?? 0), 0), content.skillCurve).level] as const),
  );
  const collectibleIds = new Set([...content.collectibles.values()].flatMap((set) => set.items.map((item) => item.id)));
  const regionClaims = sources.flatMap((source) => regionRewardOfSource(source) ?? []);
  const olympiad = sources.flatMap((source) => /^olympiad:exam:\d+:([a-z-]+):/.exec(source)?.[1] ?? []);
  // A map's big boss (a lesson that ends in a boss fight); its zone guardians' short fights are not counted.
  const isBoss = (id: string): boolean => {
    const quest = content.quests.get(id);
    return quest?.status === 'active' && (quest.category ?? 'main') === 'main' && quest.steps.some((step) => step.kind === 'boss');
  };
  return {
    lessonsDone,
    threeStars: count(record.quests, (q) => q.completedAt !== null && (q.stars ?? 0) >= 3 && isLesson(q.questId)),
    lessonsByRegion,
    regionsStarted: count([...lessonsByRegion.values()], (n) => n > 0),
    regionsComplete: count([...lessons], ([region, ids]) => ids.length > 0 && lessonsByRegion.get(region) === ids.length),
    questRuns: count(runs, isLesson),
    minigameRuns: sideRuns.length,
    minigameRunsByRegion,
    minigamesTried: new Set(sideRuns).size,
    bossWins: count([...done], isBoss),
    playerLevel: levelFromXp(record.ledger.reduce((sum, row) => sum + row.xp, 0), content.levelCurve).level,
    skillLevels,
    subjectLevels,
    coinsEarned: record.ledger.reduce((sum, row) => sum + Math.max(0, row.coins), 0),
    collectibles: count([...record.inventory.keys()], (id) => collectibleIds.has(id)),
    collectionSets: count(sources, (source) => collectionOfSource(source) !== null),
    regionChests: count(regionClaims, (claim) => claim.tier === 'full'),
    regionTiers: regionClaims.length,
    wearablesOwned: count([...record.cupboard.keys()], (id) => content.accessories.has(id)),
    shopPurchases: count(sources, (source) => source.startsWith('shop:')),
    olympiadRuns: olympiad.length,
    olympiadAwards: count(olympiad, (award) => award !== 'none'),
    mailGifts: count(sources, (source) => source.startsWith('mail:claim:')),
    gatesOpened: new Set(sources.flatMap((source) => gateOfSource(source) ?? [])).size,
    skillGifts: count(sources, (source) => skillGiftOfSource(source) !== null),
    coopRuns: count(runs, (id) => categoryOf(id) === 'coop'),
    coopChallenges: new Set(runs.filter((id) => categoryOf(id) === 'coop')).size,
  };
}

/** How far the player is on one metric (before capping at the goal). */
export function metricValue(metric: AchievementMetric, facts: PlayerFacts): number {
  switch (metric.kind) {
    case 'lessons':
      return metric.region ? (facts.lessonsByRegion.get(metric.region) ?? 0) : facts.lessonsDone.size;
    case 'regions-started':
      return facts.regionsStarted;
    case 'regions-complete':
      return facts.regionsComplete;
    case 'three-stars':
      return facts.threeStars;
    case 'quest-runs':
      return facts.questRuns;
    case 'minigame-runs':
      return metric.region ? (facts.minigameRunsByRegion.get(metric.region) ?? 0) : facts.minigameRuns;
    case 'minigames-tried':
      return facts.minigamesTried;
    case 'boss-wins':
      return facts.bossWins;
    case 'player-level':
      return facts.playerLevel;
    case 'skill-level':
      return facts.skillLevels.get(metric.skill) ?? 1;
    case 'skills-at-level':
      return count([...facts.skillLevels.values()], (level) => level >= metric.level);
    case 'subject-level':
      return facts.subjectLevels.get(metric.subject) ?? 1;
    case 'coins-earned':
      return facts.coinsEarned;
    case 'collectibles':
      return facts.collectibles;
    case 'collection-sets':
      return facts.collectionSets;
    case 'region-chests':
      return facts.regionChests;
    case 'region-tiers':
      return facts.regionTiers;
    case 'wearables-owned':
      return facts.wearablesOwned;
    case 'shop-purchases':
      return facts.shopPurchases;
    case 'olympiad-runs':
      return facts.olympiadRuns;
    case 'olympiad-awards':
      return facts.olympiadAwards;
    case 'mail-gifts':
      return facts.mailGifts;
    case 'gates-opened':
      return facts.gatesOpened;
    case 'skill-gifts':
      return facts.skillGifts;
    case 'coop-runs':
      return facts.coopRuns;
    case 'coop-challenges':
      return facts.coopChallenges;
  }
}
