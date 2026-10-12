/// <reference lib="dom" />
// Draws the banner pictures of the two channels the weekly clips go to: the YouTube channel banner (2560 × 1440) and the
// Facebook Page cover (1640 × 856), each from an HTML page of its own (the Miu logo, the island overview the Home screen
// shows, the Baloo 2 font pack, the colours of the UI tokens) photographed by headless Chromium, like
// render-share-cards.ts. The words and sizes come from `content/marketing/channels.json` and `tools/marketing/channels.ts`.
// Output: assets/generated/channel-kit/<name>.png. The profile picture of both channels is the app logo
// (assets/generated/brand/miu-logo-512.png). Run `pnpm assets:channel-kit` after the words change; the same input gives
// the same bytes on the same machine (run twice and compare the hashes).
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { CHANNEL_KIT_IMAGES, readChannelKit } from '../marketing/channels';
import { ASSETS_DIR } from './asset-lib';
import { writeManifest } from './build-manifest';
import { pairOf } from '../../apps/web/src/ui/i18n/i18n';
import { escapeHtml, loadLook, shoot, token, type Look } from './render-share-cards';

const { youtubeBanner, facebookCover } = CHANNEL_KIT_IMAGES;

/** What both pictures share: the sky, soft clouds, the name with the logo, the tagline and the two islands' overview. */
function styles(look: Look): string {
  const ink = token(look.tokens, '--color-ink');
  const primary = token(look.tokens, '--color-primary');
  const shade = token(look.tokens, '--color-logo-shade');
  return `
    .art { position: relative; overflow: hidden; background: linear-gradient(180deg, ${token(look.tokens, '--color-sky-top')} 0%, ${token(look.tokens, '--color-sky-mid')} 55%, ${token(look.tokens, '--color-sky-bottom')} 100%); }
    .cloud { position: absolute; border-radius: 999px; background: radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0)); }
    .islands { position: absolute; height: auto; filter: drop-shadow(0 24px 24px rgba(47, 96, 170, 0.25)); }
    .lockup { position: absolute; display: flex; align-items: center; color: ${ink}; }
    .lockup img { flex: none; border-radius: 22%; box-shadow: 0 8px 0 ${shade}; }
    .lockup .wordmark { white-space: nowrap; line-height: 0.95; color: ${primary}; text-shadow: 0 5px 0 #fff, 0 10px 0 ${shade}; }
    .lockup .tagline { line-height: 1.1; text-wrap: balance; }
    .lockup .free { color: ${token(look.tokens, '--color-primary-edge')}; }
  `;
}

const cloud = (x: number, y: number, w: number, h: number): string => `<div class="cloud" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`;
const island = (look: Look, x: number, y: number, width: number, mirrored: boolean): string =>
  `<img class="islands" src="${look.islands}" alt="" style="left:${x}px;top:${y}px;width:${width}px;${mirrored ? 'transform:scaleX(-1);' : ''}">`;

function document(look: Look, size: { width: number; height: number }, body: string): string {
  const css = `${look.css} html, body { width: ${size.width}px; height: ${size.height}px; } .art { width: ${size.width}px; height: ${size.height}px; } ${styles(look)}`;
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><style>${look.fontFaces}${css}</style></head><body><div class="art">${body}</div></body></html>`;
}

/** Name, logo and tagline centred in the banner's safe area; the islands stand to either side, where wide screens show them. */
function youtubeBannerPage(look: Look, name: string, tagline: string, free: string): string {
  const { width, height, safe } = youtubeBanner;
  const logo = 280;
  return document(
    look,
    youtubeBanner,
    `${cloud(120, 90, 900, 360)}${cloud(1500, 60, 1000, 380)}${cloud(900, 1040, 1200, 340)}
     ${island(look, -400, 470, 900, false)}${island(look, width - 500, 470, 900, true)}
     <div class="lockup" style="left:${(width - safe.width) / 2}px;top:${(height - safe.height) / 2}px;width:${safe.width}px;height:${safe.height}px;gap:48px;justify-content:center">
       <img src="${look.logo}" alt="" style="width:${logo}px;height:${logo}px">
       <div style="display:flex;flex-direction:column;gap:18px">
         <span class="wordmark" style="font-size:188px">${escapeHtml(name)}</span>
         <span class="tagline" style="font-size:58px">${escapeHtml(tagline)}</span>
         <span class="free" style="font-size:44px">${escapeHtml(free)}</span>
       </div>
     </div>`,
  );
}

/** Logo, name and tagline right of the profile picture's corner and inside the rows a computer shows; the islands behind on the right. */
function facebookCoverPage(look: Look, name: string, tagline: string, free: string): string {
  const { width } = facebookCover;
  return document(
    look,
    facebookCover,
    `${cloud(60, 40, 520, 220)}${cloud(900, 600, 760, 250)}
     ${island(look, width - 510, 180, 780, false)}
     <div class="lockup" style="left:410px;top:200px;width:740px;gap:34px">
       <img src="${look.logo}" alt="" style="width:190px;height:190px">
       <div style="display:flex;flex-direction:column;gap:12px">
         <span class="wordmark" style="font-size:128px;white-space:normal">${escapeHtml(name)}</span>
         <span class="tagline" style="font-size:44px;max-width:560px">${escapeHtml(tagline)}</span>
         <span class="free" style="font-size:34px">${escapeHtml(free)}</span>
       </div>
     </div>`,
  );
}

async function main(): Promise<void> {
  const kit = readChannelKit();
  const look = await loadLook();
  const free = pairOf('shareCard.free').vi;
  await rm(path.join(ASSETS_DIR, path.dirname(youtubeBanner.file)), { recursive: true, force: true });
  const browser = await chromium.launch();
  try {
    for (const [image, html] of [
      [youtubeBanner, youtubeBannerPage(look, kit.name, kit.tagline, free)],
      [facebookCover, facebookCoverPage(look, kit.name, kit.tagline, free)],
    ] as const) {
      const tab = await browser.newPage({ viewport: { width: image.width, height: image.height }, deviceScaleFactor: 1 });
      await shoot(tab, html, image.file, image);
      await tab.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`render-channel-kit: 2 images in ${path.relative(process.cwd(), path.join(ASSETS_DIR, path.dirname(youtubeBanner.file)))}`);
  await writeManifest();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
