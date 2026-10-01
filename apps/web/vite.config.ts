import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { ACCESSORY_ART_DIR } from '../../packages/schema/src/accessory-art.ts';
import { VERSION_CHARS, manifestVersions } from './src/asset-versions.ts';
import { SOUND_PATHS } from './src/ui/sound/cues.ts';
import { UI_ART_PATHS } from './src/ui/kit/ui-art.ts';
import { repoAssets } from './vite-repo-assets.ts';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(APP_DIR, '../../assets');
const API_TARGET = 'http://127.0.0.1:8787';

/**
 * Same-origin only: no third-party hosts, no `unsafe-eval`. The API is proxied under /api so
 * `connect-src 'self'` covers it; blob:/data: are for the mesher worker and embedded glTF buffers.
 */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: data:; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'";

/**
 * Injects the CSP meta into built pages only. The dev server's React Fast Refresh preamble is an
 * inline script that `script-src 'self'` would block; E2E runs against the production build.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'miu-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
    ],
  };
}

/**
 * Content versions baked into the build (src/asset-versions.ts): the manifest's own, for the game and the
 * review page to fetch it fresh, and those of the files the React UI shows (icons, art, sounds).
 */
function assetVersionDefines(): Record<string, string> {
  const text = readFileSync(path.join(ASSETS_DIR, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(text) as { files: Array<{ path: string; sha256: string }>; generated: Array<{ path: string; sha256: string }> };
  const versions = manifestVersions([...manifest.files, ...manifest.generated]);
  // Item pictures are looked up by item id at runtime, so the whole folder is versioned.
  const itemArt = [...versions.keys()].filter((p) => p.startsWith(ACCESSORY_ART_DIR));
  const ui = Object.fromEntries([...UI_ART_PATHS, ...SOUND_PATHS, ...itemArt].flatMap((p) => (versions.has(p) ? [[p, versions.get(p)]] : [])));
  return {
    __MIU_MANIFEST_VERSION__: JSON.stringify(createHash('sha256').update(text).digest('hex').slice(0, VERSION_CHARS)),
    __MIU_UI_ASSET_VERSIONS__: JSON.stringify(ui),
  };
}

// xfwd: the server trusts X-Forwarded-For from loopback so rate limits see the real client IP.
const apiProxy = { '/api': { target: API_TARGET, changeOrigin: false, xfwd: true } };
/**
 * Extra Host names the dev/preview server accepts (e.g. a review tunnel), comma-separated in
 * MIU_PUBLIC_HOSTS. Vite rejects unknown hosts by default (DNS-rebinding protection); keep that.
 */
const publicHosts = (process.env.MIU_PUBLIC_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

/**
 * `vite build --mode release` (production): the game only. Every other build (E2E, local review,
 * staging) also carries the review page, the render tool page and the review material they show.
 */
export default defineConfig(({ mode }) => {
  const review = mode !== 'release';
  return {
    plugins: [react(), contentSecurityPolicy(), repoAssets(ASSETS_DIR, APP_DIR, UI_ART_PATHS, { review })],
    define: assetVersionDefines(),
    publicDir: false,
    server: { proxy: apiProxy, allowedHosts: publicHosts },
    preview: { proxy: apiProxy, allowedHosts: publicHosts },
    worker: { format: 'es' },
    build: {
      target: 'es2022',
      rollupOptions: {
        input: {
          index: path.join(APP_DIR, 'index.html'),
          ...(review ? { preview: path.join(APP_DIR, 'preview.html'), review: path.join(APP_DIR, 'review.html') } : {}),
        },
        output: {
          // Zod and its jitless setting share one chunk, so the setting is applied before any other chunk
          // runs a schema; otherwise Zod probes for eval and the CSP reports it.
          manualChunks: (id) => (id.includes('/node_modules/zod/') || id.endsWith('/src/zod-config.ts') ? 'zod' : undefined),
        },
      },
    },
  };
});
