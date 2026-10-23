/**
 * Draws the app icons and launch screens of the iOS and Android projects from the brand logo (rendered by
 * `pnpm assets:logo` into assets/generated/brand/, next to brand.config.json `icon`) and the brand background colour.
 * Nothing new is drawn: every picture the Capacitor templates ship (their own logo) is replaced, at the size the
 * template gives it, by the logo scaled down from its 1024 px master. Android's adaptive icon gets its own foreground
 * (Miu inside the launcher's safe circle) and a monochrome layer for themed icons; the legacy round icon is cut round.
 * Opaque pictures are written without an alpha channel (the App Store refuses an icon that has one). Run after
 * `cap add` or a new logo, then commit the PNGs:
 *
 *   pnpm --filter @miu/mobile icons
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const MOBILE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '../..');
/** The logo's share of the shorter side of a launch screen. */
const SPLASH_LOGO_SHARE = 0.32;

type Rgba = [number, number, number, number];

/** The 1024 px pictures tools/assets/render-brand-logo.ts writes beside the brand icon. */
const LOGO_MASTER = 'miu-logo-1024.png';
const ADAPTIVE_FOREGROUND = 'miu-logo-adaptive-1024.png';
const MONOCHROME = 'miu-logo-monochrome-1024.png';
/** Android's legacy launcher sizes (48 dp) per density; the adaptive layers are 108 dp. */
const DENSITY_SCALE: Record<string, number> = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const ADAPTIVE_DP = 108;

interface BrandConfig {
  icon: string;
  colors: { background: string };
}

function readBrand(): BrandConfig {
  const raw: unknown = JSON.parse(readFileSync(path.join(REPO_ROOT, 'brand.config.json'), 'utf8'));
  const brand = raw as Partial<BrandConfig>;
  if (typeof brand.icon !== 'string' || typeof brand.colors?.background !== 'string') {
    throw new Error('brand.config.json: icon and colors.background are required');
  }
  return { icon: brand.icon, colors: { background: brand.colors.background } };
}

function parseHex(hex: string): Rgba {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`brand colour is not #rrggbb: ${hex}`);
  return [parseInt(match[1] ?? '0', 16), parseInt(match[2] ?? '0', 16), parseInt(match[3] ?? '0', 16), 255];
}

const readPng = (file: string): PNG => PNG.sync.read(readFileSync(file));

function pixel(png: PNG, x: number, y: number): Rgba {
  const cx = Math.min(png.width - 1, Math.max(0, x));
  const cy = Math.min(png.height - 1, Math.max(0, y));
  const i = (cy * png.width + cx) * 4;
  return [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0, png.data[i + 3] ?? 0];
}

/** Halves an image (2 × 2 box average), for downscaling without aliasing. */
function halve(src: PNG): PNG {
  const out = new PNG({ width: Math.max(1, Math.floor(src.width / 2)), height: Math.max(1, Math.floor(src.height / 2)) });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const samples = [pixel(src, 2 * x, 2 * y), pixel(src, 2 * x + 1, 2 * y), pixel(src, 2 * x, 2 * y + 1), pixel(src, 2 * x + 1, 2 * y + 1)];
      const i = (y * out.width + x) * 4;
      for (let c = 0; c < 4; c++) out.data[i + c] = Math.round(samples.reduce((sum, s) => sum + (s[c] ?? 0), 0) / 4);
    }
  }
  return out;
}

/** Scales `src` to `size` × `size`: box halving down to under twice the target, then bilinear. */
function resize(src: PNG, size: number): PNG {
  let from = src;
  while (from.width >= size * 2) from = halve(from);
  const out = new PNG({ width: size, height: size });
  const scale = from.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = (x + 0.5) * scale - 0.5;
      const sy = (y + 0.5) * scale - 0.5;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const [a, b, c, d] = [pixel(from, x0, y0), pixel(from, x0 + 1, y0), pixel(from, x0, y0 + 1), pixel(from, x0 + 1, y0 + 1)];
      const i = (y * size + x) * 4;
      for (let k = 0; k < 4; k++) {
        const top = (a[k] ?? 0) * (1 - fx) + (b[k] ?? 0) * fx;
        const bottom = (c[k] ?? 0) * (1 - fx) + (d[k] ?? 0) * fx;
        out.data[i + k] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return out;
}

/** A `width` × `height` canvas of `background` with `logo` drawn over it at (left, top), alpha-blended, opaque. */
function compose(width: number, height: number, background: Rgba, logo: PNG, left: number, top: number): PNG {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = x >= left && x < left + logo.width && y >= top && y < top + logo.height;
      const over = inside ? pixel(logo, x - left, y - top) : ([0, 0, 0, 0] as Rgba);
      const alpha = (over[3] ?? 0) / 255;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.round((over[c] ?? 0) * alpha + (background[c] ?? 0) * (1 - alpha));
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** An icon of `size`: the logo full-bleed, flattened on the background (stores refuse transparent icons). */
const icon = (logo: PNG, size: number, background: Rgba): PNG => compose(size, size, background, resize(logo, size), 0, 0);

/** The picture cut to its inscribed circle: transparent outside, a one-pixel soft edge (the legacy round icon). */
function round(png: PNG): PNG {
  const out = new PNG({ width: png.width, height: png.height });
  png.data.copy(out.data);
  const r = png.width / 2;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const edge = Math.min(1, Math.max(0, r - Math.hypot(x + 0.5 - r, y + 0.5 - r)));
      const i = (y * png.width + x) * 4 + 3;
      out.data[i] = Math.round((out.data[i] ?? 0) * edge);
    }
  }
  return out;
}

/** A launch screen of the file's own size: the background with the logo in the middle. */
function splash(logo: PNG, width: number, height: number, background: Rgba): PNG {
  const size = Math.round(Math.min(width, height) * SPLASH_LOGO_SHARE);
  return compose(width, height, background, resize(logo, size), Math.round((width - size) / 2), Math.round((height - size) / 2));
}

function pngsUnder(dir: string, match: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pngsUnder(full, match);
    return name.endsWith('.png') && match(full) ? [full] : [];
  });
}

function main(): void {
  const brand = readBrand();
  const background = parseHex(brand.colors.background);
  const brandDir = path.join(REPO_ROOT, 'assets', path.dirname(brand.icon));
  const logo = readPng(path.join(brandDir, LOGO_MASTER));
  const foreground = readPng(path.join(brandDir, ADAPTIVE_FOREGROUND));
  const monochrome = readPng(path.join(brandDir, MONOCHROME));
  const written: string[] = [];
  const write = (file: string, png: PNG, opaque: boolean): void => {
    writeFileSync(file, PNG.sync.write(png, opaque ? { colorType: 2 } : {}));
    written.push(path.relative(MOBILE_DIR, file));
  };

  const ios = path.join(MOBILE_DIR, 'ios/App/App/Assets.xcassets');
  for (const file of pngsUnder(path.join(ios, 'AppIcon.appiconset'), () => true)) {
    const { width } = readPng(file);
    write(file, icon(logo, width, background), true);
  }
  for (const file of pngsUnder(path.join(ios, 'Splash.imageset'), () => true)) {
    const { width, height } = readPng(file);
    write(file, splash(logo, width, height, background), true);
  }

  const res = path.join(MOBILE_DIR, 'android/app/src/main/res');
  for (const [density, scale] of Object.entries(DENSITY_SCALE)) {
    const dir = path.join(res, `mipmap-${density}`);
    const legacy = Math.round(48 * scale);
    const layer = Math.round(ADAPTIVE_DP * scale);
    write(path.join(dir, 'ic_launcher.png'), icon(logo, legacy, background), true);
    write(path.join(dir, 'ic_launcher_round.png'), round(icon(logo, legacy, background)), false);
    // The adaptive icon's layers: Miu inside the circle every launcher shape keeps, and her silhouette for themed icons.
    write(path.join(dir, 'ic_launcher_foreground.png'), icon(foreground, layer, background), true);
    write(path.join(dir, 'ic_launcher_monochrome.png'), resize(monochrome, layer), false);
  }
  for (const file of pngsUnder(res, (f) => path.basename(f) === 'splash.png')) {
    const { width, height } = readPng(file);
    write(file, splash(logo, width, height, background), true);
  }

  // The adaptive icon's background layer is the brand background colour; the monochrome layer feeds themed icons.
  const colourFile = path.join(res, 'values/ic_launcher_background.xml');
  writeFileSync(colourFile, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${brand.colors.background.toUpperCase()}</color>\n</resources>\n`);
  written.push(path.relative(MOBILE_DIR, colourFile));
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const file = path.join(res, 'mipmap-anydpi-v26', name);
    writeFileSync(
      file,
      '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
        '    <background android:drawable="@color/ic_launcher_background"/>\n' +
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n' +
        '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n' +
        '</adaptive-icon>\n',
    );
    written.push(path.relative(MOBILE_DIR, file));
  }

  if (written.length < 3) throw new Error('no icon or launch screen found: run `cap add ios` and `cap add android` first');
  console.log(`wrote ${written.length} files:\n  ${written.join('\n  ')}`);
}

main();
