import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PetCatalog } from '@miu/schema/pet';
import { ConsentDocument, ContentId, LevelCurve, NameList, QuestDefinition, SkillCatalog, type PlayableQuest } from '@miu/schema/content';
import type { QuestTextbook } from '@miu/schema/game';
import { questCatalogIssues } from '@miu/quest/quest-catalog';
import { buildAccessoryCatalog, type AccessoryItem } from '@miu/voxel/accessory-schema';
import { speciesSchema } from '@miu/voxel/character-recipe';
import { z } from 'zod';
import { readCurriculum } from '../worksheet/curriculum-books';
import { CONTENT_DIR } from './content-dir';

/** Repo `content/` directory; validated once at startup so bad content fails the boot, not a request. */
export { CONTENT_DIR };

export interface ContentCatalog {
  childDisplayNames: ReadonlySet<string>;
  characterNames: ReadonlySet<string>;
  /** Species a character may be (`content/species.json`). */
  species: ReadonlySet<string>;
  /** Pets a character may take along (`content/pets.json`). */
  pets: ReadonlySet<string>;
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
  /** Quest id → the textbook lesson it plays, with its printed pages (quests naming a `lesson`). */
  textbooks: ReadonlyMap<string, QuestTextbook>;
}

export interface ContentOptions {
  dir?: string;
  /** Quest JSON directory; defaults to `<dir>/quests`. */
  questDir?: string;
  /** Test-only folder whose quests load next to the others (E2E fixtures). */
  extraQuestDir?: string;
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

export function loadQuests(questDir: string, skillIds: ReadonlySet<string>, extraQuestDir?: string): Map<string, PlayableQuest> {
  const list = [...readQuestDefinitions(questDir), ...(extraQuestDir ? readQuestDefinitions(extraQuestDir) : [])];
  const issues = questCatalogIssues(list, skillIds);
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

export function loadContentCatalog({ dir = CONTENT_DIR, questDir, extraQuestDir }: ContentOptions = {}): ContentCatalog {
  const catalog = readContentJson(SkillCatalog, path.join(dir, 'learning/skills.json'));
  const skillIds = new Set(catalog.subjects.flatMap((s) => s.skills.map((k) => k.id)));
  const quests = loadQuests(questDir ?? path.join(dir, 'quests'), skillIds, extraQuestDir);
  const accessories = buildAccessoryCatalog(jsonFiles(path.join(dir, 'accessories')).map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown));
  return {
    childDisplayNames: new Set(readContentJson(NameList, path.join(dir, 'names/child-display-names.json')).names),
    characterNames: new Set(readContentJson(NameList, path.join(dir, 'names/character-names.json')).names),
    species: new Set(Object.keys(readContentJson(z.record(ContentId, speciesSchema), path.join(dir, 'species.json')))),
    pets: new Set(readContentJson(PetCatalog, path.join(dir, 'pets.json')).pets.map((p) => p.id)),
    consent: readContentJson(ConsentDocument, path.join(dir, 'legal/consent-vi.json')),
    accessories,
    levelCurve: readContentJson(LevelCurve, path.join(dir, 'progression/level-curve.json')),
    skillCurve: readContentJson(LevelCurve, path.join(dir, 'progression/skill-curve.json')),
    subjects: catalog.subjects,
    skillIds,
    quests,
    textbooks: questTextbooks(quests.values(), path.join(dir, 'curriculum')),
  };
}
