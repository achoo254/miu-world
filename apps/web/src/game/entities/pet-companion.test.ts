import { AnimationClip, BoxGeometry, Group, Mesh, MeshBasicMaterial, SkinnedMesh } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import type { GuardedGltfLoader } from '../asset-loader';
import { loadPetCompanion } from './pet-companion';

/** A two-part Cube Pet whose faces all sample the grey swatch (column 6, row 3), shared like the real loader's. */
function sharedModelLoader(): { loader: GuardedGltfLoader; scene: Group } {
  const scene = new Group();
  for (const z of [0, 0.5]) {
    const geometry = new BoxGeometry(0.5, 0.5, 0.5);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, 432 / 512, 400 / 512);
    const part = new Mesh(geometry, new MeshBasicMaterial());
    part.position.z = z;
    scene.add(part);
  }
  const animations = ['idle', 'walk', 'run', 'dance'].map((name) => new AnimationClip(name, 1, []));
  const gltf = { scene, animations } as unknown as GLTF; // only the fields loadPetCompanion reads
  // A stand-in with the one method the companion calls; the real loader needs a manifest and the network.
  const loader = { load: () => Promise.resolve(gltf) } as unknown as GuardedGltfLoader;
  return { loader, scene };
}

const flat = () => 0;

describe('pet companion', () => {
  it('trots facing the way it goes (the models look down +z)', async () => {
    const { loader } = sharedModelLoader();
    const pet = await loadPetCompanion(loader, { model: 'm.glb', scale: 0.5 }, false);
    // She steps away north, east, then west (still facing +z): its spot behind her moves the same way.
    for (const [x, z, heading] of [
      [0, 6, 0],
      [6, 0, Math.PI / 2],
      [-6, 0, -Math.PI / 2],
    ] as const) {
      pet.place(0, 0, 0, 0);
      pet.update(0.1, { x, y: 0, z, facing: 0 }, flat);
      expect(pet.root.rotation.y).toBeCloseTo(heading, 5);
      expect(pet.clip).toBe('run');
    }
  });

  it('gives each pet its own copy of the shared model, so a colour variant leaves the base pet alone', async () => {
    const { loader, scene } = sharedModelLoader();
    const grey = await loadPetCompanion(loader, { model: 'm.glb', scale: 0.5 }, false);
    const white = await loadPetCompanion(loader, { model: 'm.glb', scale: 0.5, recolor: { grey: 'white' } }, false);
    const u = (pet: typeof grey): number => {
      let mesh: SkinnedMesh | undefined;
      pet.root.traverse((o) => {
        if (o instanceof SkinnedMesh) mesh = o;
      });
      if (!mesh) throw new Error('no merged mesh');
      return mesh.geometry.getAttribute('uv').getX(0);
    };
    expect(u(grey)).toBeCloseTo(432 / 512);
    expect(u(white)).toBeCloseTo(112 / 512);
    expect(scene.children[0]?.parent).toBe(scene); // the loader's scene is never moved into a pet
  });
});
