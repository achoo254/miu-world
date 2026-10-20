// Copied from chat-next/packages/brand @a5be0b4; keep in sync until shared package exists.
// The web manifest keeps Miu's own fields (fullscreen game, any orientation, no `id`/`categories`), so the
// manifest browsers install is the one the game served before the brand config existed.
import type { BrandConfig } from './brand.ts';
import { manifestIcons } from './icons.ts';

/** Platform manifests derived from the brand; the web build and the native shells read these. */
export interface GeneratedManifests {
  readonly 'web.webmanifest.json': Record<string, unknown>;
  readonly 'capacitor.json': Record<string, unknown>;
  readonly 'tauri.json': Record<string, unknown>;
}

/**
 * `iconUrl` maps an icon's manifest path to the address it is served at; the web build passes its versioned
 * resolver, `pnpm brand:gen` leaves the paths as they are.
 */
export function generateManifests(brand: BrandConfig, iconUrl: (file: string) => string = (file) => file): GeneratedManifests {
  return {
    'web.webmanifest.json': {
      name: brand.appName,
      short_name: brand.shortName,
      description: brand.description,
      lang: 'vi',
      start_url: '/',
      scope: '/',
      display: 'fullscreen',
      orientation: 'any',
      theme_color: brand.colors.theme,
      background_color: brand.colors.background,
      icons: manifestIcons(brand, iconUrl),
    },
    'capacitor.json': {
      appId: brand.appIds.ios,
      appName: brand.appName,
      android: { applicationId: brand.appIds.android },
      urlScheme: brand.urlScheme,
      // No server.hostname: the WebView keeps its own localhost origin. Using the production host would make the
      // local server answer the app's API requests and pin one tenant into a binary that serves them all.
    },
    'tauri.json': {
      productName: brand.appName,
      identifier: brand.appIds.desktop,
      plugins: { 'deep-link': { desktop: { schemes: [brand.urlScheme] } } },
    },
  };
}

/** A generated file's text: two-space JSON with a final newline. */
export function manifestText(content: Record<string, unknown>): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}
