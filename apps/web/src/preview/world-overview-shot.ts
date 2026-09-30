// Headless render of the world overview (`preview.html?world=the-gioi`) for `pnpm assets:home`: the
// generated map's blocks and props under the game's light, from the shared overview camera, on a
// transparent canvas so the UI sky shows behind it. No player, no game loop.
import { DirectionalLight, HemisphereLight, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { WORLD_OVERVIEW_CAMERA, WORLD_OVERVIEW_IMAGE } from '@miu/voxel/world-overview';
import { AssetRegistry, GuardedGltfLoader } from '../game/asset-loader';
import { loadProps } from '../game/entities/props';
import { loadWorldData } from '../game/world/world-data';
import { createWorldRenderer } from '../game/world/world-renderer';

export async function renderWorldOverview(mapId: string): Promise<void> {
  for (const el of [document.documentElement, document.body]) el.style.background = 'transparent';
  const { width, height } = WORLD_OVERVIEW_IMAGE;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  const registry = await AssetRegistry.load();
  const data = await loadWorldData(registry, mapId);
  const world = await createWorldRenderer(data);
  world.group.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  const props = await loadProps(new GuardedGltfLoader(registry), data.entities, true);

  // Same light as the game (game.ts), with the sun over the whole map instead of over the player.
  const scene = new Scene();
  scene.add(new HemisphereLight('#ffffff', '#8fa37a', 1.9));
  const [sx, sy, sz] = data.world.size;
  const sun = new DirectionalLight('#fff6e0', 1.7);
  sun.position.set(sx / 2 + 54, sy + 60, sz / 2 + 36);
  sun.target.position.set(sx / 2, 0, sz / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 320 });
  scene.add(sun, sun.target, world.group, props);

  const { eye, target, fov } = WORLD_OVERVIEW_CAMERA;
  const camera = new PerspectiveCamera(fov, width / height, 1, 600);
  camera.position.set(...eye);
  camera.lookAt(...target);
  world.update(camera);
  renderer.render(scene, camera);
  document.body.dataset.ready = '1';
}
