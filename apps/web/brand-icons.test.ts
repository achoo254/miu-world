import { readFileSync } from 'node:fs';
import { formatGenerated, generateManifests, loadBrandConfig } from '@shared-next/brand/build';
import { primaryOrigin } from '@shared-next/brand/hosts';
import { describe, expect, it } from 'vitest';
import { BRAND_GENERATED_DIR, BRAND_REQUIRE, BRAND_ROOT, brandManifests, iconFor, rasterIcons, webManifestOptions } from './brand-icons';
import { brand } from './src/brand';

describe('brand.config.json', () => {
  it('passes the schema of @shared-next/brand, and the bundled module is the same file', () => {
    expect(loadBrandConfig(BRAND_ROOT, { require: BRAND_REQUIRE })).toEqual(brand);
    expect(brand.urlScheme).toBe(brand.appIds.ios);
  });

  it('serves the game from the primary tenant host', () => {
    expect(primaryOrigin(brand)).toBe('https://miu.hoandat.com');
  });
});

describe('generated manifests', () => {
  it('are the files on disk (run pnpm brand:gen after editing the brand)', () => {
    const manifests = generateManifests(brand, brandManifests(brand));
    expect(Object.keys(manifests)).toEqual(['web.webmanifest.json', 'capacitor.json']);
    for (const [name, content] of Object.entries(manifests)) {
      expect(readFileSync(new URL(name, BRAND_GENERATED_DIR), 'utf8'), name).toBe(formatGenerated(content));
    }
  });
});

describe('icons', () => {
  it('are logo files listed in the asset manifest (pnpm assets:logo, then pnpm assets:manifest)', () => {
    const manifest = JSON.parse(readFileSync(new URL('assets/manifest.json', BRAND_ROOT), 'utf8')) as { generated: Array<{ path: string }> };
    const listed = new Set(manifest.generated.map((entry) => entry.path));
    for (const icon of rasterIcons(brand)) expect(listed.has(icon.file), icon.file).toBe(true);
  });

  it('has one favicon, one Apple touch icon and a maskable manifest icon', () => {
    expect(iconFor(brand, 'favicon').size).toBe(32);
    expect(iconFor(brand, 'apple-touch').size).toBe(180);
    const { icons } = webManifestOptions(brand, (file) => `/x/${file}`);
    expect(icons.map((icon) => icon.purpose)).toEqual(['any', 'any', 'maskable']);
    expect(icons[0]?.src).toBe('/x/generated/brand/miu-logo-192.png');
  });
});
