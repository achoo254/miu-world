import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { repoAssets } from './vite-repo-assets.ts';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(APP_DIR, '../../assets');
const API_TARGET = 'http://127.0.0.1:8787';

/**
 * Same-origin only: no third-party hosts, no `unsafe-eval`. The API is proxied under /api so
 * `connect-src 'self'` covers it; blob:/data: are for the mesher worker and embedded glTF buffers.
 */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'";

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

export default defineConfig({
  plugins: [react(), contentSecurityPolicy(), repoAssets(ASSETS_DIR, APP_DIR)],
  publicDir: false,
  server: { proxy: apiProxy, allowedHosts: publicHosts },
  preview: { proxy: apiProxy, allowedHosts: publicHosts },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: path.join(APP_DIR, 'index.html'),
        preview: path.join(APP_DIR, 'preview.html'),
        review: path.join(APP_DIR, 'review.html'),
      },
    },
  },
});
