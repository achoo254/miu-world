// Copied from chat-next/packages/brand @a5be0b4; keep in sync until shared package exists.
// Miu differs on purpose: the config is also imported as a module (below) so the browser bundle and the bundled
// server read it without the file system; colours are `theme`/`background` (no dark theme); icons are the
// rendered logo PNGs of `pnpm assets:logo`, not SVGs; no media/Mini App domains, dev origins or push sender.
import config from '../../../brand.config.json' with { type: 'json' };

/** brand.config.json, as described by brand.config.schema.json. */
export interface BrandConfig {
  readonly appName: string;
  readonly shortName: string;
  readonly description: string;
  readonly colors: {
    readonly theme: string;
    readonly background: string;
  };
  /** Path in assets/manifest.json (relative to assets/). */
  readonly icon: string;
  readonly iconMaskable: string;
  readonly appIds: {
    readonly ios: string;
    readonly android: string;
    readonly desktop: string;
  };
  readonly urlScheme: string;
  readonly primaryTenant: { readonly domain: string; readonly issuer: string };
  readonly hostTemplates: {
    readonly web: string;
  };
}

/**
 * The brand, bundled into whatever imports it (web UI, server bundle, Vite config). Validation needs Ajv, which
 * compiles schemas with `new Function` (blocked by the web CSP), so it runs where Node runs instead: the web build
 * (vite-app-icons.ts), `pnpm brand:gen` and the brand test, all through config.ts.
 */
export const brand: BrandConfig = config;
