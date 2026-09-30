import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsentDocument, LevelCurve, NameList, QuestDefinition, SkillCatalog, type PlayableQuest } from '@miu/schema/content';
import { questCatalogReport } from '@miu/quest/quest-catalog';
import { buildAccessoryCatalog, type AccessoryItem } from '@miu/voxel/accessory-schema';
import type { z } from 'zod';

/** Repo `content/` directory; validated once at startup so bad content fails the boot, not a request. */
export const CONTENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../content');

export interface ContentCatalog {
  childDisplayNames: ReadonlySet<string>;
  characterNames: ReadonlySet<string>;
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
  /** Gaps allowed while textbook quests are drafts (links to quests not written yet). */
  questWarnings: readonly string[];
  /** Quest id → quests whose completion unlocks it. A quest nobody unlocks is open from the start. */
  unlockedBy: ReadonlyMap<string, readonly string[]>;
}

export interface ContentOptions {
  dir?: string;
  /** Quest JSON directory; defaults to `<dir>/quests`. */
  questDir?: string;
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

export interface LoadedQuests {
  quests: Map<string, PlayableQuest>;
  warnings: string[];
}

export function loadQuests(questDir: string, skillIds: ReadonlySet<string>): LoadedQuests {
  const list = jsonFiles(questDir).map((file) => readContentJson(QuestDefinition, file));
  const { issues, warnings } = questCatalogReport(list, skillIds);
  if (issues.length > 0) throw new Error(`invalid quest catalogue: ${issues.join('; ')}`);
  const playable = list.filter((q): q is PlayableQuest => q.status !== 'draft');
  return { quests: new Map(playable.map((q) => [q.id, q])), warnings };
}

export function loadContentCatalog({ dir = CONTENT_DIR, questDir }: ContentOptions = {}): ContentCatalog {
  const catalog = readContentJson(SkillCatalog, path.join(dir, 'learning/skills.json'));
  const skillIds = new Set(catalog.subjects.flatMap((s) => s.skills.map((k) => k.id)));
  const { quests, warnings: questWarnings } = loadQuests(questDir ?? path.join(dir, 'quests'), skillIds);
  const unlockedBy = new Map<string, string[]>();
  for (const quest of quests.values()) {
    for (const target of quest.unlock) unlockedBy.set(target, [...(unlockedBy.get(target) ?? []), quest.id]);
  }
  const accessories = buildAccessoryCatalog(jsonFiles(path.join(dir, 'accessories')).map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown));
  return {
    childDisplayNames: new Set(readContentJson(NameList, path.join(dir, 'names/child-display-names.json')).names),
    characterNames: new Set(readContentJson(NameList, path.join(dir, 'names/character-names.json')).names),
    consent: readContentJson(ConsentDocument, path.join(dir, 'legal/consent-vi.json')),
    accessories,
    levelCurve: readContentJson(LevelCurve, path.join(dir, 'progression/level-curve.json')),
    skillCurve: readContentJson(LevelCurve, path.join(dir, 'progression/skill-curve.json')),
    subjects: catalog.subjects,
    skillIds,
    quests,
    questWarnings,
    unlockedBy,
  };
}
