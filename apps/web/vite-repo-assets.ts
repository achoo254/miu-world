// Serves repo `assets/` under /game-assets/ (dev + preview) and copies into the build only the files
// the runtime actually loads. Anything outside the license-gated manifest is refused (404).
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';

export const ASSET_PREFIX = '/game-assets/';

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.bin': 'application/octet-stream',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};

/** Always shipped: whole generated groups the runtime/review pages read by path. */
const SHIPPED_PREFIXES = ['generated/atlas/', 'generated/world/', 'generated/characters/', 'generated/review/', 'generated/sounds/'];

interface ManifestJson {
  files: Array<{ path: string }>;
  generated: Array<{ path: string }>;
}

export function createManifestReader(assetsDir: string): () => Promise<string[]> {
  let cache: { mtimeMs: number; paths: string[] } | null = null;
  return async () => {
    const { mtimeMs } = await stat(path.join(assetsDir, 'manifest.json'));
    if (cache?.mtimeMs === mtimeMs) return cache.paths;
    const manifest = JSON.parse(await readFile(path.join(assetsDir, 'manifest.json'), 'utf8')) as ManifestJson;
    const paths = ['manifest.json', ...manifest.files.map((f) => f.path), ...manifest.generated.map((f) => f.path)];
    cache = { mtimeMs, paths };
    return paths;
  };
}

/** External URIs (textures, buffers) a GLB references, resolved to manifest paths. */
export async function glbDependencies(assetsDir: string, rel: string): Promise<string[]> {
  const bytes = await readFile(path.join(assetsDir, rel));
  if (bytes.readUInt32LE(0) !== 0x46546c67) return []; // not binary glTF
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as {
    images?: Array<{ uri?: string }>;
    buffers?: Array<{ uri?: string }>;
  };
  const uris = [...(json.images ?? []), ...(json.buffers ?? [])].map((x) => x.uri).filter((u): u is string => !!u && !u.startsWith('data:'));
  return uris.map((u) => path.posix.normalize(path.posix.join(path.posix.dirname(rel), decodeURIComponent(u))));
}

/**
 * The runtime set: manifest, generated groups, self-hosted fonts, the files the React UI shows
 * (`uiPaths`), and every model the maps place (plus the textures those models reference).
 * Everything else in the manifest stays out of `dist/`.
 */
export async function runtimeAssetPaths(assetsDir: string, manifestPaths: readonly string[], uiPaths: readonly string[] = []): Promise<string[]> {
  const allowed = new Set(manifestPaths);
  const wanted = new Set<string>(['manifest.json', ...uiPaths]);
  for (const p of manifestPaths) {
    if (SHIPPED_PREFIXES.some((prefix) => p.startsWith(prefix))) wanted.add(p);
    if (p.startsWith('packs/font-') && p.endsWith('.woff2')) wanted.add(p);
  }
  const models = new Set<string>();
  for (const p of manifestPaths.filter((x) => /^generated\/world\/[^/]+\/entities\.json$/.test(x))) {
    const entities = JSON.parse(await readFile(path.join(assetsDir, p), 'utf8')) as Record<string, unknown>;
    for (const list of Object.values(entities)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const model = (item as { model?: unknown }).model;
        if (typeof model === 'string') models.add(model);
      }
    }
  }
  for (const model of models) {
    wanted.add(model);
    for (const dep of await glbDependencies(assetsDir, model)) wanted.add(dep);
  }
  const missing = [...wanted].filter((p) => !allowed.has(p));
  if (missing.length > 0) throw new Error(`runtime assets missing from manifest: ${missing.join(', ')}`);
  return [...wanted].sort();
}

export function repoAssets(assetsDir: string, appDir: string, uiPaths: readonly string[] = []): Plugin {
  const manifestPaths = createManifestReader(assetsDir);
  const serve = async (url: string | undefined, res: ServerResponse, next: () => void): Promise<void> => {
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
    const file = path.resolve(assetsDir, rel);
    if (!allowed.has(rel) || !file.startsWith(assetsDir + path.sep)) {
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
  const handle = (req: { url?: string }, res: ServerResponse, next: () => void): void => {
    serve(req.url, res, next).catch(() => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  };
  return {
    name: 'miu-repo-assets',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    // Preview serves the BUILT files only, so a runtime asset missing from dist/ fails E2E instead of
    // being silently read from the repo; anything else under /game-assets/ is a 404.
    configurePreviewServer(server) {
      const assetsOut = path.resolve(server.config.root, server.config.build.outDir, ASSET_PREFIX.slice(1));
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(ASSET_PREFIX)) return next();
        let rel: string;
        try {
          rel = decodeURIComponent(req.url.slice(ASSET_PREFIX.length).split('?')[0] ?? '');
        } catch {
          res.statusCode = 400;
          res.end('bad asset path');
          return;
        }
        const file = path.resolve(assetsOut, rel);
        stat(file)
          .then((info) => {
            if (!file.startsWith(assetsOut + path.sep) || !info.isFile()) throw new Error('outside build');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            next();
          })
          .catch(() => {
            res.statusCode = 404;
            res.end('not in build');
          });
      });
    },
    async writeBundle(options) {
      const outDir = options.dir ?? path.join(appDir, 'dist');
      const shipped = await runtimeAssetPaths(assetsDir, await manifestPaths(), uiPaths);
      let bytes = 0;
      for (const rel of shipped) {
        const target = path.join(outDir, ASSET_PREFIX, rel);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(assetsDir, rel), target);
        bytes += (await stat(target)).size;
      }
      this.info(`copied ${shipped.length} runtime assets (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    },
  };
}
