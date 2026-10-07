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
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { blockLookup, blockTraversal } from '@miu/voxel/block-table';
import type { Traversal } from '@miu/voxel/traversal';
import type { SolidAt } from '@miu/voxel/grid-collision';
import { castHidden, entitiesForChapter } from '@miu/voxel/world-entities';
import { onLangModeChange, t as translate, writeText, type TextKey } from '../ui/i18n/i18n';
import { PETS, UI_ICONS, assetUrl } from '../ui/kit/ui-art';
import { readReduceMotion } from '../ui/system/display-setting';
import type { GameStore, WorldState } from '../game-bridge/game-store';
import { loadAmbientLife, preloadAmbientModels, type AmbientTarget } from './ambient/ambient-life';
import { createConfetti } from './scene/confetti';
import { createSpeechBubble } from './ambient/speech-bubble';
import { ObjectInteractionManager } from './interact/object-interaction-manager';
import type { CandidateObject } from './interact/object-interaction-types';
import { createObjectEffects, spinningProps } from './interact/object-effects';
import { ObjectStates } from './interact/object-states';
import { installObjectTour, objectsStats } from './interact/object-tour';
import { wallBetween } from './interact/interaction-geometry';
import { createPortalSparks } from './scene/portal-sparks';
import type { PlayerPosition } from '@miu/schema/player-position';
import { RegionCatalog, WorldEventKind, mapForRegion } from '@miu/schema/region';
import regionsJson from '../../../../content/world/regions.json';
import { AssetRegistry, GAME_MODELS, GuardedGltfLoader } from './asset-loader';
import { createReviewShot, parseViewShot } from './debug/review-shots';
import { StatsOverlay } from './debug/stats-overlay';
import { loadInteractables, namedForPlayer, pickNearest, type InteractableObject } from './entities/interactables';
import { loadEventDecor, withEventCharacters, type EventLayerOption } from './event/event-layer';
import { createTargetArrow } from './entities/target-arrow';
import { createMinimap } from './hud/minimap';
import { bossMarkers, minimapMarkers, sideGiverMarkers, type MapBoss } from './hud/minimap-model';
import { fetchSideGivers } from './hud/side-givers';
import { fetchStoryTellers } from './hud/story-tellers';
import { fillPlayerName } from '@miu/quest/player-name';
import { HOME_REGION } from '../ui/region/regions';
import { DEFAULT_SPECIES } from './content/characters';
import { loadPlayerCharacter, type ExtraPlayerAction } from './entities/player-character';
import { loadPetCompanion } from './entities/pet-companion';
import { createPetLife, type PetLife, type PetPlayer } from './pet/pet-life';
import { gearLooks } from './pet/pet-gear-catalog';

const ANIMAL_PET_LINES = [
  '❤️ Ngoan nào, bé thương bé vuốt ve nhé! 🐾',
  'Bạn nhỏ đáng yêu quá, bộ lông mềm mại làm sao! 🐰✨',
  'Đừng sợ nhé, chúng mình là bạn tốt của nhau mà! 🌸🐥',
];

const GREET_LINES = [
  '👋 Chào bạn nhé! Chúc bạn một ngày thật vui vẻ! ✨',
  'Bé vẫy tay chào người bạn mới quen! 😊🌟',
  'Rất vui được gặp bạn ở ngôi làng xinh đẹp này! 🏡',
];
import { catalogEntry, loadProps } from './entities/props';
import { cellKey } from '@miu/voxel/prop-collision';
import { createRouteFinder, type RouteFinder } from './nav/route-finder';
import { RouteWalker } from './nav/route-walker';
import { planWalk, type PlannedWalk } from './nav/walk-goal';
import { Autopilot } from './player/autopilot';
import { CameraRig } from './player/camera-rig';
import { PlayerInput } from './player/input';
import { PlayerController, WALK_SPEED, type MoveIntent } from './player/player-controller';
import { RescueWatch } from './player/rescue';
import { createRideControl } from './player/vehicle-ride';
import { createRideJourney } from './ride/ride-journey';
import { EMBEDDED_LIFT_S, isEmbedded, nearestUsableSpot } from './player/saved-spot';
import { standBeside } from './player/stand-beside';
import { readQuality } from './quality';
import { disposeSceneGraph } from './scene/dispose-scene';
import { SKY_HORIZON, createSky, skyColours } from './scene/sky';
import { createWorldEvents } from './scene/world-events';
import { HORIZON_REACH } from './world/horizon-mesh';
import { loadWorldData } from './world/world-data';
import { createWorldRenderer } from './world/world-renderer';
import { MultiplayerSession } from './multiplayer/multiplayer-session';
import type { NearPlayer } from './multiplayer/remote-player-manager';
import type { SocialStore } from '../game-bridge/social-store';
import './game.css';



/**
 * The loading bar (percent), from the measured share of each part of the boot (throttled CPU and network, first
 * entry and going back): the map's files, then two parts side by side, the land round the child (`LAND_SHARE`,
 * half of it once the world renderer is made) and the models (`MODEL_SHARE`, as each arrives), then the rest of
 * the set-up. It never fills before the first frame, which takes the loading screen away.
 */
const BOOT_PROGRESS = { renderer: 2, registry: 6, worldData: 18, setup: 95 } as const;
const LAND_SHARE = 22;
const MODEL_SHARE = 50;
type BootMilestone = keyof typeof BOOT_PROGRESS;
/**
 * Before the first frame only the land this near the child is drawn (the regions under it fetched); the rest of
 * the view and the regions ahead come in over the next frames. Review shots still wait for the whole view.
 */
const FIRST_FRAME_REACH = 48;
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
/** Back from a screen open this long, her pet runs up to greet her (ms). */
const GREET_AFTER_PAUSE_MS = 20_000;
/** How firmly the camera turns to frame her pet's scene (her and the pet both in view). */
const PET_SCENE_FOLLOW = 0.6;

export interface GameOptions {
  store: GameStore;
  /** Query string with dev/review switches: quality, stats, autopilot, spawnAt (`npc`, a target id, `x,y,z`, or `spawn` for the map's spawn point), face (camera yaw in degrees), shot, outfit, life (`0`: no villagers or animals), decor (`slot:option,…`: the home in other styles), minimap (`1`: kept in review shots), objects (`1`: `window.__miuObjects` lists the map's interactable objects and puts her beside one, for tests). */
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
  /** What the pet wears (`content/pet-gear.json`), from her saved character. */
  petGear?: readonly string[];
  /** Where the child last stood on this map (`GET /api/player-positions`); the spawn point when absent or no longer open ground. */
  savedSpot?: Pick<PlayerPosition, 'position' | 'facing'> | null;
  /** The child's picks for her home (`GET /api/home-decor`): the map's restyled pieces as she chose them. */
  decor?: Readonly<Record<string, string>>;
  /** What she left switched on in her home (`GET /api/home-objects`); with it the game reports changes (`object-states`). */
  objectStates?: Readonly<Record<string, boolean>>;
  /** The play screen's online UI (interaction menu on other players, party frame); none leaves it out. */
  social?: SocialStore;
  /** The bosses of this map (its big boss and zone guardians, from the quest list): always marked on the minimap. */
  bosses?: readonly MapBoss[];
  /** Limited-time events' scenes on this map (open or about to open); the play screen says when one opens or closes. */
  events?: readonly EventLayerOption[];
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
  joystick.append(div('knob'));
  const actions = div('actions', 'actions');
  // Labels follow the display language (Tiếng Việt / English / Song ngữ), also when it changes in Pause.
  const labels: Array<() => void> = [() => joystick.setAttribute('aria-label', translate('game.joystick'))];
  const button = (id: string, text: TextKey, icon: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.dataset.id = `game-${id}`;
    const img = document.createElement('img');
    img.src = assetUrl(icon);
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('span');
    labels.push(() => {
      b.setAttribute('aria-label', translate(text));
      writeText(label, text);
    });
    b.append(img, label);
    return b;
  };
  const run = button('btn-run', 'game.run', UI_ICONS.runningShoe);
  const jump = button('btn-jump', 'game.jump', UI_ICONS.kangaroo);
  actions.append(run, jump);
  root.append(stats, joystick, actions);
  host.append(root);
  const relabel = (): void => labels.forEach((write) => write());
  relabel();
  const stopLabels = onLangModeChange(relabel);
  return { root, stats, joystick, run, jump, stopLabels };
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
  /** When the last pause began (ms), and whether the pet should greet her as the game comes back after a long one. */
  private pausedAt = 0;
  private backAfterPause = false;

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
    if (!this.paused) this.pausedAt = performance.now();
    this.paused = true;
    this.renderer?.setAnimationLoop(null);
    this.input?.clear();
  }

  /** Restarts rendering after `stop()`. No-op before the first frame is ready, after dispose, or once the context is lost. */
  resume(): void {
    if (this.paused && performance.now() - this.pausedAt > GREET_AFTER_PAUSE_MS) this.backAfterPause = true;
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
    let shown = 0;
    const progress = (percent: number): void => {
      const next = Math.round(Math.max(shown, percent));
      if (next === shown) return;
      shown = next;
      store.emit({ type: 'loading-progress', done: next, total: 100 });
    };
    store.emit({ type: 'loading' });
    store.emit({ type: 'loading-progress', done: 0, total: 100 });
    const params = new URLSearchParams(search);
    const quality = readQuality(search);
    // The manifest is read while the renderer is made (once a page: a later game has it at once).
    const registryPending = AssetRegistry.shared();
    // A new game: the parsed models the game before last used are let go, this one's and the last one's kept.
    GAME_MODELS.nextRound();
    const dom = buildDom(this.host);
    this.cleanups.push(() => {
      dom.stopLabels();
      dom.root.remove();
    });
    const overlay = new StatsOverlay(dom.stats, quality.level);
    const bootStart = performance.now();
    const lap = (milestone: string): void => {
      overlay.stats.boot[milestone] = Math.round(performance.now() - bootStart);
      if (milestone in BOOT_PROGRESS) progress(BOOT_PROGRESS[milestone as BootMilestone]);
    };
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
    lap('renderer');

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

    const registry = await registryPending;
    if (this.disposed) return;
    lap('registry');
    const loader = new GuardedGltfLoader(registry, GAME_MODELS);
    const mapId = mapForRegion(REGION_CATALOG, this.options.region ?? '');
    // A still picture of the whole core (a review shot without `view=`) needs no outer land round it.
    const wholeCoreShot = params.has('shot') && !(Number(params.get('view')) > 0);
    const data = await loadWorldData(registry, mapId, { withOutland: !wholeCoreShot, decor: this.options.decor ?? decorFromSearch(params) });
    this.cleanups.push(() => data.regions.dispose());
    if (this.disposed) return;
    lap('worldData');
    const eventLayers = this.options.events ?? [];
    const chapterEntities = entitiesForChapter(withEventCharacters(data.entities, eventLayers), this.options.chapter ?? 1, this.options.quest);
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
    const outfitParam = params.get('outfit');
    const outfit = outfitParam === 'none' ? [] : outfitParam ? outfitParam.split(',') : this.options.outfit;
    // The models need only the map's entities: they load (and their files download) while the land is built.
    let landDone = 0;
    let modelsDone = 0;
    const partsProgress = (): void => progress(BOOT_PROGRESS.worldData + LAND_SHARE * landDone + MODEL_SHARE * modelsDone);
    loader.onProgress((finished, asked) => {
      modelsDone = finished / Math.max(asked, 1);
      partsProgress();
    });
    const timed = <T>(milestone: string, pending: Promise<T>): Promise<T> =>
      pending.then((value) => {
        lap(milestone);
        return value;
      });
    const petSpec = PETS.find((p) => p.id === this.options.pet);
    /** Awaited after the land is in; a failure meanwhile is not reported as unhandled (the await rethrows it). */
    const early = <T>(pending: Promise<T>): Promise<T> => {
      pending.catch(() => undefined);
      return pending;
    };
    const characterPending = early(timed('character', loadPlayerCharacter(loader, this.options.species ?? DEFAULT_SPECIES, outfit)));
    const targetsPending = early(timed('interactables', loadInteractables(loader, entities, quality.shadows)));
    // Nothing fades for standing between the camera and the child (owner, 02/10/2026): the camera comes in
    // front of walls and roofs instead (camera-rig.ts), plants simply show.
    // Props whose interaction turns them whole (a globe) are drawn on their own; moving parts always are.
    const propsPending = early(timed('props', loadProps(loader, entities, quality.shadows, undefined, spinningProps(entities.props))));
    const eventDecorPending = early(loadEventDecor(loader, entities, eventLayers, quality.shadows));
    const petPending = petSpec
      ? early(
          timed(
            'pet',
            loadPetCompanion(loader, petSpec, quality.shadows).then((pet) => {
              pet.wear(gearLooks(this.options.petGear ?? []));
              return pet;
            }),
          ),
        )
      : null;
    const lifeOn = params.get('life') !== '0';
    const shotAt = parseViewShot(params.get('shot') ?? '')?.target;
    const lifeStart: [number, number] = shotAt ? [shotAt.x, shotAt.z] : [start[0] ?? 0, start[2] ?? 0];
    if (lifeOn) preloadAmbientModels(loader, entities.ambients ?? [], lifeStart);
    const world = await createWorldRenderer(data, { sky: SKY_HORIZON, horizon: quality.horizon });
    if (this.disposed) return;
    lap('worldRenderer');
    landDone = 0.5;
    partsProgress();
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
    const liquid = (x: number, y: number, z: number): boolean => blocks(data.world.get(x, y, z))?.liquid ?? false;
    /** Solid cells never stepped or climbed onto by walking: fences, doors, railings, panes. */
    const blocking: SolidAt = (x, y, z) => {
      const block = blocks(data.world.get(x, y, z));
      return (block !== undefined && blockTraversal(block) === 'blocking') || propCells.get(cellKey(x, y, z)) === 'blocking';
    };

    await world.settle(start[0] ?? 0, start[2] ?? 0, params.has('shot') ? undefined : FIRST_FRAME_REACH);
    if (this.disposed) return;
    lap('settle');
    landDone = 1;
    partsProgress();
    /** Where a walker stands over a column: the first open cell with ground under it, searched near its height. */
    const ground = (x: number, z: number, nearY: number): number => {
      const bx = Math.floor(x);
      const bz = Math.floor(z);
      for (let y = Math.floor(nearY) + 2; y >= Math.floor(nearY) - 4; y--) {
        if (solid(bx, y - 1, bz) && !solid(bx, y, bz) && !solid(bx, y + 1, bz)) return y;
      }
      return nearY;
    };
    // The game's own "Chuyển động: Giảm bớt" (Settings), else the device's preference.
    const reducedMotion = readReduceMotion();
    const [character, targets, props, pet, life] = await Promise.all([
      characterPending,
      targetsPending,
      propsPending,
      petPending,
      // The villagers and animals round the start stand on its ground: built once the land there is in.
      // `?life=0` (dev/perf switch): the map without its villagers and animals.
      timed('life', loadAmbientLife(loader, lifeOn ? (entities.ambients ?? []) : [], {
        quality: quality.level,
        shadows: quality.shadows,
        reduced: reducedMotion,
        playerName: this.options.playerName ?? 'bạn',
        ground,
        // A review shot of a far view (the mock frames) gets the people round what it looks at ready
        // before its first frame, as the child's start does in play.
        start: lifeStart,
      })),
    ]);
    loader.onProgress(null);
    if (this.disposed) return;
    lap('models');
    const eventDecor = await eventDecorPending;
    this.cleanups.push(() => eventDecor.dispose());
    // The map's solid props and the open events' decorations, again whenever an event opens or closes.
    const mergeCells = (): void => {
      propCells = eventDecor.blocked().size === 0 ? props.blocked : new Map([...props.blocked, ...eventDecor.blocked()]);
    };
    mergeCells();
    const confetti = createConfetti();
    // The portals' sparks swirl and drift out (fewer on the low quality, still for less motion).
    const portalSparks = createPortalSparks(entities.props, { perPortal: quality.level === 'low' ? 12 : 28, still: reducedMotion });
    scene.add(portalSparks.mesh);
    this.cleanups.push(() => portalSparks.dispose());
    overlay.stats.portals = portalSparks.portals;
    const lookAhead = new Vector3();
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
    /** Whether the last frame was under the rain surprise (React hears of each change). */
    let wasRaining = false;
    const heldMood = params.get('mood');
    if (heldMood === 'dusk' || heldMood === 'night' || heldMood === 'cave') events.holdMood(heldMood);
    props.setViewDistance(quality.viewDistance);
    props.buildAround(start[0] ?? 0, start[2] ?? 0);
    eventDecor.setViewDistance(quality.viewDistance);
    eventDecor.buildAround(start[0] ?? 0, start[2] ?? 0);
    scene.add(character.root, props.group, ...eventDecor.groups, life.group, confetti.mesh, ...targets.map((t) => t.root));

    const playerBubble = createSpeechBubble();
    scene.add(playerBubble.sprite);
    this.cleanups.push(() => {
      scene.remove(playerBubble.sprite);
      playerBubble.sprite.material.dispose();
    });
    // Furniture and props she can use; how they answer is drawn by the object effects (her home's switches kept).
    const objectStates = new ObjectStates(this.options.objectStates);
    const objectInteractions = new ObjectInteractionManager(entities, playerBubble, {
      catalog: catalogEntry,
      bounds: (model) => props.modelInfo(model)?.bounds,
      standSpot: (at) => nearestUsableSpot(at, solid, liquid, data.bounds, data.world.height, 3),
      wallBetween: (from, to) => wallBetween(from, to, (x, y, z) => blocks(data.world.get(x, y, z))?.solid ?? false),
      states: objectStates,
      reduced: reducedMotion,
    });
    const objectEffects = createObjectEffects({
      scene,
      objects: objectInteractions.objects,
      states: objectStates,
      props,
      catalog: catalogEntry,
      quality: quality.level,
      reduced: reducedMotion,
    });
    objectInteractions.attachEffects(objectEffects);
    this.cleanups.push(() => objectEffects.dispose());
    const keepsHome = this.options.objectStates !== undefined;
    if (keepsHome) {
      // Her home: every change to what is kept switched on goes to the play screen to save (only keys of objects
      // this map has: one the map lost since is dropped). Visiting another's home, nothing she switches is kept.
      const known = new Set(objectInteractions.objects.map((o) => o.stateKey));
      let last = JSON.stringify(objectStates.saved(known));
      objectStates.onChange(() => {
        const saved = objectStates.saved(known);
        const key = JSON.stringify(saved);
        if (key === last) return;
        last = key;
        store.emit({ type: 'object-states', states: saved });
      });
    }

    // Other players and companion bots; who the child is to them the server reads from her saved character.
    const online = new MultiplayerSession({
      loader,
      ground,
      shadows: quality.shadows,
      start: { mapId, x: start[0] ?? 0, y: start[1] ?? 0, z: start[2] ?? 0, yaw: entities.spawn.yaw },
      store,
      social: this.options.social ?? null,
      regionOfMap: (id) => REGION_CATALOG.regions.find((r) => r.status === 'open' && r.map === id)?.id ?? null,
      say: (text) => playerBubble.show(text),
      onRemotes: (players) => (overlay.stats.remotePlayers = players),
    });
    scene.add(online.group);
    this.cleanups.push(() => online.dispose());
    const multiplayer = online.client;
    // The minimap (top right, under the menu): the map from above, its gates, the child's home on her map.
    const playerName = this.options.playerName ?? 'bạn';
    const regionName = (id: string): string | undefined => {
      const name = REGION_CATALOG.regions.find((r) => r.id === id)?.name;
      return name === undefined ? undefined : fillPlayerName(name, playerName);
    };
    const fillName = (text: string): string => fillPlayerName(text, playerName);
    const minimap = createMinimap(dom.root, {
      atlas: data.atlas,
      atlasImage: (data.atlasTexture.image as CanvasImageSource | null) ?? null,
      horizon: data.horizon,
      size: [data.entities.size[0], data.entities.size[2]],
      markers: [
        ...minimapMarkers(entities, { regionName, homeName: mapId === mapForRegion(REGION_CATALOG, HOME_REGION) ? regionName(HOME_REGION) : undefined, homeRegion: HOME_REGION, fill: fillName, size: [data.entities.size[0], data.entities.size[2]] }),
        // Every boss, wherever it stands (the big boss too while another quest is played).
        ...bossMarkers(data.entities.interactables, this.options.bosses ?? []),
      ],
      title: regionName(this.options.region ?? '') ?? '',
      lite: quality.level === 'low',
      // "Đi tới đây" on the full map: the quest card's walk, to that place.
      onGo: (goal) => store.send({ type: 'autowalk-to', to: goal }),
    });
    this.cleanups.push(() => minimap.dispose());
    overlay.stats.outfit = character.outfit;

    const controller = new PlayerController(solid, entities.spawn.position, entities.spawn.yaw, liquid, blocking);
    const rescue = new RescueWatch();
    // The equipped vehicle: the HUD's "Lái xe" puts her on it.
    const ride = createRideControl({ store, outfit, root: character.root, rider: controller, castShadow: quality.shadows, reduced: reducedMotion });
    this.cleanups.push(() => ride.dispose());
    // The map's rides (bus, train, boat, cable car, balloon): a journey she sees from the stop to the far stop.
    const journey = createRideJourney({
      scene,
      camera,
      host: dom.root,
      world,
      horizon: data.horizon,
      blocks: data.atlas.blocks,
      groundAt: (x, z, nearY) => (data.regions.loadedAt(x, z) ? ground(x, z, nearY) : null),
      standAt: (spot) => nearestUsableSpot(spot, solid, liquid, data.bounds, data.world.height),
      // The riding camera stops in front of any loaded block (a tree top too); land still on its way is no wall to it.
      solid: (x, y, z) => data.regions.loadedAt(x, z) && (data.world.get(x, y, z) !== 0 ? !liquid(x, y, z) : propCells.has(cellKey(x, y, z))),
      followView: () => ({ pitch: rig.pitch, distance: rig.distance }),
      reduced: reducedMotion,
      castShadow: quality.shadows,
    });
    this.cleanups.push(() => journey.dispose());
    // Dev/E2E switch: start next to a target (`npc` = the first NPC), or at `x,y,z`, instead of the spawn point.
    const spawnAt = spawnAtParam;
    const spawnTarget = entities.interactables.find((t) => (spawnAt === 'npc' ? t.kind === 'npc' : t.id === spawnAt));
    const spawnPoint = spawnAt?.split(',').map(Number) ?? [];
    if (spawnPoint.length === 3 && spawnPoint.every(Number.isFinite)) {
      controller.position.set(spawnPoint[0] ?? 0, spawnPoint[1] ?? 0, spawnPoint[2] ?? 0);
    } else if (spawnTarget) {
      const others = entities.interactables.filter((t) => t !== spawnTarget);
      const [sx, sy, sz] = standBeside(spawnTarget, others, solid, liquid, data.bounds, data.world.height);
      controller.position.set(sx, sy, sz);
    } else if (spawnAt === null && this.options.savedSpot) {
      // Back where the child left off; any `spawnAt` (even `spawn`) starts where the URL says instead.
      const at = nearestUsableSpot(this.options.savedSpot.position, solid, liquid, data.bounds, data.world.height);
      if (at) {
        controller.teleport(at);
        controller.facing = this.options.savedSpot.facing;
      }
    }
    const drawingBuffer = new Vector2();
    /** She was on a seat, a bed or before a screen last frame. */
    let wasHeld = false;
    const objectStatsOn = params.get('objects') === '1' || params.has('stats');
    const rig = new CameraRig(camera, solid, controller.facing + Math.PI);
    // Dev/E2E switch `objects=1`: the map's objects listed, and a way to stand beside one (interact/object-tour.ts).
    if (params.get('objects') === '1') {
      this.cleanups.push(
        installObjectTour({
          manager: objectInteractions,
          controller,
          standSpot: (at) => nearestUsableSpot(at, solid, liquid, data.bounds, data.world.height, 3),
          face: (facing) => (rig.yaw = facing + Math.PI),
        }),
      );
    }
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
        // On a ride she is kept at the last spot she stood on (the stop) until she gets off; seated, where she stood before.
        const here = !journey.active && controller.onGround && !controller.inWater ? ([p.x, p.y, p.z] as const) : rescue.spot();
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
    /** An interactive furniture or prop object in reach (bed, chair, toilet, sink, stove, etc.). */
    let promptObject: CandidateObject | null = null;
    let promptObjectLabel: string | null = null;
    let promptPet = false;
    /** Another player in reach: the interaction button opens the online menu on her. */
    let promptPlayer: NearPlayer | null = null;
    let ambientActionTimer = 0;
    let currentAmbientAction: ExtraPlayerAction = null;
    let interactRequested = false;
    let rescueRequested = false;
    let celebrateRequested = false;
    const byId = new Map(targets.map((t) => [t.def.id, t]));
    // A closed event's characters stay out of sight whatever the quest's world state says.
    let lastWorldState: WorldState = {};
    for (const [id, target] of byId) if (eventDecor.hides(id)) target.setState('hidden');
    // The events' characters are drawn only within the view distance, like their decorations' tiles: from afar the
    // scene adds nothing to the frame (the arrow and the walk still find them).
    const eventTargets = targets.filter((t) => eventDecor.owns(t.def.id));
    // Her pet's life round her: care scenes, tricks, sniffing toward clues, and its own reactions (pet/pet-life.ts).
    const petBubble = createSpeechBubble();
    scene.add(petBubble.sprite);
    this.cleanups.push(() => {
      scene.remove(petBubble.sprite);
      petBubble.sprite.material.dispose();
    });
    /** Whether a pet may stand in this column at about `y`: on ground, two cells of room, not in water. */
    const standable = (x: number, z: number, y: number): boolean => {
      const bx = Math.floor(x);
      const bz = Math.floor(z);
      const by = Math.floor(y);
      return solid(bx, by - 1, bz) && !solid(bx, by, bz) && !solid(bx, by + 1, bz) && !liquid(bx, by, bz);
    };
    const bedAnchor = entities.decorAnchors?.find((a) => a.slot === 'pet-bed');
    const petLife: PetLife | null = pet
      ? createPetLife({
          pet,
          scene,
          spawn: (particle) => objectEffects.spawn(particle),
          ground,
          standable,
          bed: bedAnchor ? { x: bedAnchor.position[0], y: bedAnchor.position[1], z: bedAnchor.position[2] } : null,
          say: (text, sub) => petBubble.show(text, sub),
          playerAction: (action, seconds) => {
            currentAmbientAction = action;
            ambientActionTimer = seconds;
          },
          onScene: (name) => {
            store.emit({ type: 'pet-scene', scene: name });
            overlay.stats.petScene = name;
            if (name) overlay.stats.petScenes = [...overlay.stats.petScenes, name];
          },
          gentle: reducedMotion,
          lite: quality.level === 'low',
          shadows: quality.shadows,
        })
      : null;
    if (petLife) this.cleanups.push(() => petLife.dispose());
    this.cleanups.push(() => store.emit({ type: 'pet-scene', scene: null }));
    this.cleanups.push(() => store.emit({ type: 'pet-sniff', available: false, wait: 0 }));
    overlay.stats.petGear = [...(pet?.gear ?? [])];
    /** The clues of the step under way still to find; the pet sniffs toward the nearest one on this map. */
    let sniffTargets: readonly string[] = [];
    let petName = petSpec?.name ?? '';
    const sniffPlaces = (): Array<readonly [number, number, number]> => sniffTargets.flatMap((id) => {
      const target = byId.get(id);
      return target?.available ? [target.def.position] : [];
    });
    /** Whether a clue to sniff toward stands on this map, checked a few times a second (not every frame). */
    let sniffable = false;
    let sniffCheck = 0;
    /** Her, as the pet sees her each frame (one object, filled in place). */
    const petPlayer: PetPlayer = { x: 0, y: 0, z: 0, facing: 0, speed: 0, seated: null, riding: false };
    const petSeat = { x: 0, z: 0, lying: false };
    const petAt: [number, number, number] = [0, 0, 0];
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
    // The characters who offer a minigame here, on the minimap and the full map (none in review shots).
    if (this.options.region && !params.has('shot')) {
      const region = this.options.region;
      void Promise.all([fetchSideGivers(region, fillName), fetchStoryTellers(region, fillName)]).then(([givers, tellers]) => {
        if (this.disposed) return;
        minimap.setSideMarkers(sideGiverMarkers(entities.interactables.filter((t) => byId.get(t.id)?.available), givers, tellers));
      });
    }
    // Tapping the quest card walks Miu to the hinted target along the ways, "Đi tới đây" on the full map to any
    // place marked there. The route worker starts on the first walk: most visits never ask for one.
    let routes: RouteFinder | null = null;
    /** Whether the walk under way ends in a tap on Interact (planWalk). */
    let walkInteracts = false;
    this.cleanups.push(() => routes?.dispose());
    const walker = new RouteWalker(
      // Round the solid props (crates, stalls, fences) as well as the blocks.
      (query) => (routes ??= createRouteFinder({ ...data.route, propCells: [...props.blocked] })).find(query),
      (state) => {
        store.emit({ type: 'autowalk', state });
        overlay.stats.autowalk = state;
        // Arrived beside the quest's place (or a character picked on the map): she greets the character or picks
        // up the thing at once, as a tap on Interact would, so a tap on the quest card takes the child right into
        // the step. Never through a gate or onto a ride on her own (planWalk).
        if (state === 'arrived' && walkInteracts) interactRequested = true;
      },
      (x, z) => data.regions.loadedAt(x, z),
    );
    const walkTo = (plan: PlannedWalk): void => {
      walkInteracts = plan.interactOnArrival;
      walker.go(controller.position, plan.target);
    };
    this.cleanups.push(() => store.emit({ type: 'autowalk', state: 'idle' }));
    this.cleanups.push(() => store.emit({ type: 'autowalk-available', available: false }));
    this.cleanups.push(
      store.onCommand((command) => {
        if (command.type === 'interact') interactRequested = true;
        // Worn at once (the shop's "Mặc"); the others see it from the server when it is saved.
        if (command.type === 'set-outfit') {
          character.wear(command.equipped);
          overlay.stats.outfit = character.outfit;
        }
        if (command.type === 'rescue') rescueRequested = true;
        if (command.type === 'celebrate') celebrateRequested = true;
        if (command.type === 'pet-care') petLife?.care(command.action);
        if (command.type === 'pet-trick') petLife?.trick(command.trick);
        if (command.type === 'pet-gear' && pet) {
          pet.wear(gearLooks(command.gear));
          overlay.stats.petGear = [...pet.gear];
        }
        if (command.type === 'pet-name') petName = command.name ?? petSpec?.name ?? '';
        if (command.type === 'pet-sniff-targets') sniffTargets = command.targets;
        if (command.type === 'pet-sniff') petLife?.sniff(sniffPlaces());
        if (command.type === 'autowalk-start' && hint?.available) walkTo({ target: hint.def, interactOnArrival: true });
        if (command.type === 'autowalk-to') {
          const goal = command.to;
          // A big boss picked on the full map: the quest played here walks to its next place (the card's walk);
          // another quest is the play screen's to take up (the map is built again for it).
          if ('quest' in goal) {
            if (goal.quest !== this.options.quest) store.emit({ type: 'quest-pick', questId: goal.quest });
            else if (hint?.available) walkTo({ target: hint.def, interactOnArrival: true });
          } else {
            const plan = planWalk(goal, (id) => byId.get(id));
            if (plan) walkTo(plan);
          }
        }
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
        if (command.type === 'set-world-state') {
          lastWorldState = command.state;
          for (const [id, target] of byId) target.setState(eventDecor.hides(id) ? 'hidden' : command.state[id]);
        }
        if (command.type === 'set-event-open') {
          eventDecor.setOpen(new Set(command.open));
          mergeCells();
          for (const [id, target] of byId) target.setState(eventDecor.hides(id) ? 'hidden' : lastWorldState[id]);
        }
      }),
    );
    this.cleanups.push(() => store.emit({ type: 'interaction-prompt', prompt: null }));
    this.cleanups.push(() => store.emit({ type: 'stuck', stuck: false }));
    /** No dry spot yet: next to the target the arrow points at, else the spawn point. */
    let embeddedFor = 0;
    const rescueFallback = (): [number, number, number] => {
      const at = hint?.def;
      if (!at) return [...entities.spawn.position];
      const [x, y, z] = at.position;
      const offset = Math.min(1.5, at.radius * 0.5);
      return [x + offset, y + 0.5, z + offset];
    };

    lap('setup');
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
      if (journey.active) {
        // The ride drives her: the stick and the buttons wait (read, so nothing is left over for after).
        input.read();
        intent = { dirX: 0, dirZ: 0, run: false, jump: false };
      } else if (autopilot) {
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
      // On a ride the journey carries her (the camera rides along); she is set down at the far stop at its end.
      const journeyFrame = journey.update(dt);
      const carried = journeyFrame && !('done' in journeyFrame) ? journeyFrame : null;
      if (journeyFrame && 'done' in journeyFrame) {
        objectInteractions.cancel();
        controller.teleport(journeyFrame.done);
        controller.facing = journeyFrame.facing;
        rig.yaw = journeyFrame.cameraYaw;
        rescue.reset();
        // Off the ride at the far stop: her pet comes running.
        petLife?.greet();
      }
      if (carried) controller.position.copy(carried.feet);
      else {
        controller.update(dt, intent);
        ride.update(dt);
      }
      if (rescueRequested) {
        rescueRequested = false;
        objectInteractions.cancel();
        if (!carried) {
          walker.stop();
          controller.teleport(rescue.spot() ?? rescueFallback());
          rescue.reset();
          petLife?.greet();
        }
      }
      const stuck = !carried && rescue.update(dt, {
        position: [controller.position.x, controller.position.y, controller.position.z],
        // A spot her body overlaps (a seat between two desks) is no place to put her back on.
        safe: controller.onGround && !controller.inWater && !isEmbedded([controller.position.x, controller.position.y, controller.position.z], solid),
        inWater: controller.inWater,
        pushing: Math.hypot(intent.dirX, intent.dirZ) > 0.5,
      });
      store.emit({ type: 'stuck', stuck });
      // Inside a solid block (a stool she sat on, a prop that landed on her) she cannot walk off: lift her out to
      // the nearest open spot, else the last safe one. Sitting is the one time she is meant to be in a cell.
      const p = controller.position;
      const embedded = !carried && !controller.climbing && !objectInteractions.isInteracting && isEmbedded([p.x, p.y, p.z], solid);
      embeddedFor = embedded ? embeddedFor + dt : 0;
      if (embeddedFor > EMBEDDED_LIFT_S) {
        embeddedFor = 0;
        walker.stop();
        controller.teleport(nearestUsableSpot([p.x, p.y, p.z], solid, liquid, data.bounds, data.world.height, 6) ?? rescue.spot() ?? rescueFallback());
        rescue.reset();
      }
      const isPlayerMoving = controller.speed > 0.1 || Math.hypot(intent.dirX, intent.dirZ) > 0.1;
      const objectState = objectInteractions.update(dt, controller, isPlayerMoving);
      playerBubble.update(dt);
      playerBubble.sprite.position.set(objectState.bubblePos.x, objectState.bubblePos.y, objectState.bubblePos.z);

      if (carried) {
        character.root.position.copy(carried.feet);
        character.root.rotation.y = carried.facing;
        character.update(dt, carried.speed, true, carried.pose);
      } else {
        if (ambientActionTimer > 0) {
          ambientActionTimer -= dt;
          if (ambientActionTimer <= 0) currentAmbientAction = null;
        }
        const effectiveAction = objectState.action ?? currentAmbientAction;
        // On a seat, a bed or the floor before a screen her body is drawn there; her controller waits beside it.
        const body = objectState.body;
        if (body) character.root.position.set(body.position[0], body.position[1], body.position[2]);
        else character.root.position.copy(controller.position);
        character.root.position.y += ride.liftWorld;
        character.root.rotation.y = body ? body.facing : controller.facing;
        // On a vehicle she stands calm (idle) or holds her seated pose while it carries her.
        const currentPose = ride.pose ?? objectState.poseOverride;
        const isBusy = ride.riding || objectState.poseOverride !== null || effectiveAction !== null;
        character.update(dt, isBusy ? 0 : controller.speed, body !== null || controller.onGround, currentPose, controller.inWater, effectiveAction);
        // Swinging, she tips with the seat.
        if (body) character.root.rotation.x += body.pitch;
        // Sitting down (or lying), the view turns to face her from the open ground she will stand up on: the
        // camera stays out of the chair, the bed, the swing's frame, and she is in view on them.
        if (body && !wasHeld) {
          const dx = controller.position.x - body.position[0];
          const dz = controller.position.z - body.position[2];
          if (Math.hypot(dx, dz) > 0.3) rig.yaw = Math.atan2(dx, dz);
        }
        wasHeld = body !== null;
        rig.update(dt, controller.position);
      }
      // Underwater overlay: toggle CSS class for the blue tint + bubble effect.
      dom.root.classList.toggle('swimming', controller.inWater && !carried);
      // With the camera inside Miu (nowhere left to back off to), hide her rather than show her insides.
      if (!reviewShot?.backdrop) character.root.visible = (carried !== null || rig.viewDistance > 0.9) && !reviewShot?.hidesPlayer;
      if (pet && petLife) {
        const p = controller.position;
        // Back from a long pause (a lesson, a screen): her pet greets her.
        if (this.backAfterPause) {
          this.backAfterPause = false;
          petLife.greet();
        }
        const body = objectState.body;
        if (body) {
          petSeat.x = body.position[0];
          petSeat.z = body.position[2];
          petSeat.lying = objectState.action === 'sleep' || objectState.action === 'lay';
        }
        petPlayer.x = p.x;
        petPlayer.y = p.y;
        petPlayer.z = p.z;
        petPlayer.facing = controller.facing;
        petPlayer.speed = controller.speed;
        petPlayer.seated = body ? petSeat : null;
        petPlayer.riding = carried !== null || ride.riding;
        petLife.update(dt, petPlayer);
        // The pet waits out a ride and catches up with her at the far stop.
        pet.root.visible = !carried && !reviewShot?.backdrop && !reviewShot?.hidesPlayer;
        petBubble.update(dt);
        petBubble.sprite.position.set(pet.root.position.x, pet.root.position.y + pet.anchors.height * pet.scale + 0.35, pet.root.position.z);
        // Her pet's scene in view: the camera turns to frame them both (unless she just dragged the view; slowly
        // with less motion asked for).
        if (petLife.viewYaw !== null && sinceLook > LOOK_HOLD_S && !carried) rig.follow(petLife.viewYaw, dt, reducedMotion ? PET_SCENE_FOLLOW / 3 : PET_SCENE_FOLLOW);
        overlay.stats.petClip = pet.clip;
        overlay.stats.petMood = petLife.mood;
        overlay.stats.petMotion = pet.motion;
        petAt[0] = pet.root.position.x;
        petAt[1] = pet.root.position.y;
        petAt[2] = pet.root.position.z;
        overlay.stats.petAt = petAt;
        sniffCheck -= dt;
        if (sniffCheck <= 0) {
          sniffCheck = 0.25;
          sniffable = sniffTargets.length > 0 && sniffPlaces().length > 0;
          store.emit({ type: 'pet-sniff', available: sniffable && !carried, wait: Math.ceil(petLife.sniffCooldown) });
        }
      }
      reviewShot?.apply(camera);
      sky.position.copy(camera.position);
      sun.position.set(controller.position.x + 18, controller.position.y + 30, controller.position.z + 12);
      sun.target.position.copy(controller.position);
      world.water.uTime.value += dt;
      // No occlusion fade: walls, roofs and trees always draw as they are.
      world.update(camera);
      props.update(camera.position);
      eventDecor.update(camera.position);

      for (const target of eventTargets) {
        const [tx, , tz] = target.def.position;
        target.setDrawn(Math.hypot(tx - controller.position.x, tz - controller.position.z) <= quality.viewDistance);
      }
      for (const target of targets) target.update(dt, controller.position, camera.position);
      arrow.update(dt, controller.position, hint?.available ? hint.def : null);
      const questPlace = hint?.available ? hint.def : null;
      minimap.update(dt, { x: controller.position.x, z: controller.position.z, facing: controller.facing }, questPlace ? { id: questPlace.id, label: questPlace.name, x: questPlace.position[0], z: questPlace.position[2] } : null);
      store.emit({ type: 'autowalk-available', available: hint?.available === true });
      overlay.stats.hintTarget = arrow.showing ? (hint?.def.id ?? null) : null;
      // While she is on a seat, a bed or before a screen, the only prompt is to get up.
      const held = objectInteractions.holding;
      const nearest = carried || held ? null : pickNearest(targets, controller.position);
      // Another player near (quest targets still win): the online menu.
      const nearPlayer = nearest || carried || held ? null : online.nearest(controller.position);
      // Quest targets always win the prompt; ambient life goes quiet next to them (and next to another player).
      const nearAmbient = nearest || nearPlayer || held ? null : life.nearest(controller.position);
      // Object interactions (furniture/props) activate when no quest target or ambient life is near
      // On a seat, a bed or before a screen, her prompt is that object's ("Đứng dậy"), whatever stands nearer.
      const nearObject = held ?? (nearest || nearAmbient || nearPlayer ? null : objectInteractions.nearest(controller.position));
      // A switch flipped or getting on and off changes the object's label: the prompt is sent again.
      const objectLabel = nearObject ? objectInteractions.toPrompt(nearObject).label : null;
      overlay.stats.nearObject = nearObject?.id ?? null;
      // Check pet companion proximity when child is near her faithful companion
      const petDist = pet && !carried ? Math.hypot(controller.position.x - pet.root.position.x, controller.position.z - pet.root.position.z) : Infinity;
      const nearPet = !nearest && !nearAmbient && !nearObject && !nearPlayer && petDist < 2.2 && petLife?.scene === null;
      // A still review shot gathers the nearest people and animals round what it looks at, not round the child.
      life.update(dt, reviewShot && !reviewShot.live ? reviewShot.target : controller.position, nearest !== null, { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
      online.update(dt, controller.position, camera);
      if (keepsHome) objectStates.setKeeping(online.visitingHost === null);
      // The others see her seated while she is on a seat, a bed or a swing (the protocol's poses: idle, walk, sit).
      const currentAction = ride.riding || objectState.body ? 'sit' : controller.speed > 0.1 && !currentAmbientAction ? 'walk' : 'idle';
      // Seated on something, the others see her where her body is (on the seat, swinging with it).
      const shown = objectState.body?.position ?? [controller.position.x, controller.position.y, controller.position.z];
      multiplayer.sendUpdate(
        shown[0],
        shown[1],
        shown[2],
        objectState.body?.facing ?? controller.facing,
        ride.riding || objectState.body || currentAmbientAction ? 0 : controller.speed,
        currentAction,
        ride.riding,
      );
      if (nearest !== promptTarget || nearAmbient !== promptAmbient || nearObject !== promptObject || objectLabel !== promptObjectLabel || nearPet !== promptPet || nearPlayer?.id !== promptPlayer?.id || nearPlayer?.name !== promptPlayer?.name) {
        promptTarget = nearest;
        promptAmbient = nearAmbient;
        promptObject = nearObject;
        promptObjectLabel = objectLabel;
        promptPet = nearPet;
        promptPlayer = nearPlayer;
        const def = nearest?.def;
        const prompt = def
          ? { targetId: def.id, kind: def.kind, name: def.name, label: def.label }
          : nearPlayer
            ? { targetId: `player:${nearPlayer.id}`, kind: 'player' as const, name: nearPlayer.isBot ? `🤖 [${translate('online.botLabel')}] ${nearPlayer.name}` : nearPlayer.name, label: translate('online.interact') }
            : nearAmbient
            ? { targetId: nearAmbient.id, kind: 'ambient' as const, name: nearAmbient.name, label: nearAmbient.label }
            : nearObject
              ? objectInteractions.toPrompt(nearObject)
              : nearPet
                ? { targetId: 'pet-companion', kind: 'ambient' as const, name: petName, label: translate('pet.prompt') }
                : null;
        store.emit({ type: 'interaction-prompt', prompt });
      }
      const anchorAt = promptTarget
        ? promptTarget.screenAnchor(camera, { width: window.innerWidth, height: window.innerHeight })
        : promptPlayer
          ? online.remote.screenAnchor(promptPlayer.id, camera, { width: window.innerWidth, height: window.innerHeight })
          : promptAmbient
          ? life.screenAnchor(promptAmbient, camera, { width: window.innerWidth, height: window.innerHeight })
          : promptObject
            ? objectInteractions.screenAnchor(promptObject, camera, { width: window.innerWidth, height: window.innerHeight })
            : promptPet && pet
              ? {
                  x: ((new Vector3(pet.root.position.x, pet.root.position.y + 0.8, pet.root.position.z).project(camera).x + 1) / 2) * window.innerWidth,
                  y: ((1 - new Vector3(pet.root.position.x, pet.root.position.y + 0.8, pet.root.position.z).project(camera).y) / 2) * window.innerHeight,
                }
              : null;
      if (anchorAt) {
        const anchor = store.getPromptAnchor();
        if (anchor) {
          anchor.style.transform = `translate(-50%, -100%) translate(${anchorAt.x}px, ${anchorAt.y}px)`;
          anchor.style.visibility = 'visible'; // hidden until first positioned: no flash at 0,0
        }
      }
      if (interact && promptTarget?.def.ride) {
        // A ride across the map: the journey to the far stop (ride/ride-journey.ts), one at a time. A walk to the
        // quest's place ends here, and she gets off her own vehicle to board.
        if (journey.start(promptTarget, controller.position, controller.facing)) {
          objectInteractions.cancel();
          walker.stop();
          ride.dismount();
          ride.update(0);
        }
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptTarget?.def.travel) {
        objectInteractions.cancel();
        online.travelled(promptTarget.def.travel);
        store.emit({ type: 'travel', region: promptTarget.def.travel });
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptTarget) {
        store.emit({ type: 'interaction', targetId: promptTarget.def.id });
        overlay.stats.lastInteraction = promptTarget.def.id;
      } else if (interact && promptPlayer) {
        online.openMenu(promptPlayer);
      } else if (interact && promptAmbient) {
        life.react(promptAmbient.id);
        const isAnimal = promptAmbient.label === 'Vuốt ve';
        ambientActionTimer = 2.2;
        currentAmbientAction = isAnimal ? 'pet' : 'wave';
        const lines = isAnimal ? ANIMAL_PET_LINES : GREET_LINES;
        playerBubble.show(lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '');
        if (multiplayer) multiplayer.sendEmote('cheer');
      } else if (interact && promptPet && petLife) {
        // Its care screen opens; it wriggles under her hand meanwhile.
        petLife.touched();
        ambientActionTimer = 1.6;
        currentAmbientAction = 'pet';
        store.emit({ type: 'interaction', targetId: 'pet-care' });
      } else if (interact && promptObject) {
        objectInteractions.interact(promptObject, controller, multiplayer);
        overlay.stats.lastObject = promptObject.def.id;
        // Tucking her pet in at its bed: it comes and naps there.
        if (promptObject.def.id === 'pet-bed-nap') petLife?.care('nap');
        if (promptObject.def.id.includes('stove') || promptObject.def.id.includes('kitchen') || promptObject.def.id.includes('bep')) {
          store.emit({ type: 'interaction', targetId: 'cooking' });
        }
      }
      // A finished quest: everyone around cheers; confetti unless the child asked for less motion.
      if (celebrateRequested) {
        celebrateRequested = false;
        life.celebrate(controller.position);
        petLife?.celebrate();
        multiplayer.sendEmote('cheer');
        if (!reducedMotion) confetti.burst(controller.position);
      }
      confetti.update(dt);
      portalSparks.update(dt);
      objectEffects.update(dt, controller.position, renderer.getDrawingBufferSize(drawingBuffer).y / (2 * Math.tan((camera.fov * Math.PI) / 360)));
      // The interactions' own figures, for the tests and the developer overlay only.
      if (objectStatsOn) {
        overlay.stats.objects = objectsStats(objectInteractions, objectEffects.stats(), objectState.body);
        overlay.stats.pose = character.poseSample();
        overlay.stats.embedded = isEmbedded([controller.position.x, controller.position.y, controller.position.z], solid);
      }
      // `?event=` (review/E2E switch): that surprise right away, once.
      if (surprise.success && events.played === 0 && !events.active) events.start(surprise.data, controller.position);
      events.update(dt, controller.position, nearest !== null);
      overlay.stats.worldEvent = events.active;
      // The characters' everyday lines follow the weather: tell React when a shower starts or ends.
      const raining = events.active === 'rain-rainbow';
      if (raining !== wasRaining) {
        wasRaining = raining;
        store.emit({ type: 'weather', raining });
      }
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
      overlay.stats.journey = journey.state;
      overlay.stats.patches = world.patchCount();
      overlay.stats.nearTarget = promptTarget?.def.id ?? null;
      overlay.stats.cameraYaw = rig.yaw;
      overlay.stats.cameraInsideBlock = solid(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));

      // While the full map covers the screen nothing of the 3D view shows: no GPU time spent on it.
      if (!minimap.covering) renderer.render(scene, camera);
      overlay.frame(dt, renderer);
      reviewShot?.frameDone();
      if (firstFrame) {
        firstFrame = false;
        // She arrives on the map: her pet comes running to greet her (not in review shots, which stay still).
        if (!reviewShot) petLife?.greet();
        overlay.stats.loadMs = Math.round(performance.now());
        lap('ready');
        overlay.stats.firstAreaBytes = downloadedBytes();
        overlay.stats.ready = true;
        store.emit({ type: 'ready' });
      }
    };
    this.runLoop();
  }
}
