import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brand } from './brand.ts';
import { GENERATED_DIR, REPO_ROOT, loadBrandConfig, parseBrandConfig } from './config.ts';
import { generateManifests, manifestText } from './generate.ts';
import { hostsFor, primaryOrigin } from './hosts.ts';
import { iconFor, manifestIcons, rasterIcons } from './icons.ts';

describe('brand.config.json', () => {
  it('passes its schema, and the bundled module is the same file', () => {
    expect(loadBrandConfig()).toEqual(brand);
    expect(brand.urlScheme).toBe(brand.appIds.ios);
  });

  it('rejects an invalid bundle id, colour and unknown field, listing each', () => {
    expect(() =>
      parseBrandConfig({
        ...brand,
        appIds: { ...brand.appIds, ios: 'Not A Bundle' },
        colors: { ...brand.colors, theme: 'blue' },
        extra: true,
      }),
    ).toThrow(/appIds\/ios.*colors\/theme|colors\/theme.*appIds\/ios/s);
  });

  it('rejects a missing field and an icon outside the logo folder', () => {
    const { appName: _appName, ...nameless } = brand;
    expect(() => parseBrandConfig(nameless)).toThrow(/appName/);
    expect(() => parseBrandConfig({ ...brand, icon: '../secret.png' })).toThrow(/\/icon /);
  });
});

describe('hosts', () => {
  it('derives each tenant host from the template', () => {
    expect(hostsFor(brand, 'inetdev.io.vn').web).toBe('miu.inetdev.io.vn');
    expect(primaryOrigin(brand)).toBe('https://miu.hoandat.com');
  });
});

describe('manifests', () => {
  it('follow the brand, so renaming means editing brand.config.json only', () => {
    const renamed = generateManifests({ ...brand, appName: 'Renamed', shortName: 'Ren' });
    expect(renamed['web.webmanifest.json']).toMatchObject({ name: 'Renamed', short_name: 'Ren' });
    expect(renamed['capacitor.json']).toMatchObject({ appName: 'Renamed' });
    expect(renamed['tauri.json']).toMatchObject({ productName: 'Renamed' });
  });

  it('are the files on disk (run pnpm brand:gen after editing the brand)', () => {
    for (const [name, content] of Object.entries(generateManifests(brand))) {
      expect(readFileSync(new URL(name, GENERATED_DIR), 'utf8'), name).toBe(manifestText(content));
    }
  });

  it('keeps the Capacitor WebView on its own origin, not a tenant host', () => {
    expect(generateManifests(brand)['capacitor.json']).not.toHaveProperty('server');
  });
});

describe('icons', () => {
  it('are logo files listed in the asset manifest (pnpm assets:logo, then pnpm assets:manifest)', () => {
    const manifest = JSON.parse(readFileSync(new URL('assets/manifest.json', REPO_ROOT), 'utf8')) as { generated: Array<{ path: string }> };
    const listed = new Set(manifest.generated.map((entry) => entry.path));
    for (const icon of rasterIcons(brand)) expect(listed.has(icon.file), icon.file).toBe(true);
  });

  it('has one favicon, one Apple touch icon and a maskable manifest icon', () => {
    expect(iconFor(brand, 'favicon').size).toBe(32);
    expect(iconFor(brand, 'apple-touch').size).toBe(180);
    const icons = manifestIcons(brand, (file) => `/x/${file}`);
    expect(icons.map((icon) => icon.purpose)).toEqual(['any', 'any', 'maskable']);
    expect(icons[0]?.src).toBe('/x/generated/brand/miu-logo-192.png');
  });
});
