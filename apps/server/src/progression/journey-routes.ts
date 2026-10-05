import { Router } from 'express';
import { achievementOfSource } from '@miu/schema/achievement';
import { collectionOfSource } from '@miu/schema/collectible';
import { JOURNEY_EVENT_LIMIT, JOURNEY_TABS, JourneyTab, type JourneyEvent, type JourneyEventKind, type JourneyRegion, type JourneyResponse } from '@miu/schema/journey';
import { skillGiftOfSource } from '@miu/schema/progression';
import { regionRewardOfSource } from '@miu/schema/region-reward';
import { levelFromXp } from '@miu/quest/level';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { HttpError } from '../http-error';
import { gateOfSource } from '../quest/knowledge-gate';
import { questOfSource } from '../reward/reward-ledger';
import { loadPlayerRecord, playerFacts, regionQuests, type LedgerRow, type PlayerRecord } from './player-facts';

export interface JourneyRouteDeps {
  db: Db;
  content: ContentCatalog;
  /** Names of what the shop sells (boosters, home styles), for the things bought. */
  shopNames?: ReadonlyMap<string, string>;
}

type EventBase = Omit<JourneyEvent, 'at' | 'xp' | 'coin'>;
const none: Pick<JourneyEvent, 'ref' | 'label' | 'itemId' | 'itemName' | 'level'> = { ref: null, label: null, itemId: null, itemName: null, level: null };

/** The first thing a ledger row holds (a drop, a chest's wearable, something bought). */
const firstItem = (row: LedgerRow): string | null => Object.entries(row.items).find(([, qty]) => qty > 0)?.[0] ?? null;

/** What one ledger row was, as the timeline tells it; null for a row it leaves out (a booster used up). */
function eventOf(content: ContentCatalog, row: LedgerRow): EventBase | null {
  const { source } = row;
  const questId = questOfSource(source);
  if (questId) {
    const quest = content.quests.get(questId);
    return { ...none, kind: quest?.status === 'active' && quest.category === 'side' ? 'minigame' : 'quest', ref: questId, label: quest?.title ?? null };
  }
  if (source.startsWith('drop:') || source.startsWith('shop:')) return { ...none, kind: 'item', itemId: firstItem(row) };
  const region = regionRewardOfSource(source);
  if (region) return { ...none, kind: 'chest', ref: region.region, itemId: firstItem(row) };
  const set = collectionOfSource(source);
  if (set) return { ...none, kind: 'collection', ref: set, label: content.collectibles.get(set)?.reward.title ?? null };
  const gift = skillGiftOfSource(source);
  if (gift) return { ...none, kind: 'gift', ref: gift.skill, label: skillName(content, gift.skill), itemId: firstItem(row), level: gift.level };
  const achievement = achievementOfSource(source);
  if (achievement) return { ...none, kind: 'achievement', ref: achievement, label: content.achievements.get(achievement)?.name ?? null, itemId: firstItem(row) };
  const gate = gateOfSource(source);
  if (gate) return { ...none, kind: 'gate', ref: gate, label: content.targets.get(gate)?.name ?? null };
  if (source.startsWith('olympiad:')) return { ...none, kind: 'olympiad' };
  if (source.startsWith('mail:')) return { ...none, kind: 'mail', itemId: firstItem(row) };
  return null;
}

function skillName(content: ContentCatalog, skillId: string): string | null {
  return content.subjects.flatMap((s) => s.skills).find((k) => k.id === skillId)?.name ?? null;
}

/**
 * The timeline from the ledger, newest first: each paid row as what it was, and the level-ups and skill-ups its
 * XP reached (replayed from the running totals, so no extra record is needed). At most `JOURNEY_EVENT_LIMIT`, of
 * the `kinds` asked for (a tab of the screen) when given.
 */
export function journeyEvents(
  content: ContentCatalog,
  ledger: readonly LedgerRow[],
  shopNames: ReadonlyMap<string, string> = new Map(),
  kinds?: readonly JourneyEventKind[],
): JourneyEvent[] {
  const events: JourneyEvent[] = [];
  const nameOf = (itemId: string | null): string | null => (itemId ? (content.accessories.get(itemId)?.name ?? shopNames.get(itemId) ?? null) : null);
  let xp = 0;
  const skillXp = new Map<string, number>();
  for (const row of ledger) {
    const at = row.createdAt.toISOString();
    const base = eventOf(content, row);
    if (base) events.push({ ...base, itemName: nameOf(base.itemId), at, xp: row.xp, coin: row.coins });
    const levelBefore = levelFromXp(xp, content.levelCurve).level;
    xp += Math.max(0, row.xp);
    const levelAfter = levelFromXp(xp, content.levelCurve).level;
    if (levelAfter > levelBefore) events.push({ ...none, kind: 'level-up', at, level: levelAfter, xp: 0, coin: 0 });
    for (const [skill, gained] of Object.entries(row.skillXp).sort(([a], [b]) => a.localeCompare(b))) {
      const before = skillXp.get(skill) ?? 0;
      skillXp.set(skill, before + gained);
      const from = levelFromXp(before, content.skillCurve).level;
      const to = levelFromXp(before + gained, content.skillCurve).level;
      if (to > from) events.push({ ...none, kind: 'skill-up', at, ref: skill, label: skillName(content, skill), level: to, xp: 0, coin: 0 });
    }
  }
  return events
    .reverse()
    .filter((event) => !kinds || kinds.includes(event.kind))
    .slice(0, JOURNEY_EVENT_LIMIT);
}

/** Every region with lessons or minigames: lessons done, three-star lessons, minigame runs, reward tiers claimed. */
export function journeyRegions(content: ContentCatalog, record: PlayerRecord): JourneyRegion[] {
  const facts = playerFacts(content, record);
  const { lessons, minigames } = regionQuests(content);
  const stars = new Set(record.quests.filter((q) => q.completedAt !== null && (q.stars ?? 0) >= 3).map((q) => q.questId));
  const tiers = new Map<string, number>();
  for (const row of record.ledger) {
    const claim = regionRewardOfSource(row.source);
    if (claim) tiers.set(claim.region, (tiers.get(claim.region) ?? 0) + 1);
  }
  return [...new Set([...lessons.keys(), ...minigames.keys()])].map((region) => {
    const ids = lessons.get(region) ?? [];
    return {
      region,
      lessons: ids.length,
      lessonsDone: facts.lessonsByRegion.get(region) ?? 0,
      threeStars: ids.filter((id) => stars.has(id)).length,
      minigameRuns: facts.minigameRunsByRegion.get(region) ?? 0,
      chestTiers: tiers.get(region) ?? 0,
    };
  });
}

/** The journey of the selected player (mock "Hành trình"): `GET /journey[?tab=quests|items|growth]`, read only. */
export function journeyRoutes({ db, content, shopNames }: JourneyRouteDeps): Router {
  const router = Router();
  router.get('/journey', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const tab = req.query.tab === undefined ? null : JourneyTab.safeParse(req.query.tab);
    if (tab && !tab.success) throw new HttpError(400, 'invalid-tab');
    const record = await loadPlayerRecord(db, childId);
    const body: JourneyResponse = { regions: journeyRegions(content, record), events: journeyEvents(content, record.ledger, shopNames, tab ? JOURNEY_TABS[tab.data] : undefined) };
    res.json(body);
  });
  return router;
}
