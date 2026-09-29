// Headless render target for tools/assets/render-preview.ts.
// Query: ?model=<manifest path>&anim=<clip>&t=<seconds>&yaw=<deg>&pitch=<deg>&size=<px>
//        &acc=<id[:variant],id[:variant]>
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
import { AssetRegistry, GuardedGltfLoader } from '../asset-loader';
import { attachAccessory, createAccessoryMesh } from '../character/character-accessories';
import { getAccessory } from '../content/accessories';

const params = new URLSearchParams(window.location.search);
const size = Number(params.get('size') ?? 512);

async function render(): Promise<void> {
  const registry = await AssetRegistry.load();
  const loader = new GuardedGltfLoader(registry);
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(params.get('bg') ?? '#eaf3ff');
  scene.add(new HemisphereLight('#ffffff', '#b9c6d8', 2.2));
  const sun = new DirectionalLight('#ffffff', 1.6);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  const modelPath = params.get('model');
  if (!modelPath) throw new Error('missing ?model=');
  const gltf = await loader.load(modelPath);
  const model: Object3D = gltf.scene;
  scene.add(model);
  for (const entry of (params.get('acc') ?? '').split(',').filter(Boolean)) {
    const [id = '', variant] = entry.split(':');
    const def = getAccessory(id);
    attachAccessory(model, def, createAccessoryMesh(def, variant));
  }

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

render().catch((err: unknown) => {
  document.body.dataset.error = err instanceof Error ? err.message : String(err);
  console.error(err);
});
