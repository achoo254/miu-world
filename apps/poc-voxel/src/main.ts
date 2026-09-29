// POC entry: Khu rừng bí mật (chapter 1) with Miu, the parrot NPC and props — only manifest assets.
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
import { AssetRegistry, GuardedGltfLoader } from './asset-loader';
import { createReviewShot } from './debug/review-shots';
import { StatsOverlay } from './debug/stats-overlay';
import { loadNpcs } from './entities/npc';
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
import './fonts.css';
import './styles.css';

const MAP_ID = 'forest-ch1';
const DEFAULT_OUTFIT = ['hat-witch-pink', 'backpack-brown'];

function element(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el;
}

/** Bytes downloaded so far (compressed transfer size, falling back to body size for cache hits). */
function downloadedBytes(): number {
  return performance
    .getEntriesByType('resource')
    .concat(performance.getEntriesByType('navigation'))
    .reduce((sum, e) => sum + ((e as PerformanceResourceTiming).transferSize || (e as PerformanceResourceTiming).encodedBodySize || 0), 0);
}

async function start(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const quality = readQuality(window.location.search);
  const app = element('app');
  const overlay = new StatsOverlay(element('stats'), quality.level);

  const renderer = new WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = PCFShadowMap;
  app.prepend(renderer.domElement);

  const scene = new Scene();
  scene.fog = new Fog(SKY_HORIZON, quality.viewDistance * 0.55, quality.viewDistance);
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
  const world = await createWorldRenderer(data);
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
  const outfit = outfitParam === 'none' ? [] : outfitParam ? outfitParam.split(',') : DEFAULT_OUTFIT;
  const [character, npcs, props] = await Promise.all([
    loadPlayerCharacter(loader, outfit),
    loadNpcs(loader, data.entities, element('labels')),
    loadProps(loader, data.entities, quality.shadows),
  ]);
  scene.add(character.root, props, ...npcs.map((n) => n.root));

  const controller = new PlayerController(solid, data.entities.spawn.position, data.entities.spawn.yaw);
  const firstNpc = data.entities.npcs[0];
  if (params.get('spawnAt') === 'npc' && firstNpc) {
    controller.position.set(firstNpc.position[0] - 1.5, firstNpc.position[1], firstNpc.position[2] - 1.5);
  }
  const rig = new CameraRig(camera, solid, controller.facing + Math.PI);
  const input = new PlayerInput(app, element('joystick'), element('btn-run'), element('btn-jump'));
  const autopilot = params.get('autopilot') === '1' ? new Autopilot(data.entities) : null;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const reviewShot = createReviewShot(params.get('shot'), data.entities, scene);
  if (reviewShot) {
    world.setViewDistance(Infinity);
    sky.scale.setScalar(3);
    for (const id of ['stats', 'joystick', 'actions']) element(id).hidden = true;
  }

  overlay.stats.meshMs = Math.round(world.meshMs);
  overlay.stats.worker = world.usedWorker;
  const timer = new Timer();
  timer.connect(document);
  let firstFrame = true;

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    let intent: MoveIntent;
    if (autopilot) {
      intent = autopilot.intent(dt, controller.position);
      rig.follow(controller.facing, dt);
    } else {
      const state = input.read();
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
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    for (const npc of npcs) npc.update(dt, controller.position, camera, viewport);
    overlay.stats.player = [controller.position.x, controller.position.y, controller.position.z];
    overlay.stats.onGround = controller.onGround;
    overlay.stats.nearNpc = npcs.some((n) => n.playerNearby);
    overlay.stats.cameraYaw = rig.yaw;

    renderer.render(scene, camera);
    overlay.frame(dt, renderer);
    reviewShot?.frameDone();
    if (firstFrame) {
      firstFrame = false;
      overlay.stats.loadMs = Math.round(performance.now());
      overlay.stats.firstAreaBytes = downloadedBytes();
      overlay.stats.ready = true;
      element('loading').hidden = true;
    }
  });
}

start().catch((err: unknown) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = `Lỗi tải: ${err instanceof Error ? err.message : String(err)}`;
});
