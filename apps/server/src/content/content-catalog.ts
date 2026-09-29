import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsentDocument, LevelCurve, NameList, QuestDefinition, SkillCatalog } from '@miu/schema/content';
import { parseAccessory } from '@miu/voxel/accessory-schema';
import type { z } from 'zod';

/** Repo `content/` directory; validated once at startup so bad content fails the boot, not a request. */
export const CONTENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../content');

export interface ContentCatalog {
  childDisplayNames: ReadonlySet<string>;
  characterNames: ReadonlySet<string>;
  consent: ConsentDocument;
  /** Accessory id → slot; the character can wear only these, one per slot. */
  accessories: ReadonlyMap<string, string>;
  levelCurve: LevelCurve;
  skillIds: ReadonlySet<string>;
  quests: ReadonlyMap<string, QuestDefinition>;
  /** Quest id → quests whose completion unlocks it. A quest nobody unlocks is open from the start. */
  unlockedBy: ReadonlyMap<string, readonly string[]>;
}

export interface ContentOptions {
  dir?: string;
  /** Quest JSON directory; defaults to `<dir>/quests` (absent until the first real quest ships). */
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

/**
 * A quest is open when nobody unlocks it, or when any quest that unlocks it is reachable. Quests
 * only reachable through a cycle would stay locked forever, so the catalogue refuses them.
 */
function assertAllReachable(quests: ReadonlyMap<string, QuestDefinition>): void {
  const unlockers = new Map<string, string[]>();
  for (const q of quests.values()) for (const t of q.unlock) unlockers.set(t, [...(unlockers.get(t) ?? []), q.id]);
  const reachable = new Set([...quests.keys()].filter((id) => !unlockers.has(id)));
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, from] of unlockers) {
      if (!reachable.has(id) && from.some((f) => reachable.has(f))) {
        reachable.add(id);
        grew = true;
      }
    }
  }
  const stuck = [...quests.keys()].filter((id) => !reachable.has(id));
  if (stuck.length > 0) throw new Error(`quests locked forever (unlock cycle): ${stuck.join(', ')}`);
}

export function loadQuests(questDir: string, skillIds: ReadonlySet<string>): Map<string, QuestDefinition> {
  const quests = new Map<string, QuestDefinition>();
  for (const file of jsonFiles(questDir)) {
    const quest = readContentJson(QuestDefinition, file);
    if (quests.has(quest.id)) throw new Error(`duplicate quest id ${quest.id}`);
    for (const skill of Object.keys(quest.reward.skillXp)) {
      if (!skillIds.has(skill)) throw new Error(`quest ${quest.id} rewards unknown skill ${skill}`);
    }
    quests.set(quest.id, quest);
  }
  for (const quest of quests.values()) {
    for (const target of quest.unlock) {
      if (!quests.has(target)) throw new Error(`quest ${quest.id} unlocks unknown quest ${target}`);
    }
  }
  assertAllReachable(quests);
  return quests;
}

export function loadContentCatalog({ dir = CONTENT_DIR, questDir }: ContentOptions = {}): ContentCatalog {
  const catalog = readContentJson(SkillCatalog, path.join(dir, 'learning/skills.json'));
  const skillIds = new Set(catalog.subjects.flatMap((s) => s.skills.map((k) => k.id)));
  const quests = loadQuests(questDir ?? path.join(dir, 'quests'), skillIds);
  const unlockedBy = new Map<string, string[]>();
  for (const quest of quests.values()) {
    for (const target of quest.unlock) unlockedBy.set(target, [...(unlockedBy.get(target) ?? []), quest.id]);
  }
  const accessories = new Map<string, string>();
  for (const file of jsonFiles(path.join(dir, 'accessories'))) {
    const def = parseAccessory(JSON.parse(readFileSync(file, 'utf8')));
    accessories.set(def.id, def.slot);
  }
  return {
    childDisplayNames: new Set(readContentJson(NameList, path.join(dir, 'names/child-display-names.json')).names),
    characterNames: new Set(readContentJson(NameList, path.join(dir, 'names/character-names.json')).names),
    consent: readContentJson(ConsentDocument, path.join(dir, 'legal/consent-vi.json')),
    accessories,
    levelCurve: readContentJson(LevelCurve, path.join(dir, 'progression/level-curve.json')),
    skillIds,
    quests,
    unlockedBy,
  };
}
