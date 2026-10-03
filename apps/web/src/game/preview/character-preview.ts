// Character Creator preview (M1.3): a small scene with Miu (and her pet, if she has one), turned by
// dragging, playing one of four emotes on request. Outfit and pet changes arrive as the bridge commands
// `set-outfit` and `set-pet` and swap in place (no remount, no second canvas). Like `Game`, it never
// imports React.
import {
  AnimationMixer,
  Box3,
  DirectionalLight,
  Group,
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
  type Mesh,
  type Object3D,
} from 'three';
import type { GameStore } from '../../game-bridge/game-store';
import { AssetRegistry, GuardedGltfLoader } from '../asset-loader';
import { dressCharacter, undressCharacter, type WornOutfit } from '../character/character-accessories';
import { wornPose } from '../character/worn-pose';
import { withOwnClothes } from '../character/character-clothes';
import { characterForSpecies } from '../content/characters';
import { loadPetCompanion, type PetCompanion } from '../entities/pet-companion';
import { accessoryScaler, PLAYER_SCALE } from '../entities/player-character';
import { PETS } from '../../ui/kit/ui-art';
import { createVehicleMesh, equippedVehicle, rideLift, seatedPose } from '../player/vehicle-ride';
import { disposeSceneGraph } from '../scene/dispose-scene';

export const EMOTES = ['wave', 'jump', 'yawn', 'cheer'] as const;
export type Emote = (typeof EMOTES)[number];

/** Debug handle for E2E (like `window.__miuStats` for the game). */
export interface MiuPreviewStats {
  ready: boolean;
  outfit: string[];
  emote: Emote | null;
  yaw: number;
  /** The pet standing beside the character, once its model is in. */
  pet: string | null;
}

declare global {
  interface Window {
    __miuPreview?: MiuPreviewStats;
  }
}

const DRAG_SPEED = 0.01;
/** The pet's height in the preview, as a share of the character's. */
const PET_HEIGHT = 0.38;
const START_YAW = 0.5;

export interface CharacterPreviewOptions {
  store: GameStore;
  /** Species whose model is shown. */
  species: string;
  /** Items worn when the preview opens. */
  outfit: readonly string[];
  /** Pet shown beside the character when the preview opens, or none. */
  pet?: string | null;
}

export class CharacterPreview {
  private disposed = false;
  private started = false;
  private readonly cleanups: Array<() => void> = [];
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private playEmoteNow: ((emote: Emote) => void) | null = null;
  readonly stats: MiuPreviewStats = { ready: false, outfit: [], emote: null, yaw: START_YAW, pet: null };

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
    let latestPet: string | null = this.options.pet ?? null;
    let showPetNow: ((pet: string | null) => void) | null = null;
    this.cleanups.push(
      store.onCommand((command) => {
        if (command.type === 'set-pet') {
          latestPet = command.pet;
          showPetNow?.(command.pet);
        }
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
    const character = characterForSpecies(this.options.species);
    const loader = new GuardedGltfLoader(registry);
    const gltf = await loader.load(character.output);
    if (this.disposed) return;
    const model: Object3D = gltf.scene;
    model.traverse((o) => (o.frustumCulled = false)); // skinned bounds lag the animated pose
    model.rotation.y = START_YAW;
    model.scale.setScalar(PLAYER_SCALE);
    scene.add(model);

    // Frame the bind pose with room above the head for hats and jumps.
    const box = new Box3().setFromObject(model);
    const center = box.getCenter(new Vector3());
    const height = box.max.y - box.min.y;
    const camera = new PerspectiveCamera(30, 1, 0.05, 50);
    camera.position.set(center.x, center.y + height * 0.1, center.z + height * 3.4);
    camera.lookAt(center.x, center.y + height * 0.05, center.z);

    const mixer = new AnimationMixer(model);
    const itemPose = wornPose(model, gltf.animations);
    const clip = (name: string) => gltf.animations.find((a) => a.name === name);
    const idleClip = clip('idle');
    if (!idleClip) throw new Error('character clip idle missing');
    const idle = mixer.clipAction(idleClip).play();
    /** What she returns to after an emote: idle, or the seated pose of the vehicle she is on. */
    let rest: AnimationAction = idle;
    const emotes = new Map<Emote, AnimationAction>();
    for (const name of EMOTES) {
      const emoteClip = clip(name);
      if (!emoteClip) throw new Error(`character clip ${name} missing`);
      const action = mixer.clipAction(emoteClip).setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      emotes.set(name, action);
    }
    /** Set once the pet stand exists: the pet dances along with the character's cheer and jump. */
    let petCheer: (() => void) | null = null;
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
      if (emote === 'cheer' || emote === 'jump') petCheer?.();
    };
    const onFinished = (): void => {
      this.stats.emote = null;
      fadeTo(rest);
    };
    mixer.addEventListener('finished', onFinished);
    this.cleanups.push(() => mixer.removeEventListener('finished', onFinished));

    // Accessories attach in the bind pose: pause the pose, reset the skeleton, swap, then resume.
    const skinned: SkinnedMesh[] = [];
    model.traverse((o) => {
      if (o instanceof SkinnedMesh) skinned.push(o);
    });
    let worn: WornOutfit | null = null;
    /** The equipped vehicle stands under her, as when she drives it in the game. */
    let vehicleMesh: Mesh | null = null;
    const wear = (entries: readonly string[]): void => {
      const yaw = model.rotation.y;
      model.rotation.y = 0;
      mixer.stopAllAction();
      for (const mesh of skinned) mesh.skeleton.pose();
      model.updateMatrixWorld(true);
      if (worn) undressCharacter(worn);
      worn = dressCharacter(model, withOwnClothes(entries, character.clothes), accessoryScaler(character), false);
      itemPose.wear(entries);
      for (const { entry, error } of worn.skipped) console.warn(`skipping outfit entry "${entry}"`, error);
      if (vehicleMesh) {
        vehicleMesh.removeFromParent();
        vehicleMesh.geometry.dispose(); // the material is shared with the accessories
        vehicleMesh = null;
      }
      const vehicle = equippedVehicle(entries);
      if (vehicle) {
        vehicleMesh = createVehicleMesh(vehicle, false);
        model.add(vehicleMesh);
      }
      model.position.y = (vehicle ? rideLift(vehicle.ride) : 0) * PLAYER_SCALE;
      const pose = vehicle ? seatedPose(vehicle.ride) : null;
      const poseClip = pose ? clip(pose) : undefined;
      rest = poseClip ? mixer.clipAction(poseClip) : idle;
      this.stats.outfit = [...worn.entries.filter((entry) => entries.includes(entry)), ...(vehicle ? [vehicle.entry] : [])];
      model.rotation.y = yaw;
      playing = rest;
      this.stats.emote = null;
      rest.reset().play();
    };
    wear(latestOutfit);
    wearNow = wear;

    // The pet stands at the character's feet on her left, turning with her. The latest choice wins when
    // the child taps through pets faster than they load.
    const petStand = new Group();
    petStand.rotation.y = START_YAW;
    scene.add(petStand);
    let pet: PetCompanion | null = null;
    let petRequest = 0;
    const showPet = (petId: string | null): void => {
      const request = ++petRequest;
      if (pet) {
        petStand.remove(pet.root);
        disposeSceneGraph(pet.root);
        pet = null;
      }
      this.stats.pet = null;
      const spec = PETS.find((p) => p.id === petId);
      if (!spec) return;
      // In the preview the pet stands knee-to-waist high next to the character, whatever the model's size.
      void loadPetCompanion(loader, { model: spec.model, scale: 1, recolor: spec.recolor }, false).then((loaded) => {
        if (this.disposed || request !== petRequest) return disposeSceneGraph(loaded.root);
        const petHeight = new Box3().setFromObject(loaded.root).getSize(new Vector3()).y || 1;
        loaded.root.scale.setScalar((height * PET_HEIGHT) / petHeight);
        loaded.root.position.set(center.x + height * 0.42, box.min.y, center.z + height * 0.12);
        petStand.add(loaded.root);
        pet = loaded;
        this.stats.pet = spec.id;
      });
    };
    showPet(latestPet);
    showPetNow = showPet;
    petCheer = () => pet?.celebrate();

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
      petStand.rotation.y = model.rotation.y;
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
      const dt = Math.min(timer.getDelta(), 0.1);
      mixer.update(dt);
      itemPose.apply(playing === idle);
      pet?.tick(dt);
      renderer.render(scene, camera);
      if (!this.stats.ready) {
        this.stats.ready = true;
        store.emit({ type: 'ready' });
      }
    });
  }
}
