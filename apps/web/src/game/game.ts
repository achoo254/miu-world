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
  WebGLRenderer,
} from 'three';
import { blockLookup } from '@miu/voxel/block-table';
import type { SolidAt } from '@miu/voxel/grid-collision';
import type { GameStore } from '../game-bridge/game-store';
import { AssetRegistry, GuardedGltfLoader } from './asset-loader';
import { createReviewShot } from './debug/review-shots';
import { StatsOverlay } from './debug/stats-overlay';
import { loadInteractables, pickNearest, type InteractableObject } from './entities/interactables';
import { loadPlayerCharacter } from './entities/player-character';
import { loadProps } from './entities/props';
import { Autopilot } from './player/autopilot';
import { CameraRig } from './player/camera-rig';
import { PlayerInput } from './player/input';
import { PlayerController, type MoveIntent } from './player/player-controller';
import { readQuality } from './quality';
import { disposeSceneGraph } from './scene/dispose-scene';
import { SKY_HORIZON, createSky } from './scene/sky';
import { loadWorldData } from './world/world-data';
import { createWorldRenderer } from './world/world-renderer';
import './game.css';

const MAP_ID = 'forest-ch1';

/** Boot steps reported as `loading-progress`: renderer, asset registry, map data, world mesh, models. */
const LOADING_STEPS = 5;

export interface GameOptions {
  store: GameStore;
  /** Query string with dev/review switches: quality, autopilot, spawnAt (`npc` or a target id), shot, outfit. */
  search: string;
  /** Equipped accessory ids (`id` or `id:variant`), normally from `GET /api/character`. */
  outfit: string[];
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
  const button = (id: string, text: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.textContent = text;
    b.dataset.id = `game-${id}`;
    return b;
  };
  const run = button('btn-run', 'Chạy');
  const jump = button('btn-jump', 'Nhảy');
  actions.append(run, jump);
  root.append(stats, joystick, actions);
  host.append(root);
  return { root, stats, joystick, run, jump };
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
  }

  /** Restarts rendering after `stop()`. No-op before the first frame is ready, after dispose, or once the context is lost. */
  resume(): void {
    this.paused = false;
    this.runLoop();
  }

  private runLoop(): void {
    if (this.paused || this.disposed || this.contextLost || !this.renderer || !this.loop) return;
    // The paused time must not reach the next frame as one long step.
    this.timer?.reset();
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
    store.emit({ type: 'loading-progress', done: 0, total: LOADING_STEPS });
    const params = new URLSearchParams(search);
    const quality = readQuality(search);
    const dom = buildDom(this.host);
    this.cleanups.push(() => dom.root.remove());
    const overlay = new StatsOverlay(dom.stats, quality.level);
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
    scene.fog = new Fog(SKY_HORIZON, quality.viewDistance * 0.75, quality.viewDistance);
    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, quality.viewDistance + 40);
    const sky = createSky(quality.viewDistance + 20);
    scene.add(sky);
    scene.add(new HemisphereLight('#ffffff', '#8fa37a', 1.9));
    const sun = new DirectionalLight('#fff6e0', 1.7);
    sun.castShadow = quality.shadows;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
    scene.add(sun, sun.target);

    const registry = await AssetRegistry.load();
    stepLoaded();
    const loader = new GuardedGltfLoader(registry);
    const data = await loadWorldData(registry, MAP_ID);
    if (this.disposed) return;
    stepLoaded();
    const world = await createWorldRenderer(data);
    if (this.disposed) return;
    stepLoaded();
    world.setViewDistance(quality.viewDistance);
    world.group.traverse((o) => (o.receiveShadow = quality.shadows));
    scene.add(world.group);

    const blocks = blockLookup(data.atlas.blocks);
    const [sx, , sz] = data.world.size;
    const solid: SolidAt = (x, y, z) => {
      if (x < 0 || z < 0 || x >= sx || z >= sz || y < 0) return true; // invisible walls at the map edge
      return blocks(data.world.get(x, y, z))?.solid ?? false;
    };

    const outfitParam = params.get('outfit');
    const outfit = outfitParam === 'none' ? [] : outfitParam ? outfitParam.split(',') : this.options.outfit;
    const [character, targets, props] = await Promise.all([
      loadPlayerCharacter(loader, outfit),
      loadInteractables(loader, data.entities, quality.shadows),
      loadProps(loader, data.entities, quality.shadows),
    ]);
    if (this.disposed) return;
    stepLoaded();
    scene.add(character.root, props, ...targets.map((t) => t.root));
    overlay.stats.outfit = character.outfit;

    const controller = new PlayerController(solid, data.entities.spawn.position, data.entities.spawn.yaw);
    // Dev/E2E switch: start next to a target (`npc` = the first NPC) instead of the spawn point.
    const spawnAt = params.get('spawnAt');
    const spawnTarget = data.entities.interactables.find((t) => (spawnAt === 'npc' ? t.kind === 'npc' : t.id === spawnAt));
    if (spawnTarget) {
      const [x, y, z] = spawnTarget.position;
      const offset = Math.min(1.5, spawnTarget.radius * 0.5);
      controller.position.set(x - offset, y, z - offset);
    }
    const rig = new CameraRig(camera, solid, controller.facing + Math.PI);
    const input = new PlayerInput(dom.root, dom.joystick, dom.run, dom.jump);
    this.cleanups.push(() => input.dispose());
    const autopilot = params.get('autopilot') === '1' ? new Autopilot(data.entities) : null;

    const onResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));

    const reviewShot = createReviewShot(params.get('shot'), data.entities, scene);
    if (reviewShot) {
      world.setViewDistance(Infinity);
      sky.scale.setScalar(3);
      for (const el of [dom.stats, dom.joystick, dom.run.parentElement]) if (el) el.hidden = true;
      if (reviewShot.backdrop) {
        sky.visible = false;
        character.root.visible = false;
        renderer.setClearColor(0x000000, 0);
      }
    }

    // Interaction prompt: React renders the label; the game reports which target is near (discrete)
    // and moves the anchor React registered (per frame, no React render).
    let promptTarget: InteractableObject | null = null;
    let interactRequested = false;
    const byId = new Map(targets.map((t) => [t.def.id, t]));
    this.cleanups.push(
      store.onCommand((command) => {
        if (command.type === 'interact') interactRequested = true;
        // Server-backed target states; a target missing from the map returns to its initial look.
        if (command.type === 'set-world-state') for (const [id, target] of byId) target.setState(command.state[id]);
      }),
    );
    this.cleanups.push(() => store.emit({ type: 'interaction-prompt', prompt: null }));

    overlay.stats.meshMs = Math.round(world.meshMs);
    overlay.stats.worker = world.usedWorker;
    const timer = new Timer();
    timer.connect(document);
    this.timer = timer;
    this.cleanups.push(() => timer.dispose());
    let firstFrame = true;

    this.loop = () => {
      timer.update();
      // Review screenshots step a fixed 1/60 s, then freeze once ready: the capture lands a variable number of
      // frames later, and water / NPC animation must not move in between.
      const dt = reviewShot ? (reviewShot.settled ? 0 : 1 / 60) : Math.min(timer.getDelta(), 0.1);
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
        const { right, forward } = rig.basis();
        intent = {
          dirX: right[0] * state.moveX + forward[0] * state.moveY,
          dirZ: right[1] * state.moveX + forward[1] * state.moveY,
          run: state.run,
          jump: state.jump,
        };
      }
      controller.update(dt, intent);
      character.root.position.copy(controller.position);
      character.root.rotation.y = controller.facing;
      character.update(dt, controller.speed, controller.onGround);
      rig.update(dt, controller.position);
      reviewShot?.apply(camera);
      sky.position.copy(camera.position);
      sun.position.set(controller.position.x + 18, controller.position.y + 30, controller.position.z + 12);
      sun.target.position.copy(controller.position);
      world.water.uTime.value += dt;
      world.update(camera);

      for (const target of targets) target.update(dt);
      const nearest = pickNearest(targets, controller.position);
      if (nearest !== promptTarget) {
        promptTarget = nearest;
        const def = nearest?.def;
        store.emit({ type: 'interaction-prompt', prompt: def ? { targetId: def.id, kind: def.kind, name: def.name, label: def.label } : null });
      }
      if (promptTarget) {
        const anchor = store.getPromptAnchor();
        if (anchor) {
          const { x, y } = promptTarget.screenAnchor(camera, { width: window.innerWidth, height: window.innerHeight });
          anchor.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
          anchor.style.visibility = 'visible'; // hidden until first positioned: no flash at 0,0
        }
        if (interact) {
          store.emit({ type: 'interaction', targetId: promptTarget.def.id });
          overlay.stats.lastInteraction = promptTarget.def.id;
        }
      }
      overlay.stats.player = [controller.position.x, controller.position.y, controller.position.z];
      overlay.stats.onGround = controller.onGround;
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
