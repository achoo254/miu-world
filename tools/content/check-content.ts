// `pnpm content:check`: validates everything under content/ before it reaches the server or the web
// app. Game content goes through the server's own catalogue loader (schemas + cross-references), so
// this gate and the server boot can never disagree.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, loadContentCatalog } from '../../apps/server/src/content/content-catalog';

/** Content files the server catalogue reads (a trailing slash means the `.json` files directly in that folder). */
const CATALOGUE_FILES = [
  'learning/skills.json',
  'names/child-display-names.json',
  'names/character-names.json',
  'legal/consent-vi.json',
  'progression/level-curve.json',
  'accessories/',
  'quests/',
];
/** Content files the asset tools validate when they build characters, atlases and maps (any file in a folder). */
const ASSET_TOOL_FILES = ['blocks.json', 'characters.json', 'palette.json', 'faces/', 'animations/'];

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
  try {
    loadContentCatalog({ dir });
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  const notes = [
    'quest map targets are not checked against world entities yet: the forest map does not list interactable ids',
    'reward item ids are not checked yet: there is no item catalogue',
  ];
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
