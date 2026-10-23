// Renders the Miu World logo: Miu (the miu-cat player model in her own clothes, cheering) on the sky gradient of the
// UI tokens (`--color-sky-top` → `--color-sky-bottom`), full-bleed square so app stores and Google's consent screen
// can round or circle-crop it; she sits inside the inscribed circle. Rendered once at 1024 px (the App Store icon's
// size) and scaled down from there. Output in assets/generated/brand/: miu-logo-<size>.png for the iPhone/Android apps'
// store icon (1024), Google's OAuth consent screen (120), the favicon (32), the iPhone home screen (180) and the
// installed web app (192, 512); miu-logo-maskable-512.png with Miu inside the maskable safe zone (a circle of 40%
// radius) for the installed web app on Android; and for the Android app's adaptive icon, miu-logo-adaptive-1024.png
// (Miu inside the 66 dp circle of a 108 dp layer that every launcher shape keeps) with miu-logo-monochrome-1024.png,
// her white silhouette on transparent at the same place, for Android 13's themed icons. Re-run `pnpm assets:logo`;
// apps/web/vite-app-icons.ts links them into the pages, apps/mobile/scripts/native-icons.ts into the apps.
import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { ASSETS_DIR } from './asset-lib';
import { writeManifest } from './build-manifest';
import { readCharacterSpecs } from './kitbash-character';
import { renderShots } from './render-preview';

const OUT_DIR = path.join(ASSETS_DIR, 'generated/brand');
const MASTER = 1024;
/** Same values as --color-sky-top and --color-sky-bottom in apps/web/src/ui/tokens.css. */
const SKY_TOP: Rgb = [0x8f, 0xd0, 0xff];
const SKY_BOTTOM: Rgb = [0xff, 0xe1, 0xef];
/** Miu's height as a share of the logo; her box stays inside the inscribed circle. */
const FIGURE_HEIGHT = 0.8;
/** Smaller for the maskable icon: her box stays inside the 40%-radius safe zone Android may crop to. */
const MASKABLE_FIGURE_HEIGHT = 0.66;
/**
 * Smaller again for the Android app's adaptive icon: a launcher shows the middle 72 dp of the 108 dp layer and may cut
 * it to a 66 dp circle, so her box (taller than wide) stays inside a circle of 61% of the side.
 */
const ADAPTIVE_FIGURE_HEIGHT = 0.5;
type Look = 'logo' | 'silhouette';
const OUTPUTS: ReadonlyArray<{ file: string; size: number; figure: number; look: Look }> = [
  ...[1024, 512, 192, 180, 120, 32].map((size) => ({ file: `miu-logo-${size}.png`, size, figure: FIGURE_HEIGHT, look: 'logo' as const })),
  { file: 'miu-logo-maskable-512.png', size: 512, figure: MASKABLE_FIGURE_HEIGHT, look: 'logo' },
  { file: 'miu-logo-adaptive-1024.png', size: MASTER, figure: ADAPTIVE_FIGURE_HEIGHT, look: 'logo' },
  { file: 'miu-logo-monochrome-1024.png', size: MASTER, figure: ADAPTIVE_FIGURE_HEIGHT, look: 'silhouette' },
];
const PORTRAIT = 'miu-portrait.png';

type Rgb = [number, number, number];

async function renderPortrait(dir: string): Promise<PNG> {
  const miu = (await readCharacterSpecs())['miu-cat'];
  if (!miu) throw new Error('miu-cat spec missing');
  const acc = miu.clothes ?? '';
  await renderShots([
    {
      outDir: dir,
      label: 'render-brand-logo',
      shots: async () => [
        {
          file: PORTRAIT,
          query: { model: miu.output, ...(acc ? { acc } : {}), anim: 'cheer', t: 0.3, yaw: 25, pitch: 10, size: MASTER, bg: 'transparent' },
          transparent: true,
        },
      ],
    },
  ]);
  return PNG.sync.read(await readFile(path.join(dir, PORTRAIT)));
}

/** The smallest box holding every pixel that is not fully transparent. */
function opaqueBox(png: PNG): { x: number; y: number; w: number; h: number } {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error('portrait is empty');
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Area-averaged resample of a source box into a width × height picture, in premultiplied alpha so transparent
 * edges do not bleed dark fringes.
 */
function resample(src: PNG, box: { x: number; y: number; w: number; h: number }, width: number, height: number): PNG {
  const out = new PNG({ width, height });
  const sx = box.w / width;
  const sy = box.h / height;
  for (let y = 0; y < height; y++) {
    const y0 = box.y + y * sy;
    const y1 = y0 + sy;
    for (let x = 0; x < width; x++) {
      const x0 = box.x + x * sx;
      const x1 = x0 + sx;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        const wy = Math.min(y1, py + 1) - Math.max(y0, py);
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          const wx = Math.min(x1, px + 1) - Math.max(x0, px);
          const weight = wx * wy;
          const i = (py * src.width + px) * 4;
          const alpha = (src.data[i + 3] ?? 0) / 255;
          r += (src.data[i] ?? 0) * alpha * weight;
          g += (src.data[i + 1] ?? 0) * alpha * weight;
          b += (src.data[i + 2] ?? 0) * alpha * weight;
          a += alpha * weight;
          area += weight;
        }
      }
      const o = (y * width + x) * 4;
      out.data[o] = a > 0 ? Math.round(r / a) : 0;
      out.data[o + 1] = a > 0 ? Math.round(g / a) : 0;
      out.data[o + 2] = a > 0 ? Math.round(b / a) : 0;
      out.data[o + 3] = Math.round((a / area) * 255);
    }
  }
  return out;
}

/**
 * A `MASTER` square with Miu centred, `figure` her height as a share of the side: on the sky gradient, opaque (`logo`),
 * or as a white silhouette on transparent (`silhouette`, her own edge alpha kept).
 */
function compose(portrait: PNG, figure: number, look: Look): PNG {
  const logo = new PNG({ width: MASTER, height: MASTER });
  for (let y = 0; y < MASTER; y++) {
    const k = y / (MASTER - 1);
    const sky = look === 'logo' ? SKY_TOP.map((top, c) => Math.round(top + ((SKY_BOTTOM[c] ?? top) - top) * k)) : [255, 255, 255];
    for (let x = 0; x < MASTER; x++) {
      const o = (y * MASTER + x) * 4;
      logo.data[o] = sky[0] ?? 0;
      logo.data[o + 1] = sky[1] ?? 0;
      logo.data[o + 2] = sky[2] ?? 0;
      logo.data[o + 3] = look === 'logo' ? 255 : 0;
    }
  }
  const box = opaqueBox(portrait);
  const height = Math.round(MASTER * figure);
  const width = Math.round((box.w / box.h) * height);
  const miu = resample(portrait, box, width, height);
  const left = Math.round((MASTER - width) / 2);
  const top = Math.round((MASTER - height) / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const f = (y * width + x) * 4;
      const alpha = (miu.data[f + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const o = ((top + y) * MASTER + left + x) * 4;
      if (look === 'silhouette') {
        logo.data[o + 3] = miu.data[f + 3] ?? 0;
        continue;
      }
      for (let c = 0; c < 3; c++) {
        logo.data[o + c] = Math.round((miu.data[f + c] ?? 0) * alpha + (logo.data[o + c] ?? 0) * (1 - alpha));
      }
    }
  }
  return logo;
}

async function main(): Promise<void> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'miu-logo-'));
  try {
    const portrait = await renderPortrait(tmp);
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    for (const { file, size, figure, look } of OUTPUTS) {
      const logo = compose(portrait, figure, look);
      const png = size === MASTER ? logo : resample(logo, { x: 0, y: 0, w: MASTER, h: MASTER }, size, size);
      // The opaque logos are written without an alpha channel: the App Store refuses an icon that has one.
      await writeFile(path.join(OUT_DIR, file), PNG.sync.write(png, look === 'logo' ? { colorType: 2 } : {}));
    }
    console.log(`render-brand-logo: ${OUTPUTS.length} images in ${path.relative(process.cwd(), OUT_DIR)}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  await writeManifest();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
