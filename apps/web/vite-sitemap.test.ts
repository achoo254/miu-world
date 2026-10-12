import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LASTMOD_LEDGER, lastmodOf, readLedger, robotsTxt, sitemap, sitemapXml, updateLedger, type LastmodLedger } from './vite-sitemap';

const PAGES = [
  { path: '/', hash: 'aaaaaaaaaaaa' },
  { path: '/bai/toan-2/', hash: 'bbbbbbbbbbbb' },
  { path: '/bai/toan-2-bai-1-on-tap-cac-so-den-100/', hash: 'cccccccccccc' },
];
const LEDGER: LastmodLedger = {
  '/': { hash: 'aaaaaaaaaaaa', date: '2026-10-12' },
  '/bai/toan-2/': { hash: 'old000000000', date: '2026-10-01' },
};

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe('robots.txt', () => {
  it('lets crawlers in on a release, keeps the API out and names the sitemap', () => {
    const robots = robotsTxt({ release: true });
    expect(robots).toContain('User-agent: *\nAllow: /\n');
    expect(robots).toContain('Disallow: /api/\n');
    expect(robots).toContain('Disallow: /moi/\n');
    expect(robots).toContain('Sitemap: https://miu.hoandat.com/sitemap.xml\n');
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  it('keeps every crawler out of any other build', () => {
    expect(robotsTxt({ release: false })).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('sitemap.xml', () => {
  it('lists each page with its absolute address and the day it last changed when that is on record', () => {
    const xml = sitemapXml(PAGES, LEDGER);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([
      'https://miu.hoandat.com/',
      'https://miu.hoandat.com/bai/toan-2/',
      'https://miu.hoandat.com/bai/toan-2-bai-1-on-tap-cac-so-den-100/',
    ]);
    // Only the page whose hash is the one on record has a date: the others changed since, or are new.
    expect([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])).toEqual(['2026-10-12']);
    expect(xml.endsWith('</urlset>\n')).toBe(true);
  });

  it('is written without dates when there is no ledger', () => {
    expect(sitemapXml(PAGES, {})).not.toContain('lastmod');
  });
});

describe('the lastmod ledger', () => {
  it('gives a page its day only while its hash is the recorded one', () => {
    expect(lastmodOf(LEDGER, PAGES[0] ?? { path: '', hash: '' })).toBe('2026-10-12');
    expect(lastmodOf(LEDGER, PAGES[1] ?? { path: '', hash: '' })).toBeUndefined();
    expect(lastmodOf(LEDGER, PAGES[2] ?? { path: '', hash: '' })).toBeUndefined();
  });

  it('moves a page\'s day on only when its hash changed, and drops pages that are gone', () => {
    const updated = updateLedger({ ...LEDGER, '/gone/': { hash: 'x', date: '2026-09-01' } }, PAGES, '2026-10-13');
    expect(updated).toEqual({
      '/': { hash: 'aaaaaaaaaaaa', date: '2026-10-12' },
      '/bai/toan-2/': { hash: 'bbbbbbbbbbbb', date: '2026-10-13' },
      '/bai/toan-2-bai-1-on-tap-cac-so-den-100/': { hash: 'cccccccccccc', date: '2026-10-13' },
    });
    expect(updateLedger(updated, PAGES, '2026-10-20')).toEqual(updated);
  });

  it('reads a ledger file, and a missing or broken one as empty', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'miu-ledger-'));
    const file = path.join(dir, 'ledger.json');
    expect(readLedger(file)).toEqual({});
    writeFileSync(file, 'not json');
    expect(readLedger(file)).toEqual({});
    writeFileSync(file, JSON.stringify({ '/': { hash: 'h', date: '2026-10-12' }, '/bad/': { hash: 1, date: 'x' }, '/worse/': null }));
    expect(readLedger(file)).toEqual({ '/': { hash: 'h', date: '2026-10-12' } });
  });

  it('is a file next to the build', () => {
    expect(path.basename(LASTMOD_LEDGER)).toBe('seo-lastmod.json');
  });
});

describe('the plugin', () => {
  const emitted = (release: boolean): string[] => {
    const files: string[] = [];
    const warnings: string[] = [];
    const plugin = sitemap({ pages: PAGES, ledger: LEDGER, release });
    const hook = plugin.generateBundle;
    const generate = typeof hook === 'function' ? hook : hook?.handler;
    generate?.call({ emitFile: (file: { fileName: string }) => files.push(file.fileName), warn: (message: string) => warnings.push(message) } as never, {} as never, {} as never, false);
    return release ? [...files, ...warnings.map(() => 'warning')] : files;
  };

  it('writes robots.txt and the sitemap on a release (warning about pages without a date), only robots.txt otherwise', () => {
    expect(emitted(true)).toEqual(['robots.txt', 'sitemap.xml', 'warning']);
    expect(emitted(false)).toEqual(['robots.txt']);
  });
});
