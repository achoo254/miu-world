// Shared schemas and file helpers for the asset pipeline (fetch → manifest → check).
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
export const SOURCES_PATH = path.join(REPO_ROOT, 'tools/assets/sources.json');
export const GENERATED_PATH = path.join(REPO_ROOT, 'tools/assets/generated.json');
export const MANIFEST_NAME = 'manifest.json';
export const LICENSES_NAME = 'LICENSES.md';

/** Files that live in `assets/` but describe the tree instead of being part of it. */
export const META_FILES = new Set([MANIFEST_NAME, LICENSES_NAME]);
/** Paths ignored by the gate: manual-download inbox (gitignored) and OS noise. */
export const IGNORED_PREFIXES = ['_inbox/'];
export const IGNORED_BASENAMES = new Set(['.DS_Store']);

/**
 * The only file types allowed under assets/ (passive data the game loads). An allowlist, so any
 * active content (.js, .html, .svg, .wasm, ...) is rejected without having to enumerate it.
 */
export const ALLOWED_EXTENSIONS = new Set(['.glb', '.png', '.json', '.bin', '.ogg', '.m4a', '.mp3', '.woff2', '.txt']);
/** Extension-less license texts shipped by packs (e.g. Fluent Emoji `LICENSE`). */
const LICENSE_BASENAME = /^LICEN[CS]E$/;

export function isAllowedAssetType(rel: string): boolean {
  const ext = path.posix.extname(rel).toLowerCase();
  return ext === '' ? LICENSE_BASENAME.test(path.posix.basename(rel)) : ALLOWED_EXTENSIONS.has(ext);
}

const sha256Schema = z.string().regex(/^([a-f0-9]{64})?$/, 'sha256 must be 64 hex chars or empty (trust-on-first-use)');

const keepRuleSchema = z.object({
  glob: z.string().min(1),
  /** Prefix removed from the archive path before writing under the pack dir. */
  strip: z.string().default(''),
});

const packBase = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  author: z.string().min(1),
  version: z.string().regex(/^[A-Za-z0-9._-]+$/),
  license: z.string().min(1),
  homepage: z.string().url(),
  /** Path (inside the pack dir) of the original license text shipped with the pack. */
  licenseFile: z.string().min(1),
};

const zipPackSchema = z.object({
  ...packBase,
  mode: z.literal('zip'),
  url: z.string().url(),
  sha256: sha256Schema,
  keep: z.array(keepRuleSchema).min(1),
});

/** Manual packs (e.g. itch.io) are downloaded by a human into assets/_inbox/<fileName>. */
const manualPackSchema = z.object({
  ...packBase,
  mode: z.literal('manual'),
  url: z.string().url(),
  fileName: z.string().min(1),
  sha256: sha256Schema,
  keep: z.array(keepRuleSchema).min(1),
});

const filesPackSchema = z.object({
  ...packBase,
  mode: z.literal('files'),
  files: z.array(z.object({ url: z.string().url(), to: z.string().min(1), sha256: sha256Schema })).min(1),
});

export const packSchema = z.discriminatedUnion('mode', [zipPackSchema, manualPackSchema, filesPackSchema]);
export type Pack = z.infer<typeof packSchema>;

export const budgetSchema = z.object({
  packsMaxBytes: z.number().int().positive(),
  fileMaxBytes: z.number().int().positive(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const sourcesSchema = z.object({
  licenseAllowlist: z.array(z.string().min(1)).min(1),
  budget: budgetSchema,
  packs: z.array(packSchema),
});
export type Sources = z.infer<typeof sourcesSchema>;

/** Build outputs derived from vendor packs; declared so the gate can trace their provenance. */
export const generatedRuleSchema = z.object({
  glob: z.string().min(1),
  generator: z.string().min(1),
  derivedFrom: z.array(z.string()),
  license: z.string().min(1),
});
export const generatedRulesSchema = z.array(generatedRuleSchema);
export type GeneratedRule = z.infer<typeof generatedRuleSchema>;

export const manifestFileSchema = z.object({
  path: z.string(),
  pack: z.string(),
  license: z.string(),
  sourceUrl: z.string(),
  sha256: z.string(),
  bytes: z.number().int().nonnegative(),
});
export const manifestGeneratedSchema = z.object({
  path: z.string(),
  license: z.string(),
  generator: z.string(),
  derivedFrom: z.array(z.string()),
  sha256: z.string(),
  bytes: z.number().int().nonnegative(),
});
export const manifestSchema = z.object({
  version: z.literal(1),
  packs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    author: z.string(),
    version: z.string(),
    license: z.string(),
    homepage: z.string(),
    sourceUrl: z.string(),
  })),
  files: z.array(manifestFileSchema),
  generated: z.array(manifestGeneratedSchema),
});
export type Manifest = z.infer<typeof manifestSchema>;

export async function readJson<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  return schema.parse(raw);
}

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export async function sha256File(file: string): Promise<{ sha256: string; bytes: number }> {
  const data = await readFile(file);
  return { sha256: sha256(data), bytes: data.byteLength };
}

/**
 * Recursively lists regular files under `dir` as POSIX paths relative to `dir`, sorted for
 * determinism. Symlinks and special files are never followed (a link could smuggle an unlicensed
 * file past the gate): they go to `onIrregular`, or throw when no handler is given.
 */
export async function listFiles(dir: string, onIrregular?: (rel: string) => void): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full).split(path.sep).join('/');
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(rel);
      else if (onIrregular) onIrregular(rel);
      else throw new Error(`not a regular file (symlink or special): ${rel}`);
    }
  }
  await walk(dir);
  return out.sort();
}

export function isIgnoredAssetPath(rel: string): boolean {
  if (IGNORED_PREFIXES.some((prefix) => rel.startsWith(prefix))) return true;
  return IGNORED_BASENAMES.has(path.posix.basename(rel));
}

export function packDir(pack: Pick<Pack, 'id' | 'version'>): string {
  return `packs/${pack.id}/${pack.version}`;
}

export function packSourceUrl(pack: Pack): string {
  return pack.mode === 'files' ? pack.homepage : pack.url;
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
