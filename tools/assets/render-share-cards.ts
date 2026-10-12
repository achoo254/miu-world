/// <reference lib="dom" />
// Draws the preview pictures a pasted link shows (Open Graph / Twitter cards, 1200 × 630): one for the whole game and
// one per lesson page, each from an HTML page of its own (the Miu logo, the island overview the Home screen shows,
// the Baloo 2 font pack, the colours of the UI tokens) photographed by headless Chromium, like render-preview.ts.
// Output: assets/generated/share-cards/<name>.png, named by `packages/schema/src/share-cards.ts`; the lesson cards
// follow the lesson pages (the books' tables of contents and the quests that play each lesson). Re-run
// `pnpm assets:cards` after a lesson's title or the set of lessons with a quest changes; the same input gives the
// same bytes on the same machine (run twice and compare the hashes).
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { splitLessonTitle } from '../../packages/schema/src/lesson-pages';
import { GENERAL_SHARE_CARD, SHARE_CARD_DIR, SHARE_CARD_SIZE, lessonShareCard } from '../../packages/schema/src/share-cards';
import { pairOf, type TextKey } from '../../apps/web/src/ui/i18n/i18n';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { writeManifest } from './build-manifest';

const OUT_DIR = path.join(ASSETS_DIR, SHARE_CARD_DIR);
const TOKENS_CSS = path.join(REPO_ROOT, 'apps/web/src/ui/tokens.css');
const LOGO = 'generated/brand/miu-logo-512.png';
const ISLANDS = 'generated/home/world.png';
const FONT_DIR = 'packs/font-baloo-2/5.3.0';
/** The two subsets the Vietnamese UI loads (apps/web/src/ui/fonts.css), with the ranges each one is used for. */
const FONT_FILES = [
  { file: 'baloo-2-vietnamese-800.woff2', weight: 800, range: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' },
  { file: 'baloo-2-latin-800.woff2', weight: 800, range: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' },
] as const;

const text = (key: TextKey, params?: Record<string, string>): string => pairOf(key, params).vi;
export const escapeHtml = (value: string): string => value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch);

/** A custom property of tokens.css (`--color-primary`), so the cards use the UI's own colours. */
export function token(css: string, name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  if (!match?.[1]) throw new Error(`${name} is not in tokens.css`);
  return match[1].trim();
}

const dataUrl = async (rel: string, mime: string): Promise<string> => `data:${mime};base64,${(await readFile(path.join(ASSETS_DIR, rel))).toString('base64')}`;

export interface Look {
  /** The text of tokens.css, for pictures that take more colours from it. */
  tokens: string;
  css: string;
  logo: string;
  islands: string;
  fontFaces: string;
}

export async function loadLook(): Promise<Look> {
  const tokens = await readFile(TOKENS_CSS, 'utf8');
  const [skyTop, skyMid, skyBottom] = ['--color-sky-top', '--color-sky-mid', '--color-sky-bottom'].map((name) => token(tokens, name));
  const fontFaces = (
    await Promise.all(
      FONT_FILES.map(async ({ file, weight, range }) => `@font-face { font-family: 'Baloo 2'; font-weight: ${weight}; src: url(${await dataUrl(`${FONT_DIR}/${file}`, 'font/woff2')}) format('woff2'); unicode-range: ${range}; }`),
    )
  ).join('\n');
  const css = `
    * { box-sizing: border-box; margin: 0; }
    html, body { width: ${SHARE_CARD_SIZE.width}px; height: ${SHARE_CARD_SIZE.height}px; overflow: hidden; }
    body {
      font-family: 'Baloo 2', sans-serif;
      font-weight: 800;
      color: ${token(tokens, '--color-ink')};
      background: linear-gradient(180deg, ${skyTop} 0%, ${skyMid} 55%, ${skyBottom} 100%);
    }
    .card { position: relative; width: 100%; height: 100%; padding: 56px 64px; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 20px; }
    .brand img { width: 88px; height: 88px; border-radius: 22px; box-shadow: 0 6px 0 rgba(43, 33, 64, 0.12); }
    .brand span { font-size: 56px; line-height: 1; color: ${token(tokens, '--color-primary')}; text-shadow: 0 4px 0 #fff, 0 8px 0 ${token(tokens, '--color-logo-shade')}; }
    .pill { display: inline-block; padding: 6px 24px; border-radius: 999px; background: ${token(tokens, '--color-badge')}; color: ${token(tokens, '--color-badge-ink')}; font-size: 34px; line-height: 1.3; }
    .line { font-size: 40px; line-height: 1.2; }
    .name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; max-width: 800px; line-height: 1.08; color: ${token(tokens, '--color-ink')}; }
    .play { font-size: 36px; color: ${token(tokens, '--color-ink-soft')}; }
    .general-text { display: flex; flex-direction: column; gap: 28px; max-width: 540px; }
    .general-text .tagline { font-size: 54px; line-height: 1.12; text-wrap: balance; }
    .general-text .free { font-size: 34px; color: ${token(tokens, '--color-primary-edge')}; }
    .islands { position: absolute; right: -40px; top: 40px; width: 720px; height: auto; filter: drop-shadow(0 18px 18px rgba(47, 96, 170, 0.25)); }
    .lesson-logo { position: absolute; right: 64px; bottom: 56px; width: 232px; height: 232px; border-radius: 56px; box-shadow: 0 10px 0 rgba(43, 33, 64, 0.12); }
  `;
  return { tokens, css, logo: await dataUrl(LOGO, 'image/png'), islands: await dataUrl(ISLANDS, 'image/png'), fontFaces };
}

const page = (look: Look, body: string): string =>
  `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><style>${look.fontFaces}${look.css}</style></head><body><div class="card">${body}</div></body></html>`;

const brand = (look: Look): string => `<div class="brand"><img src="${look.logo}" alt=""><span>Miu World</span></div>`;

/** The card of the whole game: its name, what it is for, and the island overview. */
const generalCard = (look: Look): string =>
  page(
    look,
    `${brand(look)}
     <img class="islands" src="${look.islands}" alt="">
     <div class="general-text"><p class="tagline">${escapeHtml(text('shareCard.tagline'))}</p><p class="free">${escapeHtml(text('shareCard.free'))}</p></div>`,
  );

/** A lesson's card: its number and name, the book, and the logo. */
function lessonCard(look: Look, title: string, subject: string): string {
  const { label, name } = splitLessonTitle(title);
  // A long name steps down a size so it keeps clear of the logo and to four lines.
  const size = name.length > 46 ? 56 : name.length > 30 ? 68 : 84;
  return page(
    look,
    `${brand(look)}
     <div style="display:flex;flex-direction:column;gap:20px;align-items:flex-start">
       ${label ? `<span class="pill">${escapeHtml(label)}</span>` : ''}
       <p class="name" style="font-size:${size}px">${escapeHtml(name)}</p>
     </div>
     <div style="display:flex;flex-direction:column;gap:6px">
       <p class="line">${escapeHtml(text('shareCard.lessonLine', { subject }))}</p>
       <p class="play">${escapeHtml(text('shareCard.playLine'))}</p>
     </div>
     <img class="lesson-logo" src="${look.logo}" alt="">`,
  );
}

/** Photographs `html` at `size` into the absolute path `target`, once the page has its fonts. */
export async function photograph(tab: Page, html: string, target: string, size: { width: number; height: number }): Promise<void> {
  await tab.setContent(html, { waitUntil: 'load' });
  // The fonts are data: URLs; wait until the page has them before it is photographed.
  await tab.evaluate(async () => {
    await document.fonts.ready;
    if (!document.fonts.check("800 40px 'Baloo 2'")) throw new Error('the Baloo 2 font did not load');
  });
  await mkdir(path.dirname(target), { recursive: true });
  await tab.screenshot({ path: target, type: 'png', animations: 'disabled', clip: { x: 0, y: 0, ...size } });
}

/** `photograph` into `file`, relative to `assets/` (a share card unless told otherwise). */
export const shoot = (tab: Page, html: string, file: string, size: { width: number; height: number } = SHARE_CARD_SIZE): Promise<void> => photograph(tab, html, path.join(ASSETS_DIR, file), size);

async function main(): Promise<void> {
  const look = await loadLook();
  const lessons = readLessonPageData(path.join(REPO_ROOT, 'content'));
  await rm(OUT_DIR, { recursive: true, force: true });
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: SHARE_CARD_SIZE, deviceScaleFactor: 1 });
    await shoot(tab, generalCard(look), GENERAL_SHARE_CARD);
    for (const lesson of lessons) await shoot(tab, lessonCard(look, lesson.title, lesson.subject.name), lessonShareCard(lesson.slug));
  } finally {
    await browser.close();
  }
  console.log(`render-share-cards: ${lessons.length + 1} images in ${path.relative(process.cwd(), OUT_DIR)}`);
  await writeManifest();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
