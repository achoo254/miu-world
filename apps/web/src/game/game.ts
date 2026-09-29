// Khu rừng bí mật (chapter 1): Miu, the parrot NPC and props — only manifest assets.
// The game owns its canvas, loop and touch controls; it talks to React only through the
// game-bridge store (discrete events), never through React state.
import {
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  Timer,
  WebGLRenderer,
  type Material,
} from 'three';
import { blockLookup } from '@miu/voxel/block-table';
import type { SolidAt } from '@miu/voxel/grid-collision';
import type { GameStore } from '../game-bridge/game-store';
import { AssetRegistry, GuardedGltfLoader } from './asset-loader';
import { createReviewShot } from './debug/review-shots';
import { StatsOverlay } from './debug/stats-overlay';
import { loadNpcs, type Npc } from './entities/npc';
import { loadPlayerCharacter } from './entities/player-character';
import { loadProps } from './entities/props';
import { Autopilot } from './player/autopilot';
import { CameraRig } from './player/camera-rig';
import { PlayerInput } from './player/input';
import { PlayerController, type MoveIntent } from './player/player-controller';
import { readQuality } from './quality';
import { SKY_HORIZON, createSky } from './scene/sky';
import { loadWorldData } from './world/world-data';
import { createWorldRenderer } from './world/world-renderer';
import './game.css';

const MAP_ID = 'forest-ch1';

export interface GameOptions {
  store: GameStore;
  /** Query string with dev/review switches: quality, autopilot, spawnAt, shot, outfit. */
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
  const loading = div('loading', 'loading');
  loading.textContent = 'Đang tải Khu rừng bí mật…';
  root.append(stats, joystick, actions, loading);
  host.append(root);
  return { root, stats, joystick, run, jump, loading };
}

export class Game {
  private disposed = false;
  private started = false;
  private readonly cleanups: Array<() => void> = [];
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;

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
      this.options.store.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  /**
   * Pauses rendering (e.g. while a full-screen menu is open, Master Plan §12). Resuming is not wired
   * yet: the first full-screen menu (SLICE) adds `resume()` next to this.
   */
  stop(): void {
    this.renderer?.setAnimationLoop(null);
  }

  /** Frees GPU memory (geometry, materials, textures, context), listeners and DOM. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer?.setAnimationLoop(null);
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    const textures = new Set<Texture>();
    this.scene?.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry.dispose();
      const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        material.dispose();
      }
    });
    for (const texture of textures) texture.dispose();
    this.scene = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }

  private async boot(): Promise<void> {
    const { store, search } = this.options;
    const params = new URLSearchParams(search);
    const quality = readQuality(search);
    const dom = buildDom(this.host);
    this.cleanups.push(() => dom.root.remove());
    const overlay = new StatsOverlay(dom.stats, quality.level);
    this.cleanups.push(() => overlay.detach());

    const renderer = new WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = PCFShadowMap;
    dom.root.prepend(renderer.domElement);

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
    const loader = new GuardedGltfLoader(registry);
    const data = await loadWorldData(registry, MAP_ID);
    if (this.disposed) return;
    const world = await createWorldRenderer(data);
    if (this.disposed) return;
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
    const [character, npcs, props] = await Promise.all([
      loadPlayerCharacter(loader, outfit),
      loadNpcs(loader, data.entities),
      loadProps(loader, data.entities, quality.shadows),
    ]);
    if (this.disposed) return;
    scene.add(character.root, props, ...npcs.map((n) => n.root));
    overlay.stats.outfit = character.outfit;

    const controller = new PlayerController(solid, data.entities.spawn.position, data.entities.spawn.yaw);
    const firstNpc = data.entities.npcs[0];
    if (params.get('spawnAt') === 'npc' && firstNpc) {
      controller.position.set(firstNpc.position[0] - 1.5, firstNpc.position[1], firstNpc.position[2] - 1.5);
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
    }

    // Interaction prompt: React renders the label; the game reports which NPC is near (discrete)
    // and moves the anchor React registered (per frame, no React render).
    let promptNpc: Npc | null = null;
    let interactRequested = false;
    this.cleanups.push(store.onCommand((command) => (interactRequested ||= command.type === 'interact')));
    this.cleanups.push(() => store.emit({ type: 'interaction-prompt', prompt: null }));

    overlay.stats.meshMs = Math.round(world.meshMs);
    overlay.stats.worker = world.usedWorker;
    const timer = new Timer();
    timer.connect(document);
    this.cleanups.push(() => timer.dispose());
    let firstFrame = true;

    renderer.setAnimationLoop(() => {
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

      let nearest: Npc | null = null;
      let nearestDistance = Infinity;
      for (const npc of npcs) {
        npc.update(dt, controller.position);
        const distance = npc.root.position.distanceTo(controller.position);
        if (npc.playerNearby && distance < nearestDistance) {
          nearest = npc;
          nearestDistance = distance;
        }
      }
      if (nearest !== promptNpc) {
        promptNpc = nearest;
        store.emit({ type: 'interaction-prompt', prompt: nearest ? { npcId: nearest.id, name: nearest.name, label: nearest.label } : null });
      }
      if (promptNpc) {
        const anchor = store.getPromptAnchor();
        if (anchor) {
          const { x, y } = promptNpc.screenAnchor(camera, { width: window.innerWidth, height: window.innerHeight });
          anchor.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
          anchor.style.visibility = 'visible'; // hidden until first positioned: no flash at 0,0
        }
        if (interact) store.emit({ type: 'interaction', npcId: promptNpc.id });
      }
      overlay.stats.player = [controller.position.x, controller.position.y, controller.position.z];
      overlay.stats.onGround = controller.onGround;
      overlay.stats.nearNpc = promptNpc !== null;
      overlay.stats.cameraYaw = rig.yaw;

      renderer.render(scene, camera);
      overlay.frame(dt, renderer);
      reviewShot?.frameDone();
      if (firstFrame) {
        firstFrame = false;
        overlay.stats.loadMs = Math.round(performance.now());
        overlay.stats.firstAreaBytes = downloadedBytes();
        overlay.stats.ready = true;
        dom.loading.hidden = true;
        store.emit({ type: 'ready' });
      }
    });
  }
}
