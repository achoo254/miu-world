// The far horizon: one coarse mesh of the whole map from its horizon file (the top block of every 4 x 4
// column cell), coloured by each top block's average atlas colour, so the world reads as wide while only
// the patches round the child are real blocks. Near the camera it is cut away (the real patches are there);
// further off it fades towards the sky. One draw call.
import { BufferAttribute, BufferGeometry, Color, Mesh, MeshLambertMaterial, Vector3, type ColorRepresentation } from 'three';
import type { WorldData } from './world-data';

export interface HorizonMesh {
  mesh: Mesh;
  /** The view distance: the horizon starts a little inside it. */
  setNear(distance: number): void;
  update(camera: Vector3): void;
  dispose(): void;
}

/** Average colour of each block's top tile in the atlas (grey-green when the atlas cannot be read). */
function topColours(data: WorldData): Map<number, Color> {
  const out = new Map<number, Color>();
  const image = data.atlasTexture.image as CanvasImageSource & { width?: number; height?: number };
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  const size = data.atlas.size;
  if (canvas && ctx && image) {
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);
  }
  for (const block of data.atlas.blocks) {
    const [x, y, w, h] = block.top;
    let colour = new Color('#7cae5a');
    if (ctx) {
      const pixels = ctx.getImageData(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h))).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        if ((pixels[i + 3] ?? 0) < 128) continue;
        r += pixels[i] ?? 0;
        g += pixels[i + 1] ?? 0;
        b += pixels[i + 2] ?? 0;
        n++;
      }
      if (n > 0) colour = new Color().setRGB(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear();
    }
    out.set(block.id, colour);
  }
  return out;
}

/** Horizon cells merged per mesh cell along each axis: 8-block cells, some 20k triangles for an 800-block map. */
const MERGE = 2;

export async function createHorizonMesh(data: WorldData, sky: ColorRepresentation): Promise<HorizonMesh> {
  const source = data.horizon;
  const colours = topColours(data);
  // Coarser cells: the mean height and the mean top colour of each MERGE x MERGE group. Means, not the
  // highest: a tree or a roof in one cell would stand the horizon up into a thin sheet over the field.
  const [sx, sz] = source.cells;
  const cell = source.cell * MERGE;
  const [cx, cz] = [Math.ceil(sx / MERGE), Math.ceil(sz / MERGE)];
  const heights = new Float32Array(cx * cz);
  const cellColours = Array.from({ length: cx * cz }, () => new Color(0, 0, 0));
  const counts = new Uint8Array(cx * cz);
  const grass = new Color('#7cae5a');
  for (let z = 0; z < sz; z++) {
    for (let x = 0; x < sx; x++) {
      const i = Math.floor(x / MERGE) + cx * Math.floor(z / MERGE);
      heights[i] = (heights[i] ?? 0) + (source.heights[x + sx * z] ?? 0);
      cellColours[i]?.add(colours.get(source.tops[x + sx * z] ?? 0) ?? grass);
      counts[i] = (counts[i] ?? 0) + 1;
    }
  }
  for (let i = 0; i < cx * cz; i++) {
    const n = Math.max(1, counts[i] ?? 1);
    heights[i] = (heights[i] ?? 0) / n;
    cellColours[i]?.multiplyScalar(1 / n);
  }
  const at = (x: number, z: number): number => Math.min(cx - 1, Math.max(0, x)) + cx * Math.min(cz - 1, Math.max(0, z));
  // A vertex at each cell corner: the mean of the cells round it (just under the block tops).
  const positions = new Float32Array((cx + 1) * (cz + 1) * 3);
  const colourAttr = new Float32Array((cx + 1) * (cz + 1) * 3);
  for (let z = 0; z <= cz; z++) {
    for (let x = 0; x <= cx; x++) {
      const around = [at(x - 1, z - 1), at(x, z - 1), at(x - 1, z), at(x, z)];
      let height = 0;
      const mean = new Color(0, 0, 0);
      for (const i of around) {
        height += heights[i] ?? 0;
        mean.add(cellColours[i] ?? grass);
      }
      height /= around.length;
      mean.multiplyScalar(1 / around.length);
      const v = x + (cx + 1) * z;
      positions.set([x * cell, height - 0.6, z * cell], v * 3);
      colourAttr.set([mean.r, mean.g, mean.b], v * 3);
    }
  }
  const indices = new Uint32Array(cx * cz * 6);
  let k = 0;
  for (let z = 0; z < cz; z++) {
    for (let x = 0; x < cx; x++) {
      const a = x + (cx + 1) * z;
      const b = a + 1;
      const c = a + (cx + 1);
      const d = c + 1;
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colourAttr, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const uniforms = { uCam: { value: new Vector3() }, uNear: { value: 60 }, uFar: { value: 600 }, uSky: { value: new Color(sky) } };
  const material = new MeshLambertMaterial({ vertexColors: true, fog: false });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHorizonWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHorizonWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCam;\nuniform float uNear;\nuniform float uFar;\nuniform vec3 uSky;\nvarying vec3 vHorizonWorld;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat horizonD = distance(vHorizonWorld.xz, uCam.xz);\nif (horizonD < uNear) discard;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, 0.2 + 0.7 * smoothstep(uNear, uFar, horizonD));');
  };
  const mesh = new Mesh(geometry, material);
  mesh.name = 'horizon';
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = false;
  return {
    mesh,
    setNear(distance) {
      // Infinite view (still shots): every patch is real, the horizon is not needed.
      mesh.visible = Number.isFinite(distance);
      uniforms.uNear.value = Number.isFinite(distance) ? distance * 0.92 : 0;
      uniforms.uFar.value = Math.max(uniforms.uNear.value + 50, Math.hypot(data.world.size[0], data.world.size[2]));
    },
    update(camera) {
      uniforms.uCam.value.copy(camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
