// Static props: every sub-mesh of each prop model becomes ONE InstancedMesh holding all placements,
// so 60 props cost one draw call per (model, sub-mesh) pair instead of one per prop.
import { Euler, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';

export async function loadProps(loader: GuardedGltfLoader, entities: WorldEntities, shadows: boolean): Promise<Group> {
  const group = new Group();
  group.name = 'props';
  const byModel = new Map<string, WorldEntities['props']>();
  for (const prop of entities.props) byModel.set(prop.model, [...(byModel.get(prop.model) ?? []), prop]);

  for (const [model, placements] of byModel) {
    const gltf = await loader.load(model);
    gltf.scene.updateMatrixWorld(true);
    const instanceMatrices = placements.map((p) =>
      new Matrix4().compose(
        new Vector3(...p.position),
        new Quaternion().setFromEuler(new Euler(0, (p.yaw * Math.PI) / 180, 0)),
        new Vector3(p.scale, p.scale, p.scale),
      ),
    );
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld); // bake the node transform
      const instanced = new InstancedMesh(geometry, node.material, placements.length);
      instanced.name = `props:${model.split('/').pop() ?? model}`;
      instanceMatrices.forEach((m, i) => instanced.setMatrixAt(i, m));
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
      instanced.castShadow = shadows;
      instanced.receiveShadow = shadows;
      group.add(instanced);
    });
  }
  return group;
}
