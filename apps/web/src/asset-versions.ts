// Content versions in asset URLs. Files under /game-assets/ keep their path across releases while
// Cloudflare and the browser cache them for hours, so each URL carries the start of the file's sha256
// (`?v=…`, from assets/manifest.json): a release that changes a file changes its URL, and nobody keeps
// seeing the old copy. The build fills in the manifest's own version and the versions of the files the
// React UI shows (vite.config.ts); tests and pages built without them get plain URLs.
declare const __MIU_MANIFEST_VERSION__: string | undefined;
declare const __MIU_UI_ASSET_VERSIONS__: Readonly<Record<string, string>> | undefined;

/** Hex characters of a sha256 kept in a URL. */
export const VERSION_CHARS = 12;

export const MANIFEST_VERSION: string | undefined = typeof __MIU_MANIFEST_VERSION__ === 'string' ? __MIU_MANIFEST_VERSION__ : undefined;
export const UI_ASSET_VERSIONS: Readonly<Record<string, string>> = typeof __MIU_UI_ASSET_VERSIONS__ === 'object' && __MIU_UI_ASSET_VERSIONS__ ? __MIU_UI_ASSET_VERSIONS__ : {};

/** `url?v=version`, or `url` when the version is unknown. */
export function versioned(url: string, version: string | undefined): string {
  return version ? `${url}${url.includes('?') ? '&' : '?'}v=${version}` : url;
}

/** Path → URL version from manifest entries (`sha256` of each file). */
export function manifestVersions(entries: ReadonlyArray<{ path: string; sha256?: string }>): Map<string, string> {
  return new Map(entries.flatMap((e) => (e.sha256 ? [[e.path, e.sha256.slice(0, VERSION_CHARS)] as const] : [])));
}
