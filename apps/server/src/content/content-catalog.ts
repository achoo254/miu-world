import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CollectibleCatalog, collectibleIssues, type CollectibleSet } from '@miu/schema/collectible';
import { PetCatalog, type Pet } from '@miu/schema/pet';
import { PetGearCatalog, type PetGearItem } from '@miu/schema/pet-gear';
import { RegionCatalog, playableMaps } from '@miu/schema/region';
import { ConsentDocument, ContentId, LevelCurve, NameList, QuestDefinition, SkillCatalog, type PlayableQuest } from '@miu/schema/content';
import { MinigameSpec } from '@miu/schema/minigame';
import type { QuestTextbook } from '@miu/schema/game';
import { questCatalogIssues } from '@miu/quest/quest-catalog';
import { buildAccessoryCatalog, type AccessoryItem } from '@miu/voxel/accessory-schema';
import { speciesSchema } from '@miu/voxel/character-recipe';
import { RecipeCatalog, type Recipe } from '@miu/schema/cooking';
import { LookCatalog, QuestTargetCatalog, type QuestTarget } from '@miu/schema/world-target';
import { Item } from '@miu/schema/item';
import { AchievementCatalog, achievementIssues, type AchievementEntry } from '@miu/schema/achievement';
import { SkillGiftCatalog, skillGiftIssues } from '@miu/schema/progression';
import { z } from 'zod';
import { readCurriculum } from '../worksheet/curriculum-books';
import { EMPTY_NPC_CATALOG, buildNpcCatalog, npcCatalogIssues, readNpcFiles, type NpcCatalog } from '../npc/npc-catalog';
import { CONTENT_DIR } from './content-dir';

/** Repo `content/` directory; validated once at startup so bad content fails the boot, not a request. */
export { CONTENT_DIR };

export interface ContentCatalog {
  childDisplayNames: ReadonlySet<string>;
  characterNames: ReadonlySet<string>;
  /** Species a character may be (`content/species.json`). */
  species: ReadonlySet<string>;
  /** Pets a character may take along (`content/pets.json`), by id, with the level that opens each. */
  pets: ReadonlyMap<string, Pet>;
  /** Names a pet may be given (`content/names/pet-names.json`). */
  petNames: ReadonlySet<string>;
  /** What a pet may wear (`content/pet-gear.json`), by id; bought in the shop. */
  petGear: ReadonlyMap<string, PetGearItem>;
  consent: ConsentDocument;
  /** Wearable items (accessories and their colour variants); the character wears these, one per slot. */
  accessories: ReadonlyMap<string, AccessoryItem>;
  levelCurve: LevelCurve;
  /** Skill XP → skill level; subjects use the same curve on their summed skill XP. */
  skillCurve: LevelCurve;
  /** Subject → skill tree (Master Plan §5), in catalogue order. */
  subjects: SkillCatalog['subjects'];
  skillIds: ReadonlySet<string>;
  /** Active quests and coming-soon stubs; drafts are validated but never loaded. */
  quests: ReadonlyMap<string, PlayableQuest>;
  /** Minigames quests may play (`content/minigames`), by id. */
  minigames: ReadonlyMap<string, MinigameSpec>;
  /** Quest id → the textbook lesson it plays, with its printed pages (quests naming a `lesson`). */
  textbooks: ReadonlyMap<string, QuestTextbook>;
  /** Maps a child can play in: the open regions' maps (content/world/regions.json). */
  maps: ReadonlySet<string>;
  /** Collectible sets (content/collectibles.json), by region id, in catalogue order. */
  collectibles: ReadonlyMap<string, CollectibleSet>;
  /** Cooking recipes (content/recipes.json). */
  recipes: ReadonlyMap<string, Recipe>;
  /** Interactive targets in the world (content/world/targets.json), by id. */
  targets: ReadonlyMap<string, QuestTarget>;
  /** What each skill level gives (content/progression/skill-gifts.json). */
  skillGifts: SkillGiftCatalog;
  /** Achievements (content/progression/achievements.json), by id, in catalogue order. */
  achievements: ReadonlyMap<string, AchievementEntry>;
  /** The maps' characters, their friendships' stories and the chapters' letters (content/npcs). */
  npcs: NpcCatalog;
  /** content/items by id: what the backpack shows, what a character may be given. */
  items: ReadonlyMap<string, Item>;
}

/** Every item of content/items, by id (a missing folder: none). */
export function readItems(dir: string): Map<string, Item> {
  return new Map(jsonFiles(path.join(dir, 'items')).map((file) => {
    const item = readContentJson(Item, file);
    return [item.id, item] as const;
  }));
}

/**
 * The characters' files, checked against the targets, looks, items and quests; a file that does not fit fails the
 * boot. `requireEveryMap` (content:check): every open region has its characters and stories.
 */
export function loadNpcs(
  dir: string,
  context: { targets: ReadonlyMap<string, QuestTarget>; items: ReadonlyMap<string, Item>; quests: Iterable<PlayableQuest>; openRegions: ReadonlySet<string>; requireEveryMap?: boolean; npcsDir?: string },
): NpcCatalog {
  const files = readNpcFiles(context.npcsDir ?? path.join(dir, 'npcs'));
  const looksFile = path.join(dir, 'world/looks.json');
  const looks = existsSync(looksFile) ? readContentJson(LookCatalog, looksFile).looks : {};
  const issues = npcCatalogIssues(files, {
    targets: context.targets,
    isNpcLook: (look) => looks[look]?.kind === 'npc',
    items: context.items,
    quests: [...context.quests],
    openRegions: context.openRegions,
    requireEveryMap: context.requireEveryMap,
  });
  if (issues.length > 0) throw new Error(`invalid characters (content/npcs): ${issues.join('; ')}`);
  return buildNpcCatalog(files, context.targets);
}

/**
 * The skill gifts and the achievements, checked against the skills, regions and wearables; a catalogue that does
 * not fit fails the boot. Goals in reach and pictures are checked by `pnpm content:check`.
 */
export function loadProgression(
  dir: string,
  context: { skills: ReadonlySet<string>; subjects: ReadonlySet<string>; regions: ReadonlySet<string>; accessories: ReadonlyMap<string, AccessoryItem> },
): { skillGifts: SkillGiftCatalog; achievements: Map<string, AchievementEntry> } {
  const wearables = new Map([...context.accessories.values()].map((item) => [item.id, { award: item.unlock?.award === true }]));
  const skillGifts = readContentJson(SkillGiftCatalog, path.join(dir, 'progression/skill-gifts.json'));
  const achievements = readContentJson(AchievementCatalog, path.join(dir, 'progression/achievements.json'));
  const issues = [
    ...skillGiftIssues(skillGifts, { skills: context.skills, wearables }),
    ...achievementIssues(achievements, { ...context, wearables, giftItems: new Set(skillGifts.items.map((i) => i.item)) }),
  ];
  if (issues.length > 0) throw new Error(`invalid progression content: ${issues.join('; ')}`);
  return { skillGifts, achievements: new Map(achievements.achievements.map((a) => [a.id, a])) };
}

/** The collectible sets, checked against the regions; a catalogue that does not fit fails the boot. */
export function loadCollectibles(dir: string, regions: RegionCatalog): Map<string, CollectibleSet> {
  const catalog = readContentJson(CollectibleCatalog, path.join(dir, 'collectibles.json'));
  const issues = collectibleIssues(catalog, { regions: new Set(regions.regions.map((r) => r.id)) });
  if (issues.length > 0) throw new Error(`invalid collectibles: ${issues.join('; ')}`);
  return new Map(catalog.sets.map((set) => [set.mapId, set]));
}

export interface ContentOptions {
  dir?: string;
  /** Quest JSON directory; defaults to `<dir>/quests`. */
  questDir?: string;
  /** Test-only folder whose quests load next to the others (E2E fixtures). */
  extraQuestDir?: string;
  /** `pnpm content:check`: every open region must have its characters and stories (content/npcs). */
  requireEveryMap?: boolean;
  /** The characters' folder; defaults to `<dir>/npcs`. Null: no characters (tests on fixture quests). */
  npcsDir?: string | null;
}

export function readContentJson<S extends z.ZodType>(schema: S, file: string): z.infer<S> {
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(`invalid content file ${path.basename(file)}: ${parsed.error.message}`);
  return parsed.data;
}

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Every quest file, drafts included, schema-checked but not cross-checked. */
export function readQuestDefinitions(questDir: string): QuestDefinition[] {
  return jsonFiles(questDir).map((file) => readContentJson(QuestDefinition, file));
}

/** Every minigame file, keyed by id; a file must be named after its game's id. */
export function readMinigames(dir: string): Map<string, MinigameSpec> {
  return new Map(
    jsonFiles(dir).map((file) => {
      const spec = readContentJson(MinigameSpec, file);
      if (path.basename(file) !== `${spec.id}.json`) throw new Error(`invalid content file ${path.basename(file)}: a minigame file is named after its id (${spec.id}.json)`);
      return [spec.id, spec];
    }),
  );
}

export function loadQuests(
  questDir: string,
  skillIds: ReadonlySet<string>,
  extraQuestDir?: string,
  minigames: ReadonlyMap<string, MinigameSpec> = new Map(),
): Map<string, PlayableQuest> {
  const list = [...readQuestDefinitions(questDir), ...(extraQuestDir ? readQuestDefinitions(extraQuestDir) : [])];
  const issues = questCatalogIssues(list, skillIds, minigames);
  if (issues.length > 0) throw new Error(`invalid quest catalogue: ${issues.join('; ')}`);
  const playable = list.filter((q): q is PlayableQuest => q.status !== 'draft');
  return new Map(playable.map((q) => [q.id, q]));
}

/** Title and printed pages of the lesson each loaded quest plays, from the textbook inventory. */
export function questTextbooks(quests: Iterable<PlayableQuest>, curriculumDir: string): Map<string, QuestTextbook> {
  const withLesson = [...quests].flatMap((q) => (q.status === 'active' && q.lesson ? [{ id: q.id, lesson: q.lesson }] : []));
  if (withLesson.length === 0) return new Map();
  const lessons = new Map<string, QuestTextbook>();
  const curriculum = readCurriculum(curriculumDir);
  for (const { book, units } of curriculum.books) {
    for (const lesson of units.flatMap((u) => u.lessons)) lessons.set(lesson.id, { book: book.title, lesson: lesson.title, pages: lesson.pages });
  }
  return new Map(
    withLesson.map(({ id, lesson }) => {
      const textbook = lessons.get(lesson);
      if (!textbook) throw new Error([`quest ${id} plays unknown textbook lesson ${lesson}`, ...curriculum.issues].join('; '));
      return [id, textbook];
    }),
  );
}

export function loadContentCatalog({ dir = CONTENT_DIR, questDir, extraQuestDir, requireEveryMap = false, npcsDir }: ContentOptions = {}): ContentCatalog {
  const catalog = readContentJson(SkillCatalog, path.join(dir, 'learning/skills.json'));
  const skillIds = new Set(catalog.subjects.flatMap((s) => s.skills.map((k) => k.id)));
  const minigames = readMinigames(path.join(dir, 'minigames'));
  const quests = loadQuests(questDir ?? path.join(dir, 'quests'), skillIds, extraQuestDir, minigames);
  const regions = readContentJson(RegionCatalog, path.join(dir, 'world/regions.json'));
  const accessories = buildAccessoryCatalog(jsonFiles(path.join(dir, 'accessories')).map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown));
  const targetsFile = path.join(dir, 'world/targets.json');
  const targets = existsSync(targetsFile)
    ? new Map(Object.entries(readContentJson(QuestTargetCatalog, targetsFile).targets))
    : new Map<string, QuestTarget>();
  const items = readItems(dir);
  const openRegions = new Set(regions.regions.filter((r) => r.status === 'open').map((r) => r.id));
  return {
    items,
    npcs: npcsDir === null ? EMPTY_NPC_CATALOG : loadNpcs(dir, { targets, items, quests: quests.values(), openRegions, requireEveryMap, npcsDir }),
    childDisplayNames: new Set(readContentJson(NameList, path.join(dir, 'names/child-display-names.json')).names),
    characterNames: new Set(readContentJson(NameList, path.join(dir, 'names/character-names.json')).names),
    species: new Set(Object.keys(readContentJson(z.record(ContentId, speciesSchema), path.join(dir, 'species.json')))),
    pets: new Map(readContentJson(PetCatalog, path.join(dir, 'pets.json')).pets.map((p) => [p.id, p])),
    petNames: new Set(readContentJson(NameList, path.join(dir, 'names/pet-names.json')).names),
    petGear: new Map(readContentJson(PetGearCatalog, path.join(dir, 'pet-gear.json')).items.map((i) => [i.id, i])),
    consent: readContentJson(ConsentDocument, path.join(dir, 'legal/consent-vi.json')),
    accessories,
    levelCurve: readContentJson(LevelCurve, path.join(dir, 'progression/level-curve.json')),
    skillCurve: readContentJson(LevelCurve, path.join(dir, 'progression/skill-curve.json')),
    subjects: catalog.subjects,
    skillIds,
    quests,
    minigames,
    textbooks: questTextbooks(quests.values(), path.join(dir, 'curriculum')),
    maps: new Set(playableMaps(regions)),
    collectibles: loadCollectibles(dir, regions),
    recipes: new Map(readContentJson(RecipeCatalog, path.join(dir, 'recipes.json')).recipes.map((r) => [r.id, r])),
    targets,
    ...loadProgression(dir, { skills: skillIds, subjects: new Set(catalog.subjects.map((s) => s.id)), regions: new Set(regions.regions.map((r) => r.id)), accessories }),
  };
}
