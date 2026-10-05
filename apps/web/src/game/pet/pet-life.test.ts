import { AnimationClip, BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { PET_CARE_ACTIONS, PET_TRICKS } from '@miu/schema/pet-care';
import type { GuardedGltfLoader } from '../asset-loader';
import { loadPetCompanion, type PetCompanion } from '../entities/pet-companion';
import type { ParticleSpawn } from '../interact/effect-particles';
import { PET_MOTIONS, REST_POSE, motionPose } from './pet-motion';
import { SNIFF_COOLDOWN, createPetLife, type PetPlayer, type PetSceneName } from './pet-life';

/** A two-part stand-in Cube Pet with the real clip names (the loader needs a manifest and the network). */
async function testPet(): Promise<PetCompanion> {
  const scene = new Group();
  for (const [z, name] of [
    [0, 'body'],
    [0.5, 'leg-front-left'],
  ] as const) {
    const part = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshBasicMaterial());
    part.name = name;
    part.position.set(0, 0.25, z);
    scene.add(part);
  }
  const animations = ['idle', 'walk', 'run', 'eat', 'dance', 'gesture-positive'].map((name) => new AnimationClip(name, 1, []));
  const loader = { load: () => Promise.resolve({ scene, animations } as unknown as GLTF) } as unknown as GuardedGltfLoader;
  return loadPetCompanion(loader, { model: 'm.glb', scale: 0.5 }, false);
}

const flat = { x: 0, y: 1, z: 0, facing: 0, speed: 0, seated: null, riding: false } satisfies PetPlayer;

async function life(options: { gentle?: boolean; bed?: { x: number; y: number; z: number } } = {}) {
  const pet = await testPet();
  const scene = new Scene();
  const particles: ParticleSpawn[] = [];
  const scenes: Array<PetSceneName | null> = [];
  const said: string[] = [];
  const actions: string[] = [];
  const petLife = createPetLife({
    pet,
    scene,
    spawn: (p) => particles.push(p),
    ground: () => 1,
    standable: () => true,
    bed: options.bed ?? null,
    say: (text) => said.push(text),
    playerAction: (action) => actions.push(String(action)),
    onScene: (name) => scenes.push(name),
    gentle: options.gentle ?? false,
    lite: false,
    shadows: false,
  });
  const run = (seconds: number, player: PetPlayer = flat): void => {
    for (let t = 0; t < seconds; t += 1 / 30) petLife.update(1 / 30, player);
  };
  return { pet, scene, petLife, particles, scenes, said, actions, run };
}

const propsIn = (scene: Scene): string[] => scene.children.map((c) => c.name).filter((n) => n.startsWith('pet-'));

describe('pet scenes', () => {
  it.each(PET_CARE_ACTIONS)('plays %s as a scene in the world, with its own effects, then tidies up', async (action) => {
    const { scene, petLife, particles, scenes, said, run } = await life();
    petLife.care(action);
    run(0.5);
    expect(scenes).toEqual([`care:${action}`]);
    expect(petLife.viewYaw).not.toBeNull();
    const shown = propsIn(scene);
    if (action === 'feed') expect(shown).toEqual(['pet-bowl']);
    if (action === 'bath') expect(shown).toEqual(['pet-tub']);
    if (action === 'play') expect(shown).toEqual(['pet-ball']);
    if (action === 'nap') expect(shown).toEqual(['pet-cushion']);
    run(14);
    expect(scenes).toEqual([`care:${action}`, null]);
    expect(propsIn(scene)).toEqual([]);
    const shapes = new Set(particles.map((p) => p.shape));
    const expected = { feed: 'drop', pet: 'heart', bath: 'bubble', play: 'star', nap: 'zzz' } as const;
    expect(shapes.has(expected[action]) || (action === 'play' && shapes.has('note'))).toBe(true);
    expect(said.length).toBeGreaterThan(0);
    expect(petLife.scene).toBeNull();
  });

  it('eats from the bowl with the eat clip, the food going down', async () => {
    const { pet, scene, petLife, run } = await life();
    petLife.care('feed');
    run(3);
    expect(pet.motion).toBe('eat');
    expect(pet.clip).toBe('eat');
    const food = scene.getObjectByName('pet-bowl-food');
    expect(food?.scale.y).toBeLessThan(1);
  });

  it('fetches the ball: it runs to where it landed and brings it back', async () => {
    const { pet, scene, petLife } = await life();
    petLife.care('play');
    let farthest = 0;
    let carried = false;
    let backAt = Infinity;
    for (let t = 0; t < 8; t += 1 / 30) {
      petLife.update(1 / 30, flat);
      if (petLife.scene === null) break;
      const ball = scene.getObjectByName('pet-ball');
      if (!ball) continue;
      const out = Math.hypot(ball.position.x, ball.position.z);
      farthest = Math.max(farthest, out);
      // Carried: the ball by its mouth while it is away from her.
      if (farthest > 2.5 && Math.hypot(ball.position.x - pet.root.position.x, ball.position.z - pet.root.position.z) < 0.6) carried = true;
      if (carried) backAt = Math.min(backAt, out);
    }
    expect(farthest).toBeGreaterThan(2.5);
    expect(carried).toBe(true);
    expect(backAt).toBeLessThan(2);
  });

  it('plays every trick, each a motion made in code', async () => {
    const { pet, petLife, scenes, run } = await life();
    for (const { id } of PET_TRICKS) {
      petLife.trick(id);
      run(0.6);
      expect(pet.motion).toBe(id);
      run(4);
    }
    expect(scenes.filter((s) => s !== null)).toEqual(PET_TRICKS.map((t) => `trick:${t.id}`));
  });

  it('a walk ends a scene, the pet coming along', async () => {
    const { petLife, scenes, scene, run } = await life();
    petLife.care('bath');
    run(0.5);
    run(0.2, { ...flat, speed: 3, x: 1 });
    expect(scenes).toEqual(['care:bath', null]);
    expect(propsIn(scene)).toEqual([]);
  });
});

describe('its bed at home', () => {
  it('naps in its own bed when she is near it on the same floor, else on a cushion brought out', async () => {
    const home = await life({ bed: { x: 3, y: 1, z: 2 } });
    home.petLife.care('nap');
    home.run(3);
    expect(propsIn(home.scene)).toEqual([]);
    expect(Math.hypot(home.pet.root.position.x - 3, home.pet.root.position.z - 2)).toBeLessThan(0.3);
    expect(home.pet.motion).toBe('nap');
    const upstairs = await life({ bed: { x: 3, y: 8, z: 2 } });
    upstairs.petLife.care('nap');
    upstairs.run(0.5);
    expect(propsIn(upstairs.scene)).toEqual(['pet-cushion']);
  });
});

describe('sniffing toward a clue', () => {
  it('runs part of the way toward the nearest, never onto it, then waits before the next', async () => {
    const { pet, petLife, run } = await life();
    expect(petLife.sniff([])).toBe(false);
    expect(petLife.sniff([[0, 1, 20], [0, 1, 9]])).toBe(true);
    run(5);
    expect(pet.root.position.z).toBeGreaterThan(2);
    expect(pet.root.position.z).toBeLessThan(9 - 1.5);
    expect(petLife.sniffCooldown).toBeGreaterThan(SNIFF_COOLDOWN - 6);
    expect(petLife.sniff([[0, 1, 9]])).toBe(false);
    run(SNIFF_COOLDOWN);
    expect(petLife.sniff([[0, 1, 9]])).toBe(true);
  });
});

describe('reactions to her', () => {
  it('cheers a finished quest and greets her when she arrives', async () => {
    const { pet, petLife, scenes, run } = await life();
    petLife.celebrate();
    run(1.5);
    expect(pet.motion).toBe('dance');
    run(4);
    petLife.greet();
    run(0.1);
    expect(scenes.filter((s) => s !== null)).toEqual(['celebrate', 'greet']);
  });

  it('sits by her seat and naps by her bed', async () => {
    const { pet, petLife, run } = await life();
    run(3, { ...flat, seated: { x: 2, z: 2, lying: false } });
    expect(petLife.mood).toBe('sit-with');
    expect(pet.motion).toBe('sit');
    run(3, { ...flat, seated: { x: 2, z: 2, lying: true } });
    expect(petLife.mood).toBe('nap-with');
    expect(pet.motion).toBe('nap');
    run(1, { ...flat, speed: 2 });
    expect(petLife.mood).toBe('follow');
  });

  it('plays round her while she stands still, hopping at each point, then sits by her; follows again when she walks', async () => {
    const { pet, petLife, run } = await life();
    run(8);
    expect(petLife.mood).toBe('play-round');
    const seen = new Set<string | null>();
    for (let t = 0; t < 10; t += 1 / 30) {
      petLife.update(1 / 30, flat);
      seen.add(pet.motion);
    }
    expect(seen.has('hop')).toBe(true);
    expect(pet.motion).toBe('sit');
    run(0.2, { ...flat, speed: 2 });
    expect(petLife.mood).toBe('follow');
  });

  it('keeps sniffing as she walks after it', async () => {
    const { petLife, scenes, run } = await life();
    petLife.sniff([[0, 1, 9]]);
    run(0.5);
    run(0.5, { ...flat, speed: 2 });
    expect(petLife.scene).toBe('sniff');
    expect(scenes).toEqual(['sniff']);
  });
});

describe('motions made in code', () => {
  it('start and end at rest, and stay gentle with less motion', () => {
    for (const motion of PET_MOTIONS) {
      const start = motionPose(motion, 0);
      expect(Math.abs(start.lift)).toBeLessThan(0.05);
      expect(Number.isFinite(motionPose(motion, 0.4).yaw)).toBe(true);
    }
    expect(Math.abs(motionPose('spin', 0.55).yaw)).toBeGreaterThan(2);
    expect(Math.abs(motionPose('spin', 0.55, true).yaw)).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
    expect(Math.abs(motionPose('roll', 0.65, true).roll)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(motionPose('jump', 0.5).lift).toBeGreaterThan(motionPose('jump', 0.5, true).lift);
    expect(REST_POSE.squash).toBe(1);
  });
});
