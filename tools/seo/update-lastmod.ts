// `pnpm seo:lastmod`: moves the sitemap's `lastmod` days on. apps/web/seo-lastmod.json keeps, per public page, the
// content hash and the day that hash was first seen; this records today (Asia/Saigon) for every page whose content
// changed since and for pages that are new, drops pages that are gone, and leaves the rest alone. Run it after
// content that a page shows changes (a lesson's quests, the landing words, the preview cards) and commit the file; the
// release build then dates those pages, and any it could not date it lists without a `lastmod`.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSite, sitemapPages } from '../../apps/web/vite-lesson-pages';
import { LASTMOD_LEDGER, readLedger, updateLedger } from '../../apps/web/vite-sitemap';
import { CONTENT_SECURITY_POLICY } from '../../apps/web/vite.config';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';

/** Today as a `YYYY-MM-DD` day in Asia/Saigon (+07:00), wherever the machine is. */
export const saigonDay = (now: Date = new Date()): string => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

function main(): void {
  const appDir = path.join(REPO_ROOT, 'apps/web');
  const site = buildSite({ contentDir: path.join(REPO_ROOT, 'content'), assetsDir: ASSETS_DIR, csp: CONTENT_SECURITY_POLICY });
  const pages = sitemapPages(site, path.join(appDir, 'index.html'));
  const before = readLedger(LASTMOD_LEDGER);
  const after = updateLedger(before, pages, saigonDay());
  const moved = pages.filter((page) => before[page.path]?.hash !== page.hash).length;
  const gone = Object.keys(before).filter((key) => !(key in after)).length;
  writeFileSync(LASTMOD_LEDGER, `${JSON.stringify(after, null, 2)}\n`);
  console.log(`seo:lastmod: ${pages.length} pages, ${moved} new or changed, ${gone} dropped → ${path.relative(REPO_ROOT, LASTMOD_LEDGER)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
