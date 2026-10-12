/// <reference lib="dom" />
// `pnpm marketing:clip -- <lesson id or page slug>`: films a vertical clip (1080 × 1920, about 20 s) of one lesson. A title
// card (the lesson, its subject, the book, the Miu logo), a camera flight over the region of the quest that plays the lesson
// (the game's own preview page, a frame at a time), an end card with the lesson page's address, and a licensed music track
// (Komiku, CC0, from the pack the game plays). Pictures are taken by headless Chromium like the other render tools; the
// parts are joined by the machine's ffmpeg. Nothing is posted anywhere and no player or real person is in the picture.
// Output only to `.data/marketing/clips/<slug>.mp4` (git-ignored: videos are never committed).
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';
import { pairOf, type TextKey } from '../../apps/web/src/ui/i18n/i18n';
import { readLessonPageData, type LessonPageData } from '../../apps/web/lesson-page-data';
import { SITE_ORIGIN } from '../../apps/web/vite-seo-meta';
import { lessonPagePath, splitLessonTitle } from '../../packages/schema/src/lesson-pages';
import { REPO_ROOT } from '../assets/asset-lib';
import { PREVIEW_ORIGIN, blockIds, mapBlocks, startPreviewServer } from '../assets/render-preview';
import { escapeHtml, loadLook, photograph, token, type Look } from '../assets/render-share-cards';
import { findClipScene, type ClipScene } from './clip-scene';
import { CLIP_DIR, CLIP_SIZE, FLIGHT_FRAMES, assertFfmpeg, encodeClip, pickTrack, trackFile } from './clip-encode';
import { cameraAt, chooseFlight, FLIGHT_REACH, type CameraPose, type FlightPlan } from './flight-path';

const WORK_DIR = path.join(REPO_ROOT, '.data/marketing/work');

const text = (key: TextKey, params?: Record<string, string>): string => pairOf(key, params).vi;

/** The cards share the look of the share cards (sky, Baloo 2, the logo), drawn for a portrait picture. */
function cardPage(look: Look, body: string): string {
  const ink = token(look.tokens, '--color-ink');
  const primary = token(look.tokens, '--color-primary');
  const shade = token(look.tokens, '--color-logo-shade');
  const css = `${look.css}
    html, body { width: ${CLIP_SIZE.width}px; height: ${CLIP_SIZE.height}px; }
    .clip-card { position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 56px; padding: 0 90px; text-align: center; color: ${ink};
      background: linear-gradient(180deg, ${token(look.tokens, '--color-sky-top')} 0%, ${token(look.tokens, '--color-sky-mid')} 55%, ${token(look.tokens, '--color-sky-bottom')} 100%); }
    .clip-card img.logo { width: 280px; height: 280px; border-radius: 22%; box-shadow: 0 10px 0 ${shade}; }
    .clip-card .wordmark { font-size: 96px; line-height: 1; color: ${primary}; text-shadow: 0 5px 0 #fff, 0 10px 0 ${shade}; }
    .clip-card .lesson { max-width: 900px; line-height: 1.08; text-wrap: balance; }
    .clip-card .line { font-size: 52px; line-height: 1.2; }
    .clip-card .soft { font-size: 44px; line-height: 1.25; color: ${token(look.tokens, '--color-ink-soft')}; }
    .clip-card .address { font-size: 46px; line-height: 1.3; word-break: break-all; color: ${token(look.tokens, '--color-primary-edge')}; background: rgba(255,255,255,0.7); border-radius: 36px; padding: 28px 40px; max-width: 900px; }
  `;
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><style>${look.fontFaces}${css}</style></head><body><div class="clip-card">${body}</div></body></html>`;
}

/** The opening: the lesson as printed, its subject and the book. */
export function titleCardHtml(look: Look, lesson: LessonPageData): string {
  const { label, name } = splitLessonTitle(lesson.title);
  // A long name steps down a size so it stays within five lines.
  const size = name.length > 46 ? 80 : name.length > 30 ? 96 : 116;
  return cardPage(
    look,
    `<img class="logo" src="${look.logo}" alt="">
     <span class="wordmark">Miu World</span>
     <div style="display:flex;flex-direction:column;gap:28px;align-items:center">
       ${label ? `<span class="pill" style="font-size:52px;padding:8px 36px">${escapeHtml(label)}</span>` : ''}
       <p class="lesson" style="font-size:${size}px">${escapeHtml(name)}</p>
     </div>
     <p class="line">${escapeHtml(text('shareCard.lessonLine', { subject: lesson.subject.name }))}</p>`,
  );
}

/** The closing: where to play the lesson. The address is the page's own, without campaign tags (the caption carries those). */
export function endCardHtml(look: Look, lesson: LessonPageData): string {
  const address = `${SITE_ORIGIN.replace(/^https?:\/\//, '')}${lessonPagePath(lesson.slug)}`;
  return cardPage(
    look,
    `<img class="logo" src="${look.logo}" alt="">
     <p class="line" style="font-size:64px">${escapeHtml(text('shareCard.playLine'))}</p>
     <p class="address">${escapeHtml(address)}</p>
     <p class="soft">${escapeHtml(text('shareCard.free'))}</p>`,
  );
}

const flat = (v: readonly number[]): string => v.join(',');

/** Opens the preview page on the lesson's quest at the start of the flight and waits until the world is drawn. */
async function openScene(page: Page, scene: ClipScene, start: CameraPose): Promise<void> {
  const query = new URLSearchParams({
    shot: `drive:${flat(start.eye)}:${flat(start.target)}:${start.fov}`,
    quality: 'high',
    region: scene.region,
    chapter: String(scene.chapter),
    quest: scene.questId,
    // The map round the centre that the flight reaches: the page loads nothing beyond it.
    view: String(Math.ceil(FLIGHT_REACH * 2.5)),
  });
  await page.goto(`${PREVIEW_ORIGIN}/preview.html?${query.toString()}`);
  await page.waitForFunction(() => document.body.dataset.ready === '1' || document.body.dataset.error !== undefined, null, { timeout: 180_000 });
  const failure = await page.evaluate(() => document.body.dataset.error);
  if (failure) throw new Error(`the preview page failed for ${scene.questId}: ${failure}`);
}

/** Moves the page's camera and waits two frames, so the picture taken next shows it. */
async function pose(page: Page, camera: CameraPose): Promise<void> {
  await page.evaluate(
    (c) => {
      (window as unknown as { __miuShotCamera: unknown }).__miuShotCamera = c;
      return new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    },
    { eye: [...camera.eye], target: [...camera.target], fov: camera.fov },
  );
}

async function filmFlight(browser: Browser, scene: ClipScene, plan: FlightPlan, dir: string): Promise<void> {
  const page = await browser.newPage({ viewport: CLIP_SIZE, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await openScene(page, scene, cameraAt(plan, 0));
    for (let i = 0; i < FLIGHT_FRAMES; i++) {
      await pose(page, cameraAt(plan, i / (FLIGHT_FRAMES - 1)));
      await page.locator('canvas').first().screenshot({ path: path.join(dir, `frame-${String(i + 1).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
    }
  } finally {
    await page.close();
  }
  if (errors.length > 0) throw new Error(`page errors while filming ${scene.questId}: ${errors.join('; ')}`);
}

export interface RenderedClip {
  file: string;
  lessonId: string;
  slug: string;
  /** The music track (Komiku, CC0), by file name without extension. */
  track: string;
}

/** Films one lesson into `CLIP_DIR`. Needs ffmpeg and the machine's Chromium; takes a minute or two. */
export async function renderLessonClip(lesson: LessonPageData, outDir: string = CLIP_DIR): Promise<RenderedClip> {
  assertFfmpeg();
  const scene = findClipScene(lesson.lessonId);
  // Anything the camera cannot see through: walls and roofs, and the leaves of a tree (not water).
  const opaque = await blockIds((b) => !b.liquid);
  const blockAt = mapBlocks(scene.map);
  const plan = await chooseFlight(scene.center, async (x, y, z) => opaque.has(await blockAt(x, y, z)));
  const work = path.join(WORK_DIR, lesson.slug);
  await rm(work, { recursive: true, force: true });
  await mkdir(path.join(work, 'flight'), { recursive: true });
  await mkdir(outDir, { recursive: true });
  const look = await loadLook();
  const server = await startPreviewServer();
  let browser: Browser | undefined;
  try {
    // The machine's GPU (new headless Chromium), as the E2E runs use: a software renderer takes minutes a clip.
    browser = await chromium.launch({ channel: 'chromium' });
    const tab = await browser.newPage({ viewport: CLIP_SIZE, deviceScaleFactor: 1 });
    await photograph(tab, titleCardHtml(look, lesson), path.join(work, 'title.png'), CLIP_SIZE);
    await photograph(tab, endCardHtml(look, lesson), path.join(work, 'end.png'), CLIP_SIZE);
    await tab.close();
    await filmFlight(browser, scene, plan, path.join(work, 'flight'));
  } finally {
    await browser?.close();
    await server.close();
  }
  const track = pickTrack(lesson.lessonId);
  const file = path.join(outDir, `${lesson.slug}.mp4`);
  encodeClip({ titleCard: path.join(work, 'title.png'), flightPattern: path.join(work, 'flight', 'frame-%05d.jpg'), endCard: path.join(work, 'end.png'), music: trackFile(track), output: file });
  await rm(work, { recursive: true, force: true });
  return { file, lessonId: lesson.lessonId, slug: lesson.slug, track };
}

/** The lesson page of an id (`toan2-t1-b07`) or a page slug; throws with the choices when there is none. */
export function findLesson(lessons: readonly LessonPageData[], key: string): LessonPageData {
  const lesson = lessons.find((l) => l.lessonId === key || l.slug === key);
  if (!lesson) throw new Error(`no lesson page for "${key}"; lesson ids look like ${lessons[0]?.lessonId ?? 'toan2-t1-b01'}`);
  return lesson;
}

async function main(): Promise<void> {
  const key = process.argv.slice(2).find((arg) => arg !== '--');
  if (!key) throw new Error('usage: pnpm marketing:clip -- <lesson id or page slug>');
  const lesson = findLesson(readLessonPageData(path.join(REPO_ROOT, 'content')), key);
  const clip = await renderLessonClip(lesson);
  console.log(`clip: ${path.relative(REPO_ROOT, clip.file)} (music: ${clip.track}; nothing was uploaded)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
