// `pnpm content:check`: validates everything under content/ before it reaches the server or the web
// app. Game content goes through the server's own catalogue loader (schemas + cross-references), so
// this gate and the server boot can never disagree.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, loadContentCatalog, readQuestDefinitions } from '../../apps/server/src/content/content-catalog';
import { playerTextIssues } from '../../packages/quest/src/player-name';
import { PrivacyDocument, stepTargets, type QuestDefinition } from '../../packages/schema/src/content';
import { Item } from '../../packages/schema/src/item';
import { PetCatalog } from '../../packages/schema/src/pet';
import { LookCatalog, QuestTargetCatalog } from '../../packages/schema/src/world-target';
import { RegionCatalog } from '../../packages/schema/src/region';
import { UI_ICONS } from '../../apps/web/src/ui/kit/ui-art';
import { entitiesForChapter, mapForRegion, worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
import { CURRICULUM_FOLDERS, checkCurriculum } from './check-curriculum';
import { percentCovered, sumGaps } from './content-gaps';
import { varietyIssues } from './content-variety';
import { checkCurriculumLinks } from './curriculum-links';

/** Content files the server catalogue reads (a trailing slash means the `.json` files directly in that folder). */
const CATALOGUE_FILES = [
  'learning/skills.json',
  'names/child-display-names.json',
  'names/character-names.json',
  'legal/consent-vi.json',
  'progression/level-curve.json',
  'progression/skill-curve.json',
  'pets.json',
  'accessories/',
  'quests/',
];
/** Content files the asset tools validate when they build characters, atlases and maps (any file in a folder). */
const ASSET_TOOL_FILES = ['blocks.json', 'characters.json', 'palette.json', 'species.json', 'character-bases.json', 'outfit-rules.json', 'character-parts/', 'outfits/', 'faces/', 'animations/'];
/** Content only the web app reads; validated here. */
const REGIONS_FILE = 'world/regions.json';
const LOOKS_FILE = 'world/looks.json';
const TARGETS_FILE = 'world/targets.json';
const PRIVACY_FILE = 'legal/privacy-vi.json';
const ITEMS_FOLDER = 'items/';

/**
 * Every map target a quest names must be an interactable on its region's map, and shown while that quest's
 * chapter and the quest itself are played (`entitiesForChapter`). Active quests and drafts are both
 * checked (drafts are placed before they go live); stubs are skipped; a quest whose map is not generated
 * yet is reported as a note, not an error.
 */
export function checkQuestTargets(
  quests: Iterable<QuestDefinition>,
  worldDir: string = path.join(ASSETS_DIR, 'generated/world'),
): { issues: string[]; notes: string[] } {
  const issues: string[] = [];
  const notes: string[] = [];
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const mapId = mapForRegion(quest.region);
    const file = path.join(worldDir, mapId, 'entities.json');
    if (!existsSync(file)) {
      notes.push(`quest ${quest.id}: map targets not checked, region ${quest.region} chapter ${quest.chapter} has no generated map`);
      continue;
    }
    const parsed = worldEntitiesSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (!parsed.success) {
      issues.push(`map ${mapId}: entities.json is not a valid version 2 world entities file`);
      continue;
    }
    const everywhere = new Set(parsed.data.interactables.map((t) => t.id));
    const onMap = new Map(entitiesForChapter(parsed.data, quest.chapter, quest.id).interactables.map((t) => [t.id, t]));
    for (const step of quest.steps) {
      for (const target of stepTargets(step)) {
        if (!everywhere.has(target)) issues.push(`quest ${quest.id} step ${step.id} targets ${target}, which map ${mapId} does not place`);
        else if (!onMap.has(target)) issues.push(`quest ${quest.id} step ${step.id} targets ${target}, which map ${mapId} hides in chapter ${quest.chapter}`);
      }
      // The map paints the riddle on a board: it must say what the step asks.
      const board = step.kind === 'riddle' && step.target ? onMap.get(step.target)?.board : undefined;
      if (step.kind === 'riddle' && board && !step.question.includes(board)) {
        issues.push(`quest ${quest.id} step ${step.id}: the board on ${step.target} reads "${board}", which the question does not contain`);
      }
    }
  }
  return { issues, notes };
}

/** Every string in a quest (titles, lines, prompts, support) must address the player as `{name}`. */
export function checkPlayerText(quests: Iterable<QuestDefinition>): string[] {
  const issues: string[] = [];
  for (const quest of quests) {
    const visit = (value: unknown, where: string): void => {
      if (typeof value === 'string') for (const issue of playerTextIssues(value)) issues.push(`quest ${quest.id} ${where} ${issue}`);
      else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${where}[${i}]`));
      else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) visit(v, where ? `${where}.${k}` : k);
    };
    visit(quest, '');
  }
  return issues;
}

export interface ContentReport {
  issues: string[];
  /** Known gaps allowed for now (a textbook inventory still in draft), printed on every run. */
  warnings: string[];
  /** Checks deliberately not run yet, printed so a green run does not overstate what was verified. */
  notes: string[];
  fileCount: number;
}

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(dir, rel) : [rel];
  });
}

const inFolder = (rel: string, folder: string) => rel.startsWith(folder) && !rel.slice(folder.length).includes('/');
const readByCatalogue = (rel: string) =>
  CATALOGUE_FILES.some((o) => (o.endsWith('/') ? inFolder(rel, o) && rel.endsWith('.json') : rel === o));
const readByAssetTools = (rel: string) => ASSET_TOOL_FILES.some((o) => (o.endsWith('/') ? inFolder(rel, o) : rel === o));
const readByCurriculum = (rel: string) => CURRICULUM_FOLDERS.some((o) => inFolder(rel, o) && rel.endsWith('.json'));
const readByWeb = (rel: string) => rel === REGIONS_FILE || rel === LOOKS_FILE || rel === TARGETS_FILE || rel === PRIVACY_FILE || (inFolder(rel, ITEMS_FOLDER) && rel.endsWith('.json'));

/** Items parse, use a shipped UI icon, file name = id, and every item a quest rewards exists. */
export function checkItems(dir: string, files: readonly string[], quests: Iterable<QuestDefinition>): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const rel of files.filter((f) => inFolder(f, ITEMS_FOLDER) && f.endsWith('.json'))) {
    const parsed = Item.safeParse(JSON.parse(readFileSync(path.join(dir, rel), 'utf8')));
    if (!parsed.success) {
      issues.push(`content/${rel}: ${parsed.error.message}`);
      continue;
    }
    const item = parsed.data;
    if (`${ITEMS_FOLDER}${item.id}.json` !== rel) issues.push(`content/${rel}: file name must be ${item.id}.json`);
    if (!(item.icon in UI_ICONS)) issues.push(`item ${item.id} uses icon "${item.icon}", which the UI does not ship`);
    for (const text of [item.name, item.description, item.usedIn]) for (const issue of playerTextIssues(text)) issues.push(`item ${item.id} ${issue}`);
    ids.add(item.id);
  }
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    for (const id of Object.keys(quest.reward.items)) if (!ids.has(id)) issues.push(`quest ${quest.id} rewards item ${id}, which content/items does not describe`);
  }
  return issues;
}

/** Map target catalogues (read by the map generators): they parse, every target's look exists, every look's model is licensed. */
export function checkTargetCatalogues(looksRaw: unknown, targetsRaw: unknown, manifestPaths: ReadonlySet<string>): string[] {
  const looks = LookCatalog.safeParse(looksRaw);
  if (!looks.success) return [`content/${LOOKS_FILE}: ${looks.error.message}`];
  const targets = QuestTargetCatalog.safeParse(targetsRaw);
  if (!targets.success) return [`content/${TARGETS_FILE}: ${targets.error.message}`];
  const issues: string[] = [];
  for (const [id, look] of Object.entries(looks.data.looks)) if (look.model && !manifestPaths.has(look.model)) issues.push(`look ${id}: model ${look.model} is not in assets/manifest.json`);
  for (const [id, target] of Object.entries(targets.data.targets)) if (!looks.data.looks[target.look]) issues.push(`target ${id}: look ${target.look} is not in content/${LOOKS_FILE}`);
  return issues;
}

/** Every pet's model is a licensed file in the asset manifest (the build ships it, the game loads it). */
export function checkPets(raw: unknown, manifestPaths: ReadonlySet<string>): string[] {
  const parsed = PetCatalog.safeParse(raw);
  if (!parsed.success) return [`content/pets.json: ${parsed.error.message}`];
  return parsed.data.pets.filter((p) => !manifestPaths.has(p.model)).map((p) => `pet ${p.id}: model ${p.model} is not in assets/manifest.json`);
}

/** Regions parse; their text addresses the player as `{name}`; active quests live in open regions, and every open region has one. */
export function checkRegions(raw: unknown, quests: Iterable<QuestDefinition>): string[] {
  const parsed = RegionCatalog.safeParse(raw);
  if (!parsed.success) return [`content/${REGIONS_FILE}: ${parsed.error.message}`];
  const issues: string[] = [];
  for (const region of parsed.data.regions) {
    for (const text of [region.name, region.tagline, region.subject ?? '', region.description ?? '']) for (const issue of playerTextIssues(text)) issues.push(`region ${region.id} ${issue}`);
  }
  const open = new Set(parsed.data.regions.filter((r) => r.status === 'open').map((r) => r.id));
  const played = new Set<string>();
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    played.add(quest.region);
    if (!open.has(quest.region)) issues.push(`quest ${quest.id} is in region ${quest.region}, which is not an open region`);
  }
  for (const id of open) if (!played.has(id)) issues.push(`open region ${id} has no active quest`);
  return issues;
}

/** The public privacy page parses and describes the consent version parents are asked to accept. */
export function checkPrivacy(raw: unknown, consentVersion: string): string[] {
  const parsed = PrivacyDocument.safeParse(raw);
  if (!parsed.success) return [`content/${PRIVACY_FILE}: ${parsed.error.message}`];
  if (parsed.data.consentVersion !== consentVersion) {
    return [`content/${PRIVACY_FILE} describes consent ${parsed.data.consentVersion}, but parents are asked to accept ${consentVersion}: update the page with the consent`];
  }
  return [];
}

export function checkContent(dir: string = CONTENT_DIR): ContentReport {
  const issues: string[] = [];
  const files = listFiles(dir);
  for (const rel of files) {
    if (!readByCatalogue(rel) && !readByAssetTools(rel) && !readByWeb(rel) && !readByCurriculum(rel)) {
      issues.push(`content/${rel} has no validator: add it to the server catalogue or an asset tool`);
    }
  }
  const notes: string[] = [];
  const warnings: string[] = [];
  try {
    const catalog = loadContentCatalog({ dir });
    const targets = checkQuestTargets(catalog.quests.values());
    issues.push(...targets.issues);
    // Drafts become game text too, so the player's name rule covers every quest file.
    issues.push(...checkPlayerText(readQuestDefinitions(path.join(dir, 'quests'))));
    issues.push(...checkItems(dir, files, catalog.quests.values()));
    issues.push(...checkRegions(JSON.parse(readFileSync(path.join(dir, REGIONS_FILE), 'utf8')), catalog.quests.values()));
    const manifest = JSON.parse(readFileSync(path.join(ASSETS_DIR, 'manifest.json'), 'utf8')) as { files: Array<{ path: string }> };
    issues.push(...checkPets(JSON.parse(readFileSync(path.join(dir, 'pets.json'), 'utf8')), new Set(manifest.files.map((f) => f.path))));
    const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(dir, rel), 'utf8'));
    if (existsSync(path.join(dir, TARGETS_FILE))) issues.push(...checkTargetCatalogues(read(LOOKS_FILE), read(TARGETS_FILE), new Set(manifest.files.map((f) => f.path))));
    else issues.push(`content/${TARGETS_FILE} is missing: the map generators place quest targets from it`);
    const privacy: unknown = JSON.parse(readFileSync(path.join(dir, PRIVACY_FILE), 'utf8'));
    issues.push(...checkPrivacy(privacy, catalog.consent.version));
    if (PrivacyDocument.safeParse(privacy).data?.contactEmail === null) warnings.push(`content/${PRIVACY_FILE} has no contact email yet`);
    for (const item of catalog.accessories.values()) {
      const quest = item.unlock?.quest;
      if (quest && !catalog.quests.has(quest)) issues.push(`accessory ${item.id} unlocks with unknown quest ${quest}`);
    }
    notes.push(...targets.notes);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  const curriculum = checkCurriculum(path.join(dir, 'curriculum'));
  issues.push(...curriculum.issues);
  // Textbook quests must carry the book's wording and answers unchanged, and no quest may repeat another's
  // lines; gaps only warn until the books are switched on.
  try {
    const quests = readQuestDefinitions(path.join(dir, 'quests'));
    const links = checkCurriculumLinks(curriculum.books, quests);
    issues.push(...links.issues);
    issues.push(...varietyIssues(quests, curriculum.books));
    for (const book of curriculum.books) {
      const totals = sumGaps(links.lessons.filter((l) => l.book === book.book.id));
      // Every exercise of a finished inventory must be in the game or on a worksheet (the textbook goal).
      if (totals.missing + totals.missingTexts > 0) {
        const line = `${book.book.id}: ${percentCovered(totals)}% of ${totals.items} textbook items covered by quests (pnpm content:gaps --missing)`;
        if (book.book.status === 'complete') issues.push(line);
        else warnings.push(line);
      }
    }
  } catch {
    // A quest file that breaks the schema is already reported by the catalogue load above.
  }
  return { issues, warnings: [...warnings, ...curriculum.warnings], notes, fileCount: files.length };
}

function main(): void {
  const report = checkContent();
  for (const note of report.notes) console.log(`note: ${note}`);
  for (const warning of report.warnings) console.log(`warning: ${warning}`);
  if (report.issues.length > 0) {
    console.error(`content:check FAILED (${report.issues.length} problem(s)):`);
    for (const issue of report.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(`content:check OK — ${report.fileCount} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
