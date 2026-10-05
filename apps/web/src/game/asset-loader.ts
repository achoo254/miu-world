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

  private static kept: Promise<AssetRegistry> | null = null;

  /** The registry read once per page: every game after the first starts without fetching the manifest again. */
  static shared(): Promise<AssetRegistry> {
    if (!AssetRegistry.kept) {
      AssetRegistry.kept = AssetRegistry.load().catch((err: unknown) => {
        AssetRegistry.kept = null; // a failed read is tried again by the next game
        throw err;
      });
    }
    return AssetRegistry.kept;
  }

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

/**
 * Parsed models kept from one game to the next (going back to a map, a quest switched on the same map, the hub
 * and back): the next game clones them instead of fetching and parsing every file again. Each game starts a
 * round; a model neither this game nor the one before it asked for is let go, so the cache holds about two
 * maps' worth. Every user clones the shared scene (or only reads it), and a disposed game frees only the GPU
 * side of what it drew: the next renderer uploads the same geometry and textures again.
 */
export class ModelCache {
  private readonly entries = new Map<string, { pending: Promise<GLTF>; round: number }>();
  private round = 0;

  /** A new game begins: models last asked for two games ago or earlier are dropped. */
  nextRound(): void {
    this.round += 1;
    for (const [url, entry] of this.entries) if (entry.round < this.round - 1) this.entries.delete(url);
  }

  get(url: string): Promise<GLTF> | undefined {
    const entry = this.entries.get(url);
    if (entry) entry.round = this.round;
    return entry?.pending;
  }

  set(url: string, pending: Promise<GLTF>): void {
    this.entries.set(url, { pending, round: this.round });
  }

  delete(url: string): void {
    this.entries.delete(url);
  }

  get size(): number {
    return this.entries.size;
  }
}

/** The models the play screen's games share (the creator's preview keeps its own). */
export const GAME_MODELS = new ModelCache();

export class GuardedGltfLoader {
  private readonly loader: GLTFLoader;
  private asked = 0;
  private finished = 0;
  private listener: ((finished: number, asked: number) => void) | null = null;

  constructor(
    private readonly registry: AssetRegistry,
    private readonly cache: ModelCache = new ModelCache(),
  ) {
    this.loader = new GLTFLoader(registry.createLoadingManager());
  }

  /** Hears each load asked of this loader as it finishes (a model already parsed too): loads finished and asked so far. None: stop. */
  onProgress(listener: ((finished: number, asked: number) => void) | null): void {
    this.listener = listener;
  }

  /** Loads once per path; callers share the returned scene, so each model may be placed only once. */
  load(assetPath: string): Promise<GLTF> {
    const pending = this.parsed(assetPath);
    this.asked += 1;
    const tick = (): void => {
      this.finished += 1;
      this.listener?.(this.finished, this.asked);
    };
    void pending.then(tick, tick);
    return pending;
  }

  private parsed(assetPath: string): Promise<GLTF> {
    const url = this.registry.url(assetPath);
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loader.loadAsync(url).then(
        (gltf) => {
          normalizeKenneyMaterials(gltf.scene);
          return gltf;
        },
        (err: unknown) => {
          this.cache.delete(url); // let a later call retry instead of caching the failure
          throw err;
        },
      );
      this.cache.set(url, pending);
    }
    return pending;
  }
}
