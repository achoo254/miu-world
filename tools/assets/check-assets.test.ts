import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sha256, type Budget, type Manifest } from './asset-lib';
import { checkAssets } from './check-assets';

const ALLOWLIST = ['CC0-1.0', 'MIT', 'OFL-1.1'];
const BUDGET: Budget = { packsMaxBytes: 1024, fileMaxBytes: 512 };

let dir: string;

async function put(rel: string, content: string | Uint8Array): Promise<{ path: string; sha256: string; bytes: number }> {
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const full = path.join(dir, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return { path: rel, sha256: sha256(data), bytes: data.byteLength };
}

function manifestWith(files: Array<{ path: string; sha256: string; bytes: number; license?: string }>): Manifest {
  return {
    version: 1,
    packs: [],
    files: files.map((f) => ({
      path: f.path,
      pack: 'test-pack',
      license: f.license ?? 'CC0-1.0',
      sourceUrl: 'https://example.test/pack.zip',
      sha256: f.sha256,
      bytes: f.bytes,
    })),
    generated: [],
  };
}

async function run(manifest: Manifest): Promise<string[]> {
  return checkAssets({ assetsDir: dir, manifest, allowlist: ALLOWLIST, budget: BUDGET });
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'miu-assets-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('checkAssets', () => {
  it('passes a tree that matches the manifest', async () => {
    const a = await put('packs/test-pack/1.0/model.glb', 'glb');
    const b = await put('packs/test-pack/1.0/License.txt', 'CC0');
    expect(await run(manifestWith([a, b]))).toEqual([]);
  });

  it('fails on a file that is not in the manifest', async () => {
    const a = await put('packs/test-pack/1.0/model.glb', 'glb');
    await put('packs/test-pack/1.0/stray.png', 'png');
    const errors = await run(manifestWith([a]));
    expect(errors).toEqual([expect.stringContaining('not in manifest: packs/test-pack/1.0/stray.png')]);
  });

  it('fails when a file hash no longer matches', async () => {
    const a = await put('packs/test-pack/1.0/model.glb', 'glb');
    await put('packs/test-pack/1.0/model.glb', 'tampered');
    const errors = await run(manifestWith([a]));
    expect(errors).toEqual([expect.stringContaining('hash mismatch: packs/test-pack/1.0/model.glb')]);
  });

  it('fails on a license outside the allowlist', async () => {
    const a = await put('packs/test-pack/1.0/model.glb', 'glb');
    const errors = await run(manifestWith([{ ...a, license: 'CC-BY-4.0' }]));
    expect(errors).toEqual([expect.stringContaining('license not allowed (CC-BY-4.0)')]);
  });

  it('fails on an executable file even when it is listed', async () => {
    const a = await put('packs/test-pack/1.0/payload.js', 'alert(1)');
    const errors = await run(manifestWith([a]));
    expect(errors).toEqual([expect.stringContaining('forbidden file type: packs/test-pack/1.0/payload.js')]);
  });

  it('rejects active or unknown file types (allowlist), even when listed', async () => {
    const svg = await put('packs/test-pack/1.0/icon.svg', '<svg onload="x()"/>');
    const wasm = await put('packs/test-pack/1.0/mod.wasm', 'x');
    const errors = await run(manifestWith([svg, wasm]));
    expect(errors).toEqual([
      expect.stringContaining('forbidden file type: packs/test-pack/1.0/icon.svg'),
      expect.stringContaining('forbidden file type: packs/test-pack/1.0/mod.wasm'),
    ]);
  });

  it('rejects symlinks even when the target hash matches the manifest', async () => {
    const target = await put('elsewhere/secret.png', 'unlicensed');
    await mkdir(path.join(dir, 'packs/test-pack/1.0'), { recursive: true });
    await symlink(path.join(dir, target.path), path.join(dir, 'packs/test-pack/1.0/linked.png'));
    const errors = await run(manifestWith([target, { ...target, path: 'packs/test-pack/1.0/linked.png' }]));
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('not a regular file (symlink or special): packs/test-pack/1.0/linked.png')]),
    );
  });

  it('fails when the packs tree or a single file exceeds the size budget', async () => {
    const big = await put('packs/test-pack/1.0/big.bin', new Uint8Array(600));
    const rest = await put('packs/test-pack/1.0/rest.bin', new Uint8Array(500));
    const errors = await run(manifestWith([big, rest]));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('file over budget: packs/test-pack/1.0/big.bin'),
        expect.stringContaining('packs over budget'),
      ]),
    );
  });

  it('fails when a manifest entry points at a missing file', async () => {
    const errors = await run(manifestWith([{ path: 'packs/test-pack/1.0/gone.glb', sha256: 'x', bytes: 1 }]));
    expect(errors).toEqual([expect.stringContaining('missing file: packs/test-pack/1.0/gone.glb')]);
  });

  it('ignores the manifest itself, the manual inbox and OS noise', async () => {
    await put('manifest.json', '{}');
    await put('LICENSES.md', '#');
    await put('_inbox/kaykit.zip', 'zip');
    await put('packs/.DS_Store', 'x');
    expect(await run(manifestWith([]))).toEqual([]);
  });
});
