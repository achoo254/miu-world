// Copied from chat-next/packages/brand @a5be0b4; keep in sync until shared package exists.
// Miu's icons are not drawn from SVGs here: `pnpm assets:logo` (tools/assets/render-brand-logo.ts) renders the
// logo PNGs into assets/generated/brand/ and lists them in assets/manifest.json; this file names the ones the web
// app serves. Paths are manifest paths (relative to assets/); the web build turns them into versioned URLs.
import type { BrandConfig } from './brand.ts';

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

/** Web manifest icon entries; `url` maps a manifest path to the address the page loads it from. */
export function manifestIcons(brand: BrandConfig, url: (file: string) => string): readonly Record<string, string>[] {
  return rasterIcons(brand)
    .filter((icon) => icon.purpose === 'any' || icon.purpose === 'maskable')
    .map((icon) => ({ src: url(icon.file), sizes: `${icon.size}x${icon.size}`, type: 'image/png', purpose: icon.purpose }));
}
