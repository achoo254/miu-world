// License + integrity gate: every file under assets/ must be declared in the manifest with an
// allowlisted license and a matching hash, no active-content files, and the tree stays in budget.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSETS_DIR,
  MANIFEST_NAME,
  META_FILES,
  SOURCES_PATH,
  isAllowedAssetType,
  isIgnoredAssetPath,
  listFiles,
  manifestSchema,
  readJson,
  sha256File,
  sourcesSchema,
  type Budget,
  type Manifest,
} from './asset-lib';
import { buildManifest, serializeManifest } from './build-manifest';

export interface CheckInput {
  assetsDir: string;
  manifest: Manifest;
  allowlist: string[];
  budget: Budget;
}

export async function checkAssets({ assetsDir, manifest, allowlist, budget }: CheckInput): Promise<string[]> {
  const errors: string[] = [];
  const allowed = new Set(allowlist);
  const declared = new Map<string, { sha256: string; bytes: number; license: string }>();
  for (const entry of [...manifest.files, ...manifest.generated]) declared.set(entry.path, entry);

  for (const pack of manifest.packs) {
    if (!allowed.has(pack.license)) errors.push(`license not allowed (${pack.license}) for pack ${pack.id}`);
  }

  const irregular: string[] = [];
  const onDisk = (await listFiles(assetsDir, (rel) => irregular.push(rel))).filter((rel) => !META_FILES.has(rel) && !isIgnoredAssetPath(rel));
  for (const rel of irregular) if (!isIgnoredAssetPath(rel)) errors.push(`not a regular file (symlink or special): ${rel}`);
  const onDiskSet = new Set(onDisk);
  let packsBytes = 0;

  for (const rel of onDisk) {
    if (!isAllowedAssetType(rel)) {
      errors.push(`forbidden file type: ${rel}`);
      continue;
    }
    const entry = declared.get(rel);
    if (!entry) {
      errors.push(`not in manifest: ${rel}`);
      continue;
    }
    const actual = await sha256File(path.join(assetsDir, rel));
    if (rel.startsWith('packs/')) packsBytes += actual.bytes;
    if (actual.bytes > budget.fileMaxBytes) errors.push(`file over budget: ${rel} (${actual.bytes} > ${budget.fileMaxBytes} bytes)`);
    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) errors.push(`hash mismatch: ${rel}`);
    if (!allowed.has(entry.license)) errors.push(`license not allowed (${entry.license}): ${rel}`);
  }

  for (const rel of declared.keys()) {
    if (!onDiskSet.has(rel)) errors.push(`missing file: ${rel}`);
  }

  if (packsBytes > budget.packsMaxBytes) {
    errors.push(`packs over budget: ${packsBytes} > ${budget.packsMaxBytes} bytes (move large packs to Git LFS)`);
  }
  return errors;
}

async function main(): Promise<void> {
  const sources = await readJson(SOURCES_PATH, sourcesSchema);
  const manifest = await readJson(path.join(ASSETS_DIR, MANIFEST_NAME), manifestSchema);
  const errors = await checkAssets({
    assetsDir: ASSETS_DIR,
    manifest,
    allowlist: sources.licenseAllowlist,
    budget: sources.budget,
  });
  // The manifest must be exactly what the tools derive from sources.json + generated.json: a
  // hand-edited entry (e.g. relabelled license or undeclared generated file) cannot pass.
  const onDiskManifest = await readFile(path.join(ASSETS_DIR, MANIFEST_NAME), 'utf8');
  if (onDiskManifest !== serializeManifest(await buildManifest())) {
    errors.push('manifest.json differs from what sources.json + generated.json produce: run `pnpm assets:manifest` and review the diff');
  }
  const total = manifest.files.length + manifest.generated.length;
  if (errors.length > 0) {
    console.error(`assets:check FAILED (${errors.length} problem(s)):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`assets:check OK — ${manifest.packs.length} packs, ${total} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
