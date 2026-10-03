// Khu rừng bí mật (chapter 1): Miu, the quest's interactables (NPCs, clues, riddle tree, chest, gate)
// and props — only manifest assets.
// The game owns its canvas, loop and touch controls; it talks to React only through the
// game-bridge store (discrete events), never through React state.
import {
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { blockLookup, blockTraversal } from '@miu/voxel/block-table';
import type { Traversal } from '@miu/voxel/traversal';
import type { SolidAt } from '@miu/voxel/grid-collision';
import { castHidden, entitiesForChapter } from '@miu/voxel/world-entities';
import { PETS, UI_ICONS, assetUrl } from '../ui/kit/ui-art';
import type { GameStore } from '../game-bridge/game-store';
import { loadAmbientLife, type AmbientTarget } from './ambient/ambient-life';
import { createConfetti } from './scene/confetti';
import { createPortalSparks } from './scene/portal-sparks';
import type { PlayerPosition } from '@miu/schema/player-position';
import { RegionCatalog, WorldEventKind, mapForRegion } from '@miu/schema/region';
import regionsJson from '../../../../content/world/regions.json';
import { AssetRegistry, GuardedGltfLoader } from './asset-loader';
import { createReviewShot, parseViewShot } from './debug/review-shots';
import { StatsOverlay } from './debug/stats-overlay';
import { loadInteractables, namedForPlayer, pickNearest, type InteractableObject } from './entities/interactables';
import { createTargetArrow } from './entities/target-arrow';
import { createMinimap } from './hud/minimap';
import { minimapMarkers } from './hud/minimap-model';
import { fillPlayerName } from '@miu/quest/player-name';
import { HOME_REGION } from '../ui/region/regions';
import { DEFAULT_SPECIES } from './content/characters';
import { loadPlayerCharacter } from './entities/player-character';
import { loadPetCompanion } from './entities/pet-companion';
import { loadProps } from './entities/props';
import { cellKey } from '@miu/voxel/prop-collision';
import { createRouteFinder, type RouteFinder } from './nav/route-finder';
import { RouteWalker } from './nav/route-walker';
import { Autopilot } from './player/autopilot';
import { CameraRig } from './player/camera-rig';
import { PlayerInput } from './player/input';
import { PlayerController, WALK_SPEED, type MoveIntent } from './player/player-controller';
import { RescueWatch } from './player/rescue';
import { createRideControl } from './player/vehicle-ride';
import { nearestUsableSpot } from './player/saved-spot';
import { readQuality } from './quality';
import { disposeSceneGraph } from './scene/dispose-scene';
import { SKY_HORIZON, createSky, skyColours } from './scene/sky';
import { createWorldEvents } from './scene/world-events';
import { HORIZON_REACH } from './world/horizon-mesh';
import { loadWorldData } from './world/world-data';
import { createWorldRenderer } from './world/world-renderer';
import './game.css';



/** Boot steps reported as `loading-progress`: renderer, asset registry, map data, world mesh, models. */
const LOADING_STEPS = 5;
/** After the child drags the view, the camera keeps her angle this long before settling behind her again. */
const LOOK_HOLD_S = 1;
/**
 * Camera follow pace (owner, 02/10/2026: when turning sideways/around the camera holds still;
 * only when she actively runs does it turn to follow behind her; walking turns lazily).
 */
const FOLLOW_STRENGTH_RUN = 0.9;
const FOLLOW_STRENGTH_WALK = 0.2;
/** Turning the stick further than this (radians) takes a new walking direction from the view as it is now. */
const STICK_TURN = 0.45;

export interface GameOptions {
  store: GameStore;
  /** Query string with dev/review switches: quality, stats, autopilot, spawnAt (`npc`, a target id, `x,y,z`, or `spawn` for the map's spawn point), face (camera yaw in degrees), shot, outfit, life (`0`: no villagers or animals), decor (`slot:option,…`: the home in other styles), minimap (`1`: kept in review shots). */
  search: string;
  /** Equipped accessory ids (`id` or `id:variant`), normally from `GET /api/character`. */
  outfit: string[];
  /** Species of the child's character (`content/species.json`); the default cat when absent. */
  species?: string;
  /** Chapter of the quest being played: the map's entities tagged with another chapter are left out. */
  chapter?: number;
  /** Region of the quest being played, which picks the map. */
  region?: string;
  /** Quest being played: things only another quest uses stay out of the world. */
  quest?: string;
  /** The child's character name, which villagers use when they greet her. */
  playerName?: string;
  /** Pet id (`content/pets.json`) that trots after the character, or none. */
  pet?: string | null;
  /** Where the child last stood on this map (`GET /api/player-positions`); the spawn point when absent or no longer open ground. */
  savedSpot?: Pick<PlayerPosition, 'position' | 'facing'> | null;
  /** The child's picks for her home (`GET /api/home-decor`): the map's restyled pieces as she chose them. */
  decor?: Readonly<Record<string, string>>;
}

/** Bytes downloaded so far (compressed transfer size, falling back to body size for cache hits). */
function downloadedBytes(): number {
  return performance
    .getEntriesByType('resource')
    .concat(performance.getEntriesByType('navigation'))
    .reduce((sum, e) => sum + ((e as PerformanceResourceTiming).transferSize || (e as PerformanceResourceTiming).encodedBodySize || 0), 0);
}

function div(className: string, id?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  if (id) el.id = id;
  return el;
}

/** The HUD the game drives itself (per-frame input and stats); React UI lives outside this element. */
function buildDom(host: HTMLElement) {
  const root = div('miu-game');
  root.dataset.id = 'game';
  const stats = div('stats', 'stats');
  const joystick = div('joystick', 'joystick');
  joystick.setAttribute('aria-label', 'Joystick di chuyển');
  joystick.append(div('knob'));
  const actions = div('actions', 'actions');
  const button = (id: string, text: string, icon: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.dataset.id = `game-${id}`;
    b.setAttribute('aria-label', text);
    const img = document.createElement('img');
    img.src = assetUrl(icon);
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('span');
    label.textContent = text;
    b.append(img, label);
    return b;
  };
  const run = button('btn-run', 'Chạy', UI_ICONS.runningShoe);
  const jump = button('btn-jump', 'Nhảy', UI_ICONS.kangaroo);
  actions.append(run, jump);
  root.append(stats, joystick, actions);
  host.append(root);
  return { root, stats, joystick, run, jump };
}

const REGION_CATALOG = RegionCatalog.parse(regionsJson);

/**
 * Dev/review switch `decor=slot:option,…`: the child's home in other styles without a saved pick (the review
 * page's shots of the decorating). Undefined when absent.
 */
export function decorFromSearch(params: URLSearchParams): Record<string, string> | undefined {
  const raw = params.get('decor');
  if (!raw) return undefined;
  const picks = raw.split(',').map((pair) => pair.split(':'));
  return Object.fromEntries(picks.filter((p): p is [string, string] => p.length === 2 && /^[a-z0-9-]+$/.test(p[0] ?? '') && /^[a-z0-9-]+$/.test(p[1] ?? '')));
}

/** The surprises a region plays (content/world/regions.json `events`); none for a region without any. */
function regionEvents(region: string | undefined): readonly WorldEventKind[] {
  return REGION_CATALOG.regions.find((r) => r.id === region)?.events ?? [];
}

export class Game {
  private disposed = false;
  private started = false;
  /** Set by `stop()`; the loop only runs while this is false (also when boot finishes mid-pause). */
  private paused = false;
  private contextLost = false;
  private readonly cleanups: Array<() => void> = [];
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private loop: (() => void) | null = null;
  private timer: Timer | null = null;
  private input: PlayerInput | null = null;
  private spotNow: (() => PlayerPosition | null) | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: GameOptions,
  ) {}

  /** Idempotent: a second call (React StrictMode re-mount) is ignored. */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;
    try {
      await this.boot();
    } catch (err) {
      if (this.disposed) return; // torn down mid-load: not an error
      console.error(err);
      this.options.store.emit({ type: 'error', code: 'load-failed', message: err instanceof Error ? err.message : String(err) });
    }
  }

  /** Pauses rendering while a full-screen screen (Pause, Backpack, challenge) covers the game (Master Plan §12). */
  stop(): void {
    this.paused = true;
    this.renderer?.setAnimationLoop(null);
    this.input?.clear();
  }

  /** Restarts rendering after `stop()`. No-op before the first frame is ready, after dispose, or once the context is lost. */
  resume(): void {
    this.paused = false;
    this.runLoop();
  }

  /** Where the child stands now, to save for the next visit; null before the map is up and in dev runs (autopilot, review shots, `spawnAt`). */
  currentSpot(): PlayerPosition | null {
    return this.spotNow?.() ?? null;
  }

  private runLoop(): void {
    if (this.paused || this.disposed || this.contextLost || !this.renderer || !this.loop) return;
    // The paused time must not reach the next frame as one long step, nor presses made meanwhile.
    this.timer?.reset();
    this.input?.clear();
    this.renderer.setAnimationLoop(this.loop);
  }

  /** Frees GPU memory (geometry, materials, textures, context), listeners and DOM. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer?.setAnimationLoop(null);
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    if (this.scene) disposeSceneGraph(this.scene);
    this.scene = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }

  private async boot(): Promise<void> {
    const { store, search } = this.options;
    let loadingDone = 0;
    const stepLoaded = (): void => store.emit({ type: 'loading-progress', done: ++loadingDone, total: LOADING_STEPS });
    store.emit({ type: 'loading' });
    store.emit({ type: 'loading-progress', done: 0, total: LOADING_STEPS });
    const params = new URLSearchParams(search);
    const quality = readQuality(search);
    const dom = buildDom(this.host);
    this.cleanups.push(() => dom.root.remove());
    const overlay = new StatsOverlay(dom.stats, quality.level);
    // The FPS / draw-call panel is for developers; children see the HUD in its place.
    dom.stats.hidden = !params.has('stats');
    this.cleanups.push(() => overlay.detach());

    // Only the Home island shot needs an alpha canvas (see review-shots.ts `backdrop`).
    const renderer = new WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance', alpha: params.get('shot') === 'island' });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = PCFShadowMap;
    dom.root.prepend(renderer.domElement);
    // iPad Safari drops the context under memory pressure. The scene cannot be rebuilt in place, so the
    // game stops and React offers a reload. dispose() forces a context loss too: that one is not an error.
    const onContextLost = (event: Event): void => {
      if (this.disposed) return;
      event.preventDefault();
      this.contextLost = true;
      renderer.setAnimationLoop(null);
      store.emit({ type: 'error', code: 'context-lost', message: 'WebGL context lost' });
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    this.cleanups.push(() => renderer.domElement.removeEventListener('webglcontextlost', onContextLost));
    stepLoaded();

    const scene = new Scene();
    this.scene = scene;
    // Fog starts late so distant trees keep their colour instead of washing out to white.
    const fog = new Fog(SKY_HORIZON, quality.viewDistance * 0.75, quality.viewDistance);
    scene.fog = fog;
    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, quality.viewDistance + 40);
    const sky = createSky(quality.viewDistance + 20);
    scene.add(sky);
    const hemisphere = new HemisphereLight('#ffffff', '#8fa37a', 1.9);
    scene.add(hemisphere);
    const sun = new DirectionalLight('#fff6e0', 1.7);
    sun.castShadow = quality.shadows;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
    scene.add(sun, sun.target);

    const registry = await AssetRegistry.load();
    stepLoaded();
    const loader = new GuardedGltfLoader(registry);
    const mapId = mapForRegion(REGION_CATALOG, this.options.region ?? '');
    // A still picture of the whole core (a review shot without `view=`) needs no outer land round it.
    const wholeCoreShot = params.has('shot') && !(Number(params.get('view')) > 0);
    const data = await loadWorldData(registry, mapId, { withOutland: !wholeCoreShot, decor: this.options.decor ?? decorFromSearch(params) });
    this.cleanups.push(() => data.regions.dispose());
    if (this.disposed) return;
    stepLoaded();
    const world = await createWorldRenderer(data, { sky: SKY_HORIZON, horizon: quality.horizon });
    if (this.disposed) return;
    world.setViewDistance(quality.viewDistance);
    world.group.userData.receiveShadow = quality.shadows;
    scene.add(world.group);
    this.cleanups.push(() => world.dispose());
    // The horizon reaches across the whole map: the camera sees that far, the sky dome stands beyond it.
    const [sx, , sz] = data.entities.size;
    if (quality.horizon) {
      // As far as the horizon is drawn: across the core, or out over the land round it until it is all sky.
      camera.far = Math.max(camera.far, (data.outland ? HORIZON_REACH : Math.hypot(sx, sz)) + 40);
      camera.updateProjectionMatrix();
      sky.scale.setScalar(camera.far / (quality.viewDistance + 20) * 0.95);
    }

    const blocks = blockLookup(data.atlas.blocks);
    // Collision by traversal (traversal.ts): blocks by their kind, and the cells the solid props fill (tables,
    // crates, fences, statues; plants and rugs fill none), set once the props are in.
    let propCells: ReadonlyMap<string, Traversal> = new Map();
    const solid: SolidAt = (x, y, z) => {
      if (y < 0 || !data.world.contains(x, z)) return true; // invisible walls at the world's edge
      // A region still on its way is a wall too: the child never walks off into blocks not there yet.
      if (!data.regions.loadedAt(x, z)) return true;
      return (blocks(data.world.get(x, y, z))?.solid ?? false) || propCells.has(cellKey(x, y, z));
    };
    /** Solid cells never stepped or climbed onto by walking: fences, doors, railings, panes. */
    const blocking: SolidAt = (x, y, z) => {
      const block = blocks(data.world.get(x, y, z));
      return (block !== undefined && blockTraversal(block) === 'blocking') || propCells.get(cellKey(x, y, z)) === 'blocking';
    };

    const chapterEntities = entitiesForChapter(data.entities, this.options.chapter ?? 1, this.options.quest);
    const entities = { ...chapterEntities, interactables: namedForPlayer(chapterEntities.interactables, this.options.playerName ?? 'bạn') };
    // Where the child starts (a URL spot, next to a target, where she left off, else the spawn): its
    // regions and the patches in view are loaded and drawn before the first frame.
    const spawnAtParam = params.get('spawnAt');
    const start =
      spawnAtParam?.split(',').map(Number).filter(Number.isFinite).length === 3
        ? spawnAtParam.split(',').map(Number)
        : (entities.interactables.find((t) => (spawnAtParam === 'npc' ? t.kind === 'npc' : t.id === spawnAtParam))?.position ??
          (spawnAtParam === null ? this.options.savedSpot?.position : undefined) ??
          entities.spawn.position);
    await world.settle(start[0] ?? 0, start[2] ?? 0);
    if (this.disposed) return;
    stepLoaded();
    const outfitParam = params.get('outfit');
    const outfit = outfitParam === 'none' ? [] : outfitParam ? outfitParam.split(',') : this.options.outfit;
    /** Where a walker stands over a column: the first open cell with ground under it, searched near its height. */
    const ground = (x: number, z: number, nearY: number): number => {
      const bx = Math.floor(x);
      const bz = Math.floor(z);
      for (let y = Math.floor(nearY) + 2; y >= Math.floor(nearY) - 4; y--) {
        if (solid(bx, y - 1, bz) && !solid(bx, y, bz) && !solid(bx, y + 1, bz)) return y;
      }
      return nearY;
    };
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const shotView = parseViewShot(params.get('shot') ?? '');
    const lifeStart: [number, number] = shotView ? [shotView.target.x, shotView.target.z] : [start[0] ?? 0, start[2] ?? 0];
    const [character, targets, props, life] = await Promise.all([
      loadPlayerCharacter(loader, this.options.species ?? DEFAULT_SPECIES, outfit),
      loadInteractables(loader, entities, quality.shadows),
      // Nothing fades for standing between the camera and the child (owner, 02/10/2026): the camera comes in
      // front of walls and roofs instead (camera-rig.ts), plants simply show.
      loadProps(loader, entities, quality.shadows),
      // `?life=0` (dev/perf switch): the map without its villagers and animals.
      loadAmbientLife(loader, params.get('life') === '0' ? [] : (entities.ambients ?? []), {
        quality: quality.level,
        shadows: quality.shadows,
        reduced: reducedMotion,
        playerName: this.options.playerName ?? 'bạn',
        ground,
        // A review shot of a far view (the mock frames) gets the people round what it looks at ready
        // before its first frame, as the child's start does in play.
        start: lifeStart,
      }),
    ]);
    if (this.disposed) return;
    propCells = props.blocked;
    stepLoaded();
    const confetti = createConfetti();
    // The portals' sparks swirl and drift out (fewer on the low quality, still for less motion).
    const portalSparks = createPortalSparks(entities.props, { perPortal: quality.level === 'low' ? 12 : 28, still: reducedMotion });
    scene.add(portalSparks.mesh);
    this.cleanups.push(() => portalSparks.dispose());
    overlay.stats.portals = portalSparks.portals;
    const lookAhead = new Vector3();
    const petSpec = PETS.find((p) => p.id === this.options.pet);
    const pet = petSpec ? await loadPetCompanion(loader, petSpec, quality.shadows) : null;
    if (this.disposed) return;
    if (pet) scene.add(pet.root);
    overlay.stats.pet = petSpec?.id ?? null;
    // Surprises this region plays now and then (none in review shots, which must be the same every run).
    const surprise = WorldEventKind.safeParse(params.get('event'));
    const events = createWorldEvents(params.get('shot') ? [] : regionEvents(this.options.region), {
      scene,
      skyColours: skyColours(sky),
      fog,
      hemisphere,
      sun,
      life,
      reduced: reducedMotion,
      lite: quality.level === 'low',
      ahead: () => {
        camera.getWorldDirection(lookAhead);
        const flat = Math.hypot(lookAhead.x, lookAhead.z) || 1;
        return { x: lookAhead.x / flat, z: lookAhead.z / flat };
      },
      places: entities.moods ?? [],
    });
    const heldMood = params.get('mood');
    if (heldMood === 'dusk' || heldMood === 'night' || heldMood === 'cave') events.holdMood(heldMood);
    props.setViewDistance(quality.viewDistance);
    props.buildAround(start[0] ?? 0, start[2] ?? 0);
    this.cleanups.push(() => props.dispose());
    scene.add(character.root, props.group, life.group, confetti.mesh, ...targets.map((t) => t.root));
    // The minimap (top right, under the menu): the map from above, its gates, the child's home on her map.
    const playerName = this.options.playerName ?? 'bạn';
    const regionName = (id: string): string | undefined => {
      const name = REGION_CATALOG.regions.find((r) => r.id === id)?.name;
      return name === undefined ? undefined : fillPlayerName(name, playerName);
    };
    const minimap = createMinimap(dom.root, {
      atlas: data.atlas,
      atlasImage: (data.atlasTexture.image as CanvasImageSource | null) ?? null,
      horizon: data.horizon,
      size: [data.entities.size[0], data.entities.size[2]],
      markers: minimapMarkers(entities, { regionName, homeName: mapId === mapForRegion(REGION_CATALOG, HOME_REGION) ? regionName(HOME_REGION) : undefined }),
      lite: quality.level === 'low',
    });
    this.cleanups.push(() => minimap.dispose());
    overlay.stats.outfit = character.outfit;

    const liquid = (x: number, y: number, z: number): boolean => blocks(data.world.get(x, y, z))?.liquid ?? false;
    const controller = new PlayerController(solid, entities.spawn.position, entities.spawn.yaw, liquid, blocking);
    const rescue = new RescueWatch();
    // The equipped vehicle: the HUD's "Lái xe" puts her on it.
    const ride = createRideControl({ store, outfit, root: character.root, rider: controller, castShadow: quality.shadows, reduced: reducedMotion });
    this.cleanups.push(() => ride.dispose());
    // Dev/E2E switch: start next to a target (`npc` = the first NPC), or at `x,y,z`, instead of the spawn point.
    const spawnAt = spawnAtParam;
    const spawnTarget = entities.interactables.find((t) => (spawnAt === 'npc' ? t.kind === 'npc' : t.id === spawnAt));
    const spawnPoint = spawnAt?.split(',').map(Number) ?? [];
    if (spawnPoint.length === 3 && spawnPoint.every(Number.isFinite)) {
      controller.position.set(spawnPoint[0] ?? 0, spawnPoint[1] ?? 0, spawnPoint[2] ?? 0);
    } else if (spawnTarget) {
      // Beside the target, on the side where it is the nearest thing to tap (a lesson's place may hold a
      // cluster of targets a couple of blocks apart).
      const [x = 0, y = 0, z = 0] = spawnTarget.position;
      const offset = Math.min(1.5, spawnTarget.radius * 0.5);
      const others = entities.interactables.filter((t) => t !== spawnTarget);
      const nearestIsTarget = (px: number, pz: number): boolean =>
        others.every((t) => Math.hypot((t.position[0] ?? 0) - px, (t.position[2] ?? 0) - pz) > Math.hypot(x - px, z - pz));
      const sides = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [-1.4, 0], [1.4, 0], [0, 1.4]] as const;
      const [dx, dz] = sides.find(([sx, sz]) => nearestIsTarget(x + sx * offset, z + sz * offset)) ?? sides[0];
      controller.position.set(x + dx * offset, y, z + dz * offset);
    } else if (spawnAt === null && this.options.savedSpot) {
      // Back where the child left off; any `spawnAt` (even `spawn`) starts where the URL says instead.
      const at = nearestUsableSpot(this.options.savedSpot.position, solid, liquid, data.bounds, data.world.height);
      if (at) {
        controller.teleport(at);
        controller.facing = this.options.savedSpot.facing;
      }
    }
    const rig = new CameraRig(camera, solid, controller.facing + Math.PI);
    // Dev/review switch: `face=<degrees>` turns the camera to look that way at the start (a `play` shot).
    const face = Number(params.get('face') ?? Number.NaN);
    if (Number.isFinite(face)) rig.yaw = (face * Math.PI) / 180;
    const input = new PlayerInput(dom.root, dom.joystick, dom.run, dom.jump);
    this.input = input;
    this.cleanups.push(() => input.dispose());
    const autopilot = params.get('autopilot') === '1' ? new Autopilot(entities) : null;
    // Autopilot, review shots and URL-placed starts are dev runs: where they end up is nobody's place to come back to.
    if (!autopilot && !params.has('shot') && spawnAt === null) {
      this.spotNow = () => {
        const p = controller.position;
        const here = controller.onGround && !controller.inWater ? ([p.x, p.y, p.z] as const) : rescue.spot();
        // The heading winds up past ±π as the child turns; saved folded back into one turn.
        const facing = Math.atan2(Math.sin(controller.facing), Math.cos(controller.facing));
        return here ? { map: mapId, position: [here[0], here[1], here[2]], facing } : null;
      };
      this.cleanups.push(() => (this.spotNow = null));
    }

    const onResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));

    const reviewShot = createReviewShot(params.get('shot'), entities, scene, solid, controller.position);
    if (reviewShot) {
      // Still pictures show the whole map; a live shot frames one character and keeps the frame's budget.
      // Still pictures show the whole map, or (`view=<blocks>`, close views of a wide map) the part round what
      // they look at; a live shot keeps the frame's budget.
      const stillView = Number(params.get('view'));
      const shotView = reviewShot.live ? quality.viewDistance : stillView > 0 ? stillView : Infinity;
      world.setViewDistance(shotView);
      props.setViewDistance(shotView);
      if (!reviewShot.live) {
        await world.settle(reviewShot.target.x, reviewShot.target.z);
        props.buildAround(reviewShot.target.x, reviewShot.target.z);
      }
      if (this.disposed) return;
      // The sky dome stands beyond the furthest block the shot can see, inside the camera's far plane (a dome
      // past it is cut away and the clear colour shows through).
      reviewShot.apply(camera);
      sky.scale.setScalar((camera.far * 0.95) / (quality.viewDistance + 20));
      // `minimap=1` (review switch): the minimap stays in the picture.
      for (const el of [dom.stats, dom.joystick, dom.run.parentElement, ...(params.get('minimap') === '1' ? [] : [minimap.root])]) if (el) el.hidden = true;
      if (reviewShot.backdrop) {
        sky.visible = false;
        character.root.visible = false;
        renderer.setClearColor(0x000000, 0);
      }
    }

    // Interaction prompt: React renders the label; the game reports which target is near (discrete)
    // and moves the anchor React registered (per frame, no React render).
    let promptTarget: InteractableObject | null = null;
    /** A villager or animal in reach when no quest target is: the child may chat with it or pet it. */
    let promptAmbient: AmbientTarget | null = null;
    let interactRequested = false;
    let rescueRequested = false;
    let celebrateRequested = false;
    /** A ride's far stop is loading: the child is set down there once it is drawn. */
    let riding = false;
    const byId = new Map(targets.map((t) => [t.def.id, t]));
    const arrow = createTargetArrow();
    scene.add(arrow.root);
    let hint: InteractableObject | null = null;
    // A character met at several places of the story stands at one of them: where the steps last pointed.
    const pointedAt: string[] = spawnTarget ? [spawnTarget.id] : [];
    const placeCast = (): void => {
      const hidden = castHidden(entities.interactables, pointedAt);
      for (const target of targets) target.setPresent(!hidden.has(target.def.id));
      overlay.stats.castHidden = [...hidden].sort();
    };
    placeCast();
    // Tapping the quest card walks Miu to the hinted target along the ways. The route worker starts on the
    // first walk: most visits never ask for one.
    let routes: RouteFinder | null = null;
    this.cleanups.push(() => routes?.dispose());
    const walker = new RouteWalker(
      // Round the solid props (crates, stalls, fences) as well as the blocks.
      (query) => (routes ??= createRouteFinder({ ...data.route, propCells: [...props.blocked] })).find(query),
      (state) => {
        store.emit({ type: 'autowalk', state });
        overlay.stats.autowalk = state;
        // Arrived beside the quest's place: she greets the character or picks up the thing at once, as a tap
        // on Interact would, so a tap on the quest card takes the child right into the step.
        if (state === 'arrived') interactRequested = true;
      },
      (x, z) => data.regions.loadedAt(x, z),
    );
    this.cleanups.push(() => store.emit({ type: 'autowalk', state: 'idle' }));
    this.cleanups.push(() => store.emit({ type: 'autowalk-available', available: false }));
    this.cleanups.push(
      store.onCommand((command) => {
        if (command.type === 'interact') interactRequested = true;
        if (command.type === 'rescue') rescueRequested = true;
        if (command.type === 'celebrate') celebrateRequested = true;
        if (command.type === 'autowalk-start' && hint?.available) walker.go(controller.position, hint.def);
        if (command.type === 'autowalk-stop') walker.stop();
        if (command.type === 'set-target-hint') {
          // A new step points somewhere else: a walk to the old place ends where she is.
          if (command.targetId !== (hint?.def.id ?? null)) walker.stop();
          hint = command.targetId ? (byId.get(command.targetId) ?? null) : null;
          if (command.targetId && command.targetId !== pointedAt.at(-1)) {
            pointedAt.push(command.targetId);
            placeCast();
          }
        }
        // Server-backed target states; a target missing from the map returns to its initial look.
        if (command.type === 'set-world-state') for (const [id, target] of byId) target.setState(command.state[id]);
      }),
    );
    this.cleanups.push(() => store.emit({ type: 'interaction-prompt', prompt: null }));
    this.cleanups.push(() => store.emit({ type: 'stuck', stuck: false }));
    /** No dry spot yet: next to the target the arrow points at, else the spawn point. */
    const rescueFallback = (): [number, number, number] => {
      const at = hint?.def;
      if (!at) return [...entities.spawn.position];
      const [x, y, z] = at.position;
      const offset = Math.min(1.5, at.radius * 0.5);
      return [x + offset, y + 0.5, z + offset];
    };

    overlay.stats.meshMs = Math.round(world.meshMs());
    overlay.stats.worker = world.usedWorker;
    const timer = new Timer();
    timer.connect(document);
    this.timer = timer;
    this.cleanups.push(() => timer.dispose());
    let firstFrame = true;
    /** Seconds since the child last dragged the view. */
    let sinceLook = Infinity;
    /** The view's yaw and the stick's angle when the child set her direction: she keeps walking that way while the view swings round behind her. */
    let heading: { yaw: number; stick: number } | null = null;

    this.loop = () => {
      timer.update();
      // Review screenshots step a fixed 1/60 s, then freeze once ready: the capture lands a variable number of
      // frames later, and water / NPC animation must not move in between.
      const dt = reviewShot && !reviewShot.live ? (reviewShot.settled ? 0 : 1 / 60) : Math.min(timer.getDelta(), 0.1);
      // Zoom works on the autopilot too.
      rig.zoom(input.readZoom());
      let intent: MoveIntent;
      let interact = interactRequested;
      interactRequested = false;
      if (autopilot) {
        intent = autopilot.intent(dt, controller.position);
        rig.follow(controller.facing, dt);
      } else {
        const state = input.read();
        interact ||= state.interact;
        rig.orbit(state.lookX, state.lookY);
        // While she walks on her own, the view settles behind her: the tilt drifts back to rest and the camera
        // turns toward where she goes. Only walking forward turns it (a sideways or backward step would make
        // the camera chase her round in circles), and not within a moment of her own drag.
        sinceLook = state.lookX !== 0 || state.lookY !== 0 ? 0 : sinceLook + dt;
        const moving = Math.hypot(state.moveX, state.moveY) > 0.1;
        // The stick sets a direction relative to the view at that moment, and she keeps it while the view
        // turns to sit behind her (owner, 02/10/2026: the camera faces the way she goes, whichever way she
        // pushes); turning the stick, or the child's own drag, takes a new direction from the view as it is.
        const stick = Math.atan2(state.moveX, state.moveY);
        if (!moving) heading = null;
        else if (!heading || sinceLook === 0 || Math.abs(Math.atan2(Math.sin(stick - heading.stick), Math.cos(stick - heading.stick))) > STICK_TURN) heading = { yaw: rig.yaw, stick };
        // On a vehicle the view follows behind her as when she runs.
        const isRunning = (state.run || ride.riding) && controller.speed > (WALK_SPEED + 0.4);
        const followStrength = isRunning
          ? FOLLOW_STRENGTH_RUN
          : controller.speed > 0.8
            ? FOLLOW_STRENGTH_WALK * Math.min(1, controller.speed / WALK_SPEED)
            : 0;
        if (sinceLook > LOOK_HOLD_S && moving) {
          rig.recenter(dt);
          if (followStrength > 0) rig.follow(controller.facing, dt, followStrength);
        }
        const { right, forward } = rig.basis(heading?.yaw);
        intent = {
          dirX: right[0] * state.moveX + forward[0] * state.moveY,
          dirZ: right[1] * state.moveX + forward[1] * state.moveY,
          run: state.run,
          jump: state.jump,
        };
        // Walking to the quest target on her own: a touch of the stick hands Miu back to the child. The view
        // follows behind her, unless the child has just dragged it.
        const walked = walker.update(dt, controller.position);
        if (walked && moving) walker.stop();
        else if (walked) {
          intent = walked;
          if (sinceLook > LOOK_HOLD_S) {
            rig.recenter(dt);
            rig.follow(controller.facing, dt, FOLLOW_STRENGTH_RUN);
          }
        }
      }
      controller.update(dt, intent);
      ride.update(dt);
      if (rescueRequested) {
        rescueRequested = false;
        walker.stop();
        controller.teleport(rescue.spot() ?? rescueFallback());
        rescue.reset();
      }
      const stuck = rescue.update(dt, {
        position: [controller.position.x, controller.position.y, controller.position.z],
        safe: controller.onGround && !controller.inWater,
        inWater: controller.inWater,
        pushing: Math.hypot(intent.dirX, intent.dirZ) > 0.5,
      });
      store.emit({ type: 'stuck', stuck });
      character.root.position.copy(controller.position);
      character.root.position.y += ride.liftWorld;
      character.root.rotation.y = controller.facing;
      // On a vehicle she stands calm (idle) or holds her seated pose while it carries her.
      character.update(dt, ride.riding ? 0 : controller.speed, controller.onGround, ride.pose);
      rig.update(dt, controller.position);
      // With the camera inside Miu (nowhere left to back off to), hide her rather than show her insides.
      if (!reviewShot?.backdrop) character.root.visible = rig.viewDistance > 0.9 && !reviewShot?.hidesPlayer;
      if (pet) {
        const p = controller.position;
        pet.update(dt, { x: p.x, y: p.y, z: p.z, facing: controller.facing }, ground);
        pet.root.visible = !reviewShot?.backdrop && !reviewShot?.hidesPlayer;
        overlay.stats.petClip = pet.clip;
      }
      reviewShot?.apply(camera);
      sky.position.copy(camera.position);
      sun.position.set(controller.position.x + 18, controller.position.y + 30, controller.position.z + 12);
      sun.target.position.copy(controller.position);
      world.water.uTime.value += dt;
      // No occlusion fade: walls, roofs and trees always draw as they are.
      world.update(camera);
      props.update(camera.position);

      for (const target of targets) target.update(dt, controller.position, camera.position);
      arrow.update(dt, controller.position, hint?.available ? hint.def : null);
      const questPlace = hint?.available ? hint.def.position : null;
      minimap.update(dt, { x: controller.position.x, z: controller.position.z, facing: controller.facing }, questPlace ? { x: questPlace[0], z: questPlace[2] } : null);
      store.emit({ type: 'autowalk-available', available: hint?.available === true });
      overlay.stats.hintTarget = arrow.showing ? (hint?.def.id ?? null) : null;
      const nearest = pickNearest(targets, controller.position);
      // Quest targets always win the prompt; ambient life goes quiet next to them.
      const nearAmbient = nearest ? null : life.nearest(controller.position);
      // A still review shot gathers the nearest people and animals round what it looks at, not round the child.
      life.update(dt, reviewShot && !reviewShot.live ? reviewShot.target : controller.position, nearest !== null, { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
      if (nearest !== promptTarget || nearAmbient !== promptAmbient) {
        promptTarget = nearest;
        promptAmbient = nearAmbient;
        const def = nearest?.def;
        const prompt = def
          ? { targetId: def.id, kind: def.kind, name: def.name, label: def.label }
          : nearAmbient
            ? { targetId: nearAmbient.id, kind: 'ambient' as const, name: nearAmbient.name, label: nearAmbient.label }
            : null;
        store.emit({ type: 'interaction-prompt', prompt });
      }
      const anchorAt = promptTarget
        ? promptTarget.screenAnchor(camera, { width: window.innerWidth, height: window.innerHeight })
        : promptAmbient
          ? life.screenAnchor(promptAmbient, camera, { width: window.innerWidth, height: window.innerHeight })
          : null;
      if (anchorAt) {
        const anchor = store.getPromptAnchor();
        if (anchor) {
          anchor.style.transform = `translate(-50%, -100%) translate(${anchorAt.x}px, ${anchorAt.y}px)`;
          anchor.style.visibility = 'visible'; // hidden until first positioned: no flash at 0,0
        }
      }
      if (interact && promptTarget?.def.ride) {
        // A ride across the map: the child gets off at the next stop (its regions are fetched ahead). One ride at
        // a time: a second press while the far stop loads would set her down twice, maybe at another stop.
        const [rx, ry, rz] = promptTarget.def.ride;
        if (!riding) {
          riding = true;
          // Off beside whatever stands on the stop (a signpost, a crate), never inside it.
          void world
            .settle(rx, rz)
            .then(() => controller.teleport(nearestUsableSpot([rx, ry, rz], solid, liquid, data.bounds, data.world.height) ?? [rx, ry, rz]))
            .finally(() => (riding = false));
        }
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptTarget?.def.travel) {
        store.emit({ type: 'travel', region: promptTarget.def.travel });
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptTarget) {
        store.emit({ type: 'interaction', targetId: promptTarget.def.id });
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptAmbient) {
        life.react(promptAmbient.id);
      }
      // A finished quest: everyone around cheers; confetti unless the child asked for less motion.
      if (celebrateRequested) {
        celebrateRequested = false;
        life.celebrate(controller.position);
        pet?.celebrate();
        if (!reducedMotion) confetti.burst(controller.position);
      }
      confetti.update(dt);
      portalSparks.update(dt);
      // `?event=` (review/E2E switch): that surprise right away, once.
      if (surprise.success && events.played === 0 && !events.active) events.start(surprise.data, controller.position);
      events.update(dt, controller.position, nearest !== null);
      overlay.stats.worldEvent = events.active;
      overlay.stats.worldEvents = events.played;
      overlay.stats.ambientCelebrations = life.stats.celebrations;
      overlay.stats.confetti = confetti.active;
      overlay.stats.ambientVisible = life.stats.visible;
      overlay.stats.ambientReactions = life.stats.reactions;
      overlay.stats.ambientLine = life.stats.lastLine;
      overlay.stats.player = [controller.position.x, controller.position.y, controller.position.z];
      overlay.stats.onGround = controller.onGround;
      overlay.stats.speed = controller.speed;
      overlay.stats.riding = ride.riding;
      overlay.stats.patches = world.patchCount();
      overlay.stats.nearTarget = promptTarget?.def.id ?? null;
      overlay.stats.cameraYaw = rig.yaw;
      overlay.stats.cameraInsideBlock = solid(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));

      renderer.render(scene, camera);
      overlay.frame(dt, renderer);
      reviewShot?.frameDone();
      if (firstFrame) {
        firstFrame = false;
        overlay.stats.loadMs = Math.round(performance.now());
        overlay.stats.firstAreaBytes = downloadedBytes();
        overlay.stats.ready = true;
        store.emit({ type: 'ready' });
      }
    };
    this.runLoop();
  }
}
