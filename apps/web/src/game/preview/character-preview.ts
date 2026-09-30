// Character Creator preview (M1.3): a small scene with Miu alone, turned by dragging, playing one of
// four emotes on request. Outfit changes arrive as the bridge command `set-outfit` and swap the
// accessories in place (no remount, no second canvas). Like `Game`, it never imports React.
import {
  AnimationMixer,
  Box3,
  DirectionalLight,
  HemisphereLight,
  LoopOnce,
  PerspectiveCamera,
  Scene,
  SkinnedMesh,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
  type Object3D,
} from 'three';
import type { GameStore } from '../../game-bridge/game-store';
import { AssetRegistry, GuardedGltfLoader } from '../asset-loader';
import { dressCharacter, undressCharacter, type WornOutfit } from '../character/character-accessories';
import { CHARACTER_MODEL, accessoryScaleFor } from '../entities/player-character';
import { disposeSceneGraph } from '../scene/dispose-scene';

export const EMOTES = ['wave', 'jump', 'yawn', 'cheer'] as const;
export type Emote = (typeof EMOTES)[number];

/** Debug handle for E2E (like `window.__miuStats` for the game). */
export interface MiuPreviewStats {
  ready: boolean;
  outfit: string[];
  emote: Emote | null;
  yaw: number;
}

declare global {
  interface Window {
    __miuPreview?: MiuPreviewStats;
  }
}

const DRAG_SPEED = 0.01;
const START_YAW = 0.5;

export interface CharacterPreviewOptions {
  store: GameStore;
  /** Items worn when the preview opens. */
  outfit: readonly string[];
}

export class CharacterPreview {
  private disposed = false;
  private started = false;
  private readonly cleanups: Array<() => void> = [];
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private playEmoteNow: ((emote: Emote) => void) | null = null;
  readonly stats: MiuPreviewStats = { ready: false, outfit: [], emote: null, yaw: START_YAW };

  constructor(
    private readonly host: HTMLElement,
    private readonly options: CharacterPreviewOptions,
  ) {}

  /** Idempotent: a second call (React StrictMode re-mount) is ignored. */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;
    window.__miuPreview = this.stats;
    try {
      await this.boot();
    } catch (err) {
      if (this.disposed) return;
      console.error(err);
      this.options.store.emit({ type: 'error', code: 'load-failed', message: err instanceof Error ? err.message : String(err) });
    }
  }

  /** Plays one emote, then returns to idle. Ignored until the model is loaded. */
  playEmote(emote: Emote): void {
    this.playEmoteNow?.(emote);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer?.setAnimationLoop(null);
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    if (this.scene) disposeSceneGraph(this.scene);
    this.scene = null;
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
    if (window.__miuPreview === this.stats) delete window.__miuPreview;
  }

  private async boot(): Promise<void> {
    const { store } = this.options;
    // Listen before loading: a choice made while the model downloads is worn as soon as it is ready.
    let latestOutfit: readonly string[] = this.options.outfit;
    let wearNow: ((entries: readonly string[]) => void) | null = null;
    this.cleanups.push(
      store.onCommand((command) => {
        if (command.type !== 'set-outfit') return;
        latestOutfit = command.equipped;
        wearNow?.(command.equipped);
      }),
    );
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.dataset.id = 'creator-preview-canvas';
    renderer.domElement.style.touchAction = 'none';
    this.host.append(renderer.domElement);

    const scene = new Scene();
    this.scene = scene;
    scene.add(new HemisphereLight('#ffffff', '#b9c6d8', 2.2));
    const sun = new DirectionalLight('#ffffff', 1.6);
    sun.position.set(3, 6, 5);
    scene.add(sun);

    const registry = await AssetRegistry.load();
    const gltf = await new GuardedGltfLoader(registry).load(CHARACTER_MODEL);
    if (this.disposed) return;
    const model: Object3D = gltf.scene;
    model.traverse((o) => (o.frustumCulled = false)); // skinned bounds lag the animated pose
    model.rotation.y = START_YAW;
    scene.add(model);

    // Frame the bind pose with room above the head for hats and jumps.
    const box = new Box3().setFromObject(model);
    const center = box.getCenter(new Vector3());
    const height = box.max.y - box.min.y;
    const camera = new PerspectiveCamera(30, 1, 0.05, 50);
    camera.position.set(center.x, center.y + height * 0.1, center.z + height * 3.4);
    camera.lookAt(center.x, center.y + height * 0.05, center.z);

    const mixer = new AnimationMixer(model);
    const clip = (name: string) => gltf.animations.find((a) => a.name === name);
    const idleClip = clip('idle');
    if (!idleClip) throw new Error('character clip idle missing');
    const idle = mixer.clipAction(idleClip).play();
    const emotes = new Map<Emote, AnimationAction>();
    for (const name of EMOTES) {
      const emoteClip = clip(name);
      if (!emoteClip) throw new Error(`character clip ${name} missing`);
      const action = mixer.clipAction(emoteClip).setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      emotes.set(name, action);
    }
    let playing: AnimationAction = idle;
    const fadeTo = (next: AnimationAction): void => {
      if (next === playing) next.reset();
      else next.reset().play().crossFadeFrom(playing, 0.2, false);
      playing = next;
    };
    this.playEmoteNow = (emote) => {
      const action = emotes.get(emote);
      if (!action) return;
      this.stats.emote = emote;
      fadeTo(action);
    };
    const onFinished = (): void => {
      this.stats.emote = null;
      fadeTo(idle);
    };
    mixer.addEventListener('finished', onFinished);
    this.cleanups.push(() => mixer.removeEventListener('finished', onFinished));

    // Accessories attach in the bind pose: pause the pose, reset the skeleton, swap, then resume.
    const skinned: SkinnedMesh[] = [];
    model.traverse((o) => {
      if (o instanceof SkinnedMesh) skinned.push(o);
    });
    let worn: WornOutfit | null = null;
    const wear = (entries: readonly string[]): void => {
      const yaw = model.rotation.y;
      model.rotation.y = 0;
      mixer.stopAllAction();
      for (const mesh of skinned) mesh.skeleton.pose();
      model.updateMatrixWorld(true);
      if (worn) undressCharacter(worn);
      worn = dressCharacter(model, entries, accessoryScaleFor, false);
      for (const { entry, error } of worn.skipped) console.warn(`skipping outfit entry "${entry}"`, error);
      this.stats.outfit = [...worn.entries];
      model.rotation.y = yaw;
      playing = idle;
      this.stats.emote = null;
      idle.reset().play();
    };
    wear(latestOutfit);
    wearNow = wear;

    // Drag to turn (mouse and touch share Pointer Events).
    const canvas = renderer.domElement;
    let dragX: number | null = null;
    const onDown = (e: PointerEvent): void => {
      dragX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent): void => {
      if (dragX === null) return;
      model.rotation.y += (e.clientX - dragX) * DRAG_SPEED;
      this.stats.yaw = model.rotation.y;
      dragX = e.clientX;
    };
    const onUp = (): void => {
      dragX = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    this.cleanups.push(() => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    });

    const resize = (): void => {
      const { clientWidth: w, clientHeight: h } = this.host;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(this.host);
    this.cleanups.push(() => observer.disconnect());

    const timer = new Timer();
    timer.connect(document);
    this.cleanups.push(() => timer.dispose());
    renderer.setAnimationLoop(() => {
      timer.update();
      mixer.update(Math.min(timer.getDelta(), 0.1));
      renderer.render(scene, camera);
      if (!this.stats.ready) {
        this.stats.ready = true;
        store.emit({ type: 'ready' });
      }
    });
  }
}
