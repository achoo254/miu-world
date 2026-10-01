// Headless render target for tools/assets/render-preview.ts (no account needed: tooling only).
// Map shots: ?shot=top|iso|bridge|tree|npc|view:…&quality=…&region=… runs the game with a fixed review camera.
// Model shots: ?model=<manifest path>&anim=<clip>&t=<seconds>&yaw=<deg>&pitch=<deg>&size=<px>
//        &acc=<id[:variant],id[:variant]>&accScale=<node:scale,...>&bg=<css colour | transparent>
// Sets document.body.dataset.ready = '1' once the frame is drawn (or data-error on failure).
import {
  AnimationMixer,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { createGameStore } from '../game-bridge/game-store';
import { AssetRegistry, GuardedGltfLoader } from '../game/asset-loader';
import { dressCharacter } from '../game/character/character-accessories';
import { Game } from '../game/game';
import '../ui/styles.css';
import { renderWorldOverview } from './world-overview-shot';

const params = new URLSearchParams(window.location.search);
const size = Number(params.get('size') ?? 512);

async function render(): Promise<void> {
  const registry = await AssetRegistry.load();
  const loader = new GuardedGltfLoader(registry);
  // `bg=transparent`: an icon for the UI, cut out on its own (body and page stay see-through too).
  const transparent = params.get('bg') === 'transparent';
  if (transparent) for (const el of [document.documentElement, document.body]) el.style.background = 'transparent';
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: transparent });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = transparent ? null : new Color(params.get('bg') ?? '#eaf3ff');
  scene.add(new HemisphereLight('#ffffff', '#b9c6d8', 2.2));
  const sun = new DirectionalLight('#ffffff', 1.6);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  const modelPath = params.get('model');
  if (!modelPath) throw new Error('missing ?model=');
  const gltf = await loader.load(modelPath);
  const model: Object3D = gltf.scene;
  scene.add(model);
  const accScale = new Map(
    (params.get('accScale') ?? '')
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const [node = '', value = '1'] = pair.split(':');
        return [node, Number(value)] as const;
      }),
  );
  const worn = dressCharacter(model, (params.get('acc') ?? '').split(',').filter(Boolean), (node) => accScale.get(node) ?? 1, false);
  const [failed] = worn.skipped;
  if (failed) throw failed.error instanceof Error ? failed.error : new Error(`accessory ${failed.entry}`);

  const clipName = params.get('anim');
  if (clipName) {
    const clip = gltf.animations.find((a) => a.name === clipName);
    if (!clip) throw new Error(`clip ${clipName} not found`);
    const mixer = new AnimationMixer(model);
    mixer.clipAction(clip).play();
    mixer.setTime(Number(params.get('t') ?? 0));
  }
  model.updateMatrixWorld(true);

  // Frame the posed model (skinned bounds) so raised arms or jumps stay in view.
  const box = new Box3().setFromObject(model, true);
  const center = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const camera = new PerspectiveCamera(30, 1, 0.01, 100);
  const yaw = (Number(params.get('yaw') ?? 30) * Math.PI) / 180;
  const pitch = (Number(params.get('pitch') ?? 12) * Math.PI) / 180;
  const distance = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.1;
  camera.position.set(
    center.x + distance * Math.sin(yaw) * Math.cos(pitch),
    center.y + distance * Math.sin(pitch),
    center.z + distance * Math.cos(yaw) * Math.cos(pitch),
  );
  camera.lookAt(center);
  renderer.render(scene, camera);
  document.body.dataset.ready = '1';
}

/** Map review shots run the real game (no React, no account) under a fixed camera. */
function renderMapShot(): void {
  // The Home island is layered over the UI sky: nothing behind the canvas may show through.
  if (params.get('shot') === 'island') for (const el of [document.documentElement, document.body]) el.style.background = 'transparent';
  const store = createGameStore();
  store.subscribe(() => {
    const error = store.getSnapshot().error;
    if (error) document.body.dataset.error = error.message;
  });
  // `region` picks the map, as on /play (the forest when left out).
  const region = params.get('region') ?? undefined;
  void new Game(document.body, { store, search: window.location.search, outfit: ['hat-witch-pink', 'backpack-brown'], region }).start();
}

const worldMap = params.get('world');
const run = worldMap ? () => renderWorldOverview(worldMap) : params.get('shot') ? async () => renderMapShot() : render;
run().catch((err: unknown) => {
  document.body.dataset.error = err instanceof Error ? err.message : String(err);
  console.error(err);
});
