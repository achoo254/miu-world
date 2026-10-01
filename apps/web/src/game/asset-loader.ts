// Runtime guard: the game may only load files listed in assets/manifest.json (license-gated).
// Every URL that three.js loaders request passes through the LoadingManager URL modifier.
import { LoadingManager, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MANIFEST_VERSION, manifestVersions, versioned } from '../asset-versions';

export const ASSET_PREFIX = '/game-assets/';

interface ManifestJson {
  files: Array<{ path: string; sha256?: string }>;
  generated: Array<{ path: string; sha256?: string }>;
}

export class AssetNotInManifestError extends Error {
  constructor(url: string) {
    super(`asset not in manifest: ${url}`);
    this.name = 'AssetNotInManifestError';
  }
}

export class AssetRegistry {
  constructor(
    private readonly paths: ReadonlySet<string>,
    /** Only same-origin URLs under ASSET_PREFIX are loadable (no hotlinking). */
    private readonly origin: string,
    /** Path → content version for the URL (asset-versions.ts); a path without one gets a plain URL. */
    private readonly versions: ReadonlyMap<string, string> = new Map(),
  ) {}

  static async load(): Promise<AssetRegistry> {
    const res = await fetch(versioned(`${ASSET_PREFIX}manifest.json`, MANIFEST_VERSION));
    if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
    const manifest = (await res.json()) as ManifestJson;
    const entries = [...manifest.files, ...manifest.generated];
    return new AssetRegistry(new Set(entries.map((f) => f.path)), window.location.origin, manifestVersions(entries));
  }

  has(assetPath: string): boolean {
    return this.paths.has(assetPath);
  }

  /** Returns the served URL for a manifest path, throwing for anything undeclared. */
  url(assetPath: string): string {
    if (!this.paths.has(assetPath)) throw new AssetNotInManifestError(assetPath);
    return versioned(`${ASSET_PREFIX}${assetPath.split('/').map(encodeURIComponent).join('/')}`, this.versions.get(assetPath));
  }

  /** Validates an absolute/relative URL requested by a loader (e.g. a GLB's external texture). */
  checkUrl(url: string): string {
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    const parsed = new URL(url, this.origin);
    if (parsed.origin !== this.origin || !parsed.pathname.startsWith(ASSET_PREFIX)) {
      throw new AssetNotInManifestError(url);
    }
    const rel = decodeURIComponent(parsed.pathname.slice(ASSET_PREFIX.length));
    if (!this.paths.has(rel)) throw new AssetNotInManifestError(url);
    // A GLB's own texture is requested by its plain path: give it its version too.
    return parsed.search ? url : versioned(url, this.versions.get(rel));
  }

  createLoadingManager(): LoadingManager {
    const manager = new LoadingManager();
    manager.setURLModifier((url) => this.checkUrl(url));
    return manager;
  }
}

/**
 * Older Kenney glTFs omit metallicFactor, which glTF defaults to 1.0: without an environment map
 * those surfaces render black. None of the packs are meant to be metallic.
 */
export function normalizeKenneyMaterials(root: Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial && !material.metalnessMap) material.metalness = 0;
    }
  });
}

export class GuardedGltfLoader {
  private readonly loader: GLTFLoader;
  private readonly cache = new Map<string, Promise<GLTF>>();

  constructor(private readonly registry: AssetRegistry) {
    this.loader = new GLTFLoader(registry.createLoadingManager());
  }

  /** Loads once per path; callers share the returned scene, so each model may be placed only once. */
  load(assetPath: string): Promise<GLTF> {
    let pending = this.cache.get(assetPath);
    if (!pending) {
      pending = this.loader.loadAsync(this.registry.url(assetPath)).then(
        (gltf) => {
          normalizeKenneyMaterials(gltf.scene);
          return gltf;
        },
        (err: unknown) => {
          this.cache.delete(assetPath); // let a later call retry instead of caching the failure
          throw err;
        },
      );
      this.cache.set(assetPath, pending);
    }
    return pending;
  }
}
