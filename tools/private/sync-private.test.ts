import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MANIFEST, icloudRoot, syncPrivate } from './sync-private';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function setup(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), 'miu-private-'));
  dirs.push(root);
  const icloud = path.join(root, 'icloud');
  const repo = path.join(root, 'repo');
  for (const [from, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(icloud, 'box', from)), { recursive: true });
    writeFileSync(path.join(icloud, 'box', from), body);
  }
  const entry = (from: string, body: string) => ({
    from,
    to: `.data/${from}`,
    bytes: Buffer.byteLength(body),
    sha256: createHash('sha256').update(body).digest('hex'),
    why: 'test',
  });
  return { icloud, repo, entry };
}

describe('private file sync', () => {
  it('finds iCloud Drive on macOS and Windows, or where MIU_ICLOUD_DIR says', () => {
    expect(icloudRoot({}, 'darwin', '/Users/a')).toBe(path.join('/Users/a', 'Library/Mobile Documents/com~apple~CloudDocs'));
    expect(icloudRoot({}, 'win32', 'C:/Users/a')).toBe(path.join('C:/Users/a', 'iCloudDrive'));
    expect(icloudRoot({ MIU_ICLOUD_DIR: '/mnt/icloud' }, 'linux', '/home/a')).toBe('/mnt/icloud');
    expect(icloudRoot({}, 'linux', '/home/a')).toBeNull();
  });

  it('reports what is missing, copies it with a matching hash, then finds everything in place', async () => {
    const { icloud, repo, entry } = setup({ 'fonts/a.woff2': 'font bytes' });
    const manifest = { folder: 'box', files: [entry('fonts/a.woff2', 'font bytes')] };
    expect((await syncPrivate({ manifest, repo, icloud, check: true })).map((r) => r.state)).toEqual(['missing']);
    expect((await syncPrivate({ manifest, repo, icloud, check: false })).map((r) => r.state)).toEqual(['copied']);
    expect(readFileSync(path.join(repo, '.data/fonts/a.woff2'), 'utf8')).toBe('font bytes');
    expect((await syncPrivate({ manifest, repo, icloud, check: false })).map((r) => r.state)).toEqual(['ok']);
    expect((await syncPrivate({ manifest, repo, icloud, check: true })).map((r) => r.state)).toEqual(['ok']);
  });

  it('never copies a source whose hash differs, and says when iCloud has no such file', async () => {
    const { icloud, repo, entry } = setup({ 'sgk/book.pdf': 'edited scan' });
    const manifest = { folder: 'box', files: [entry('sgk/book.pdf', 'original scan'), entry('sgk/other.pdf', 'x')] };
    expect((await syncPrivate({ manifest, repo, icloud, check: false })).map((r) => r.state)).toEqual(['source-changed', 'no-source']);
    expect((await syncPrivate({ manifest, repo, icloud: null, check: false })).map((r) => r.state)).toEqual(['no-source', 'no-source']);
  });

  it('keeps the shipped list under .data/, which git ignores', () => {
    const list = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { files: Array<{ to: string }> };
    expect(list.files.length).toBeGreaterThan(0);
    for (const file of list.files) expect(file.to.startsWith('.data/')).toBe(true);
  });
});
