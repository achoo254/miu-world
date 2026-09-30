// Frees the GPU side of a scene graph: every mesh's geometry, materials and the textures they use.
import { Mesh, Texture, type Material, type Object3D } from 'three';

export function disposeSceneGraph(root: Object3D): void {
  const textures = new Set<Texture>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) texture.dispose();
}
