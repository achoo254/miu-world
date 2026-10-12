// URLs of manifest assets for the pages the build writes: `/game-assets/<path>?v=<hash>`, the hash being the file's own
// in assets/manifest.json, so a changed file is fetched past the caches (src/asset-versions.ts). Used by the icon tags
// and the preview-card tags; the files themselves ship through repoAssets like any other runtime asset.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { manifestVersions, versioned } from './src/asset-versions.ts';
import { ASSET_PREFIX } from './vite-repo-assets.ts';

/** Public address of a manifest file; a file the manifest does not list is an error that says how to list it. */
export function assetUrlResolver(assetsDir: string): (file: string) => string {
  const manifest = JSON.parse(readFileSync(path.join(assetsDir, 'manifest.json'), 'utf8')) as {
    files: Array<{ path: string; sha256: string }>;
    generated: Array<{ path: string; sha256: string }>;
  };
  const versions = manifestVersions([...manifest.files, ...manifest.generated]);
  return (file) => {
    const version = versions.get(file);
    if (!version) throw new Error(`${file} is not in assets/manifest.json: generate it (pnpm assets:logo, pnpm assets:cards) and run pnpm assets:manifest`);
    return versioned(`${ASSET_PREFIX}${file}`, version);
  };
}
