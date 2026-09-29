// Downloads every pack declared in sources.json, verifies its sha256 (recording it on first use),
// and extracts only the whitelisted files into assets/packs/<pack>/<version>/.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipSync } from 'fflate';
import picomatch from 'picomatch';
import {
  ASSETS_DIR,
  REPO_ROOT,
  SOURCES_PATH,
  fileExists,
  readJson,
  sha256,
  sourcesSchema,
  packDir,
  type Pack,
} from './asset-lib';

const CACHE_DIR = path.join(REPO_ROOT, '.cache/miu-assets');

type KeepRule = { glob: string; strip: string };

async function download(url: string): Promise<Uint8Array> {
  const cached = path.join(CACHE_DIR, sha256(new TextEncoder().encode(url)));
  if (await fileExists(cached)) return new Uint8Array(await readFile(cached));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} ${res.statusText}: ${url}`);
  const data = new Uint8Array(await res.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, data);
  return data;
}

/**
 * Trust-on-first-use: an empty sha256 is filled with the downloaded hash; a non-empty one must match.
 * Returns the hash to store back into sources.json.
 */
function verifyHash(label: string, expected: string, data: Uint8Array): string {
  const actual = sha256(data);
  if (expected === '') {
    console.log(`  TOFU ${label}: recorded sha256 ${actual}`);
    return actual;
  }
  if (expected !== actual) {
    throw new Error(`sha256 mismatch for ${label}: expected ${expected}, got ${actual}. Update sources.json only after review.`);
  }
  return actual;
}

/** Maps archive entries to vendor-relative paths using the keep rules (first matching rule wins). */
export function selectZipEntries(names: string[], keep: KeepRule[]): Map<string, string> {
  const matchers = keep.map((rule) => ({ rule, isMatch: picomatch(rule.glob, { dot: false }) }));
  const selected = new Map<string, string>();
  for (const name of names) {
    if (name.endsWith('/')) continue;
    const hit = matchers.find((m) => m.isMatch(name));
    if (!hit) continue;
    if (!name.startsWith(hit.rule.strip)) throw new Error(`keep rule strip "${hit.rule.strip}" does not prefix ${name}`);
    selected.set(name, name.slice(hit.rule.strip.length));
  }
  return selected;
}

async function writePackFile(pack: Pack, rel: string, data: Uint8Array): Promise<void> {
  const target = path.join(ASSETS_DIR, packDir(pack), rel);
  const root = path.join(ASSETS_DIR, packDir(pack)) + path.sep;
  if (!target.startsWith(root)) throw new Error(`path escapes pack dir: ${rel}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

async function readArchive(pack: Extract<Pack, { mode: 'zip' | 'manual' }>): Promise<Uint8Array> {
  if (pack.mode === 'zip') return download(pack.url);
  const inbox = path.join(ASSETS_DIR, '_inbox', pack.fileName);
  if (!(await fileExists(inbox))) {
    throw new Error(`manual pack ${pack.id}: download ${pack.url} by hand and save it as assets/_inbox/${pack.fileName}`);
  }
  return new Uint8Array(await readFile(inbox));
}

async function fetchPack(pack: Pack): Promise<Pack> {
  console.log(`- ${pack.id}@${pack.version} (${pack.mode})`);
  await rm(path.join(ASSETS_DIR, packDir(pack)), { recursive: true, force: true });

  if (pack.mode === 'files') {
    const files = [];
    for (const file of pack.files) {
      const data = await download(file.url);
      files.push({ ...file, sha256: verifyHash(`${pack.id}/${file.to}`, file.sha256, data) });
      await writePackFile(pack, file.to, data);
    }
    return { ...pack, files };
  }

  const archive = await readArchive(pack);
  const hash = verifyHash(pack.id, pack.sha256, archive);
  const entries = unzipSync(archive);
  const selected = selectZipEntries(Object.keys(entries), pack.keep);
  if (selected.size === 0) throw new Error(`${pack.id}: keep rules matched no files`);
  for (const [name, rel] of selected) {
    const data = entries[name];
    if (data) await writePackFile(pack, rel, data);
  }
  console.log(`  kept ${selected.size} files`);
  return { ...pack, sha256: hash };
}

/** Removes pack folders for packs/versions no longer declared, so the tree mirrors sources.json. */
async function pruneStalePacks(packs: Pack[]): Promise<void> {
  const wanted = new Set(packs.map((p) => packDir(p)));
  const packsRoot = path.join(ASSETS_DIR, 'packs');
  if (!(await fileExists(packsRoot))) return;
  for (const id of await readdir(packsRoot)) {
    const packRoot = path.join(packsRoot, id);
    const versions = await readdir(packRoot).catch(() => []);
    for (const version of versions) {
      if (!wanted.has(`packs/${id}/${version}`)) {
        console.log(`- prune stale packs/${id}/${version}`);
        await rm(path.join(packRoot, version), { recursive: true, force: true });
      }
    }
    if ((await readdir(packRoot).catch(() => [])).length === 0) await rm(packRoot, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const sources = await readJson(SOURCES_PATH, sourcesSchema);
  const updated: Pack[] = [];
  for (const pack of sources.packs) {
    if (!sources.licenseAllowlist.includes(pack.license)) {
      throw new Error(`${pack.id}: license ${pack.license} is not in the allowlist`);
    }
    const next = await fetchPack(pack);
    if (!(await fileExists(path.join(ASSETS_DIR, packDir(pack), pack.licenseFile)))) {
      throw new Error(`${pack.id}: license file ${pack.licenseFile} missing after extraction`);
    }
    updated.push(next);
  }
  await pruneStalePacks(sources.packs);
  const next = { ...sources, packs: updated };
  if (JSON.stringify(next) !== JSON.stringify(sources)) {
    await writeFile(SOURCES_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log('sources.json updated with first-use hashes');
  }
  console.log('assets:fetch done — run `pnpm assets:manifest` next');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
