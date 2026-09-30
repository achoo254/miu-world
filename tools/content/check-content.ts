// `pnpm content:check`: validates everything under content/ before it reaches the server or the web
// app. Game content goes through the server's own catalogue loader (schemas + cross-references), so
// this gate and the server boot can never disagree.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, loadContentCatalog } from '../../apps/server/src/content/content-catalog';
import { playerTextIssues } from '../../packages/quest/src/player-name';
import { stepTargets, type QuestDefinition } from '../../packages/schema/src/content';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';

/** Content files the server catalogue reads (a trailing slash means the `.json` files directly in that folder). */
const CATALOGUE_FILES = [
  'learning/skills.json',
  'names/child-display-names.json',
  'names/character-names.json',
  'legal/consent-vi.json',
  'progression/level-curve.json',
  'progression/skill-curve.json',
  'accessories/',
  'quests/',
];
/** Content files the asset tools validate when they build characters, atlases and maps (any file in a folder). */
const ASSET_TOOL_FILES = ['blocks.json', 'characters.json', 'palette.json', 'faces/', 'animations/'];

/**
 * Map id prefix of each region; chapter N plays on `<prefix>-ch<N>`. Moves into the region catalogue
 * once content/world/regions.json exists.
 */
const REGION_MAP_PREFIX: Record<string, string> = { 'khu-rung-bi-mat': 'forest' };

/**
 * Every map target an active quest names must be an interactable on its chapter map. Stubs and drafts
 * are skipped; an active quest whose map is not generated yet is reported as a note, not an error.
 */
export function checkQuestTargets(
  quests: Iterable<QuestDefinition>,
  worldDir: string = path.join(ASSETS_DIR, 'generated/world'),
): { issues: string[]; notes: string[] } {
  const issues: string[] = [];
  const notes: string[] = [];
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    const prefix = REGION_MAP_PREFIX[quest.region];
    const mapId = prefix ? `${prefix}-ch${quest.chapter}` : null;
    const file = mapId ? path.join(worldDir, mapId, 'entities.json') : null;
    if (!mapId || !file || !existsSync(file)) {
      notes.push(`quest ${quest.id}: map targets not checked, region ${quest.region} chapter ${quest.chapter} has no generated map`);
      continue;
    }
    const parsed = worldEntitiesSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (!parsed.success) {
      issues.push(`map ${mapId}: entities.json is not a valid version 2 world entities file`);
      continue;
    }
    const onMap = new Set(parsed.data.interactables.map((t) => t.id));
    for (const step of quest.steps) {
      for (const target of stepTargets(step)) {
        if (!onMap.has(target)) issues.push(`quest ${quest.id} step ${step.id} targets ${target}, which map ${mapId} does not place`);
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

export function checkContent(dir: string = CONTENT_DIR): ContentReport {
  const issues: string[] = [];
  const files = listFiles(dir);
  for (const rel of files) {
    if (!readByCatalogue(rel) && !readByAssetTools(rel)) {
      issues.push(`content/${rel} has no validator: add it to the server catalogue or an asset tool`);
    }
  }
  const notes = ['reward item ids are not checked yet: there is no item catalogue'];
  try {
    const catalog = loadContentCatalog({ dir });
    const targets = checkQuestTargets(catalog.quests.values());
    issues.push(...targets.issues);
    issues.push(...checkPlayerText(catalog.quests.values()));
    for (const item of catalog.accessories.values()) {
      const quest = item.unlock?.quest;
      if (quest && !catalog.quests.has(quest)) issues.push(`accessory ${item.id} unlocks with unknown quest ${quest}`);
    }
    notes.push(...targets.notes);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  return { issues, notes, fileCount: files.length };
}

function main(): void {
  const report = checkContent();
  for (const note of report.notes) console.log(`note: ${note}`);
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
