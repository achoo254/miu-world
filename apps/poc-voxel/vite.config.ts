import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(APP_DIR, '../../assets');
export const ASSET_PREFIX = '/game-assets/';

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.bin': 'application/octet-stream',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};

let manifestCache: { mtimeMs: number; paths: string[] } | null = null;

/** Manifest paths, re-read only when manifest.json changes. */
async function manifestPaths(): Promise<string[]> {
  const { mtimeMs } = await stat(path.join(ASSETS_DIR, 'manifest.json'));
  if (manifestCache?.mtimeMs === mtimeMs) return manifestCache.paths;
  const manifest = JSON.parse(await readFile(path.join(ASSETS_DIR, 'manifest.json'), 'utf8')) as {
    files: Array<{ path: string }>;
    generated: Array<{ path: string }>;
  };
  const paths = ['manifest.json', ...manifest.files.map((f) => f.path), ...manifest.generated.map((f) => f.path)];
  manifestCache = { mtimeMs, paths };
  return paths;
}

/**
 * Serves repo `assets/` under /game-assets/ in dev/preview and copies ONLY manifest-listed files
 * into the build, so nothing outside the license gate can ship.
 */
function repoAssets(): Plugin {
  const middleware = async (url: string | undefined, res: import('node:http').ServerResponse, next: () => void): Promise<void> => {
    if (!url?.startsWith(ASSET_PREFIX)) return next();
    let rel: string;
    try {
      rel = decodeURIComponent(url.slice(ASSET_PREFIX.length).split('?')[0] ?? '');
    } catch {
      res.statusCode = 400; // malformed percent-encoding
      res.end('bad asset path');
      return;
    }
    const allowed = new Set(await manifestPaths());
    const file = path.resolve(ASSETS_DIR, rel);
    if (!allowed.has(rel) || !file.startsWith(ASSETS_DIR + path.sep)) {
      res.statusCode = 404;
      res.end('not in asset manifest');
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info) return next();
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(file)
      .on('error', () => {
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      })
      .pipe(res);
  };
  const handle = (req: { url?: string }, res: import('node:http').ServerResponse, next: () => void): void => {
    middleware(req.url, res, next).catch(() => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  };
  return {
    name: 'miu-repo-assets',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
    async writeBundle(options) {
      const outDir = options.dir ?? path.join(APP_DIR, 'dist');
      for (const rel of await manifestPaths()) {
        const target = path.join(outDir, ASSET_PREFIX, rel);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(ASSETS_DIR, rel), target);
      }
    },
  };
}

export default defineConfig({
  plugins: [repoAssets()],
  publicDir: false,
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
