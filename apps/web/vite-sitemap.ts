// `robots.txt` and `sitemap.xml` of the build. A release lets crawlers in (the API stays closed) and lists the home page,
// the subject pages and every lesson page; any other build (review, E2E, local) tells every crawler to stay out and
// has no sitemap, so a copy of the game on another address is never indexed.
//
// A page's `lastmod` is the day its content last changed. Nothing here asks git: `seo-lastmod.json` (next to this file)
// keeps, per page, the content hash and the day that hash was first seen, and `pnpm seo:lastmod` (tools/seo/update-lastmod.ts)
// moves a page's day on when its hash has changed. A page whose hash is not the one on record (not updated yet) simply
// has no `lastmod`: Google ignores a date it cannot trust, and a missing ledger never breaks the build.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { absoluteUrl, escapeHtml } from './vite-seo-meta.ts';

export interface SitemapPage {
  /** The page's address (`/` or `/bai/toan-2/`). */
  path: string;
  /** Changes when what the page says changes. */
  hash: string;
}

/** Page address → the content hash on record and the day it was first seen (`YYYY-MM-DD`). */
export type LastmodLedger = Record<string, { hash: string; date: string }>;

/** The ledger file, kept in the repo next to this module. */
export const LASTMOD_LEDGER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seo-lastmod.json');

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The ledger file's content; none, or one that is not a ledger, is an empty one. */
export function readLedger(file: string): LastmodLedger {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const ledger: LastmodLedger = {};
  for (const [path, entry] of Object.entries(raw)) {
    const { hash, date } = (entry ?? {}) as { hash?: unknown; date?: unknown };
    if (typeof hash === 'string' && typeof date === 'string' && DAY.test(date)) ledger[path] = { hash, date };
  }
  return ledger;
}

/** The day of `page`'s last change, when the ledger has its current hash; otherwise none. */
export const lastmodOf = (ledger: LastmodLedger, page: SitemapPage): string | undefined => (ledger[page.path]?.hash === page.hash ? ledger[page.path]?.date : undefined);

/** The ledger after `today`'s pages: a page whose hash changed (or is new) gets `today`; pages that are gone are dropped. */
export function updateLedger(ledger: LastmodLedger, pages: readonly SitemapPage[], today: string): LastmodLedger {
  const updated: LastmodLedger = {};
  for (const page of [...pages].sort((a, b) => a.path.localeCompare(b.path))) {
    const known = ledger[page.path];
    updated[page.path] = known?.hash === page.hash ? known : { hash: page.hash, date: today };
  }
  return updated;
}

export function robotsTxt({ release }: { release: boolean }): string {
  if (!release) return 'User-agent: *\nDisallow: /\n';
  // An invite link (`/moi/<code>`) is for one person: crawlers leave it out, as the API.
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /moi/\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
}

export function sitemapXml(pages: readonly SitemapPage[], ledger: LastmodLedger): string {
  const urls = pages.map((page) => {
    const lastmod = lastmodOf(ledger, page);
    return `  <url>\n    <loc>${escapeHtml(absoluteUrl(page.path))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function sitemap({ pages, ledger, release }: { pages: readonly SitemapPage[]; ledger: LastmodLedger; release: boolean }): Plugin {
  return {
    name: 'miu-sitemap',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt({ release }) });
      if (!release) return;
      const stale = pages.filter((page) => lastmodOf(ledger, page) === undefined).length;
      if (stale > 0) this.warn(`sitemap: ${stale} page(s) have no lastmod yet: run pnpm seo:lastmod and commit apps/web/seo-lastmod.json`);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(pages, ledger) });
    },
  };
}
