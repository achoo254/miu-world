// Miu's icons are not drawn from SVGs by @shared-next/brand: `pnpm assets:logo` (tools/assets/render-brand-logo.ts)
// renders the logo PNGs into assets/generated/brand/ and lists them in assets/manifest.json; this file names the ones
// the web app serves and the manifests built from them. Paths are manifest paths (relative to assets/); the web build
// turns them into versioned URLs, `pnpm brand:gen` writes them as they are.
import type { BrandConfig } from '@shared-next/brand';
import type { GenerateManifestsOptions, RequirableField, WebManifestOptions } from '@shared-next/brand/build';

/** Optional brand fields Miu needs: the browser-bar colour of the manifest and the Android id of capacitor.json. */
export const BRAND_REQUIRE = ['colors.theme', 'appIds.android'] as const satisfies readonly RequirableField[];

/** The repository root, where brand.config.json lives. */
export const BRAND_ROOT = new URL('../../', import.meta.url);
/** Where `pnpm brand:gen` writes the platform manifests. */
export const BRAND_GENERATED_DIR = new URL('./generated/', import.meta.url);

/** The logo files `pnpm assets:logo` writes. */
export const BRAND_ICON_DIR = 'generated/brand';

/** A logo PNG the web app serves, and what for. */
export interface RasterIcon {
  readonly file: string;
  readonly size: number;
  readonly purpose: 'favicon' | 'apple-touch' | 'any' | 'maskable';
}

/**
 * The favicon, the iPhone home-screen icon (iOS rounds it itself) and the installed web app's icons: rounded-safe
 * ("any") for browsers, full-bleed ("maskable") for launchers that crop to their own shape.
 */
export function rasterIcons(brand: BrandConfig): readonly RasterIcon[] {
  return [
    { file: `${BRAND_ICON_DIR}/miu-logo-32.png`, size: 32, purpose: 'favicon' },
    { file: `${BRAND_ICON_DIR}/miu-logo-180.png`, size: 180, purpose: 'apple-touch' },
    { file: `${BRAND_ICON_DIR}/miu-logo-192.png`, size: 192, purpose: 'any' },
    { file: brand.icon, size: 512, purpose: 'any' },
    { file: brand.iconMaskable, size: 512, purpose: 'maskable' },
  ];
}

/** The one icon of `purpose`; the list above has exactly one favicon and one Apple touch icon. */
export function iconFor(brand: BrandConfig, purpose: 'favicon' | 'apple-touch'): RasterIcon {
  const icon = rasterIcons(brand).find((candidate) => candidate.purpose === purpose);
  if (!icon) throw new Error(`brand: no ${purpose} icon`);
  return icon;
}

/**
 * The web manifest of the fullscreen game (any orientation, no `id`/`categories`): the manifest browsers install is
 * the one the game served before the brand config existed. `url` maps an icon's manifest path to its address.
 */
export function webManifestOptions(brand: BrandConfig, url: (file: string) => string): WebManifestOptions {
  return {
    lang: 'vi',
    display: 'fullscreen',
    orientation: 'any',
    themeColor: 'theme',
    icons: rasterIcons(brand)
      .filter((icon) => icon.purpose === 'any' || icon.purpose === 'maskable')
      .map((icon) => ({ src: url(icon.file), sizes: `${icon.size}x${icon.size}`, type: 'image/png', purpose: icon.purpose })),
  };
}

/** What `pnpm brand:gen` writes: the web manifest with the icons' manifest paths, and capacitor.json for the apps. */
export function brandManifests(brand: BrandConfig): GenerateManifestsOptions {
  return { web: webManifestOptions(brand, (file) => file), capacitor: true };
}
