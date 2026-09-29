// One material for every opaque chunk: Lambert lighting + fog, sampling the block atlas per tile.
// Greedy quads span several blocks, so the shader wraps block-unit UVs inside each tile rect and
// samples with explicit gradients (no seams), capping the mip level at the atlas' bleed-free level.
import { MeshLambertMaterial, type Texture, type WebGLProgramParametersWithUniforms } from 'three';

const ATLAS_VERTEX_DECLS = 'attribute vec4 tileRect;\nvarying vec4 vTileRect;\nvarying vec2 vBlockUv;';
const ATLAS_FRAGMENT_DECLS = 'uniform float uAtlasSize;\nuniform float uMaxTexels;\nvarying vec4 vTileRect;\nvarying vec2 vBlockUv;';
/** Replaces three's map sampling: wrap inside the tile, flip v (atlas rows run top-down), clamp mip. */
const ATLAS_SAMPLE = `
  vec2 local = fract(vBlockUv);
  vec2 atlasUv = vTileRect.xy + vec2(local.x, 1.0 - local.y) * vTileRect.zw;
  vec2 gx = dFdx(vBlockUv) * vTileRect.zw;
  vec2 gy = dFdy(vBlockUv) * vTileRect.zw;
  float footprint = max(length(gx), length(gy)) * uAtlasSize;
  float clampScale = footprint > uMaxTexels ? uMaxTexels / footprint : 1.0;
  diffuseColor *= textureGrad(map, atlasUv, gx * clampScale, gy * clampScale);
`;

/** Injects the atlas tile sampling; `uvExpression` lets water scroll its block UVs. */
function injectAtlas(shader: WebGLProgramParametersWithUniforms, atlasSize: number, safeMipLevel: number, uvExpression: string): void {
  shader.uniforms.uAtlasSize = { value: atlasSize };
  shader.uniforms.uMaxTexels = { value: 2 ** safeMipLevel };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${ATLAS_VERTEX_DECLS}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>\nvTileRect = tileRect;\nvBlockUv = ${uvExpression};`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${ATLAS_FRAGMENT_DECLS}`)
    .replace('#include <map_fragment>', ATLAS_SAMPLE);
}

export function createBlockMaterial(atlas: Texture, atlasSize: number, safeMipLevel: number): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ map: atlas });
  material.onBeforeCompile = (shader) => injectAtlas(shader, atlasSize, safeMipLevel, 'uv');
  material.customProgramCacheKey = () => 'miu-block-atlas';
  return material;
}

export interface WaterUniforms {
  uTime: { value: number };
}

/** Water surface: same atlas tile, scrolling UVs, gentle vertex bob, semi-transparent. */
export function createWaterMaterial(atlas: Texture, atlasSize: number, safeMipLevel: number): { material: MeshLambertMaterial; uniforms: WaterUniforms } {
  const uniforms: WaterUniforms = { uTime: { value: 0 } };
  const material = new MeshLambertMaterial({ map: atlas, transparent: true, opacity: 0.78, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nif (normal.y > 0.5) transformed.y += -0.12 + 0.04 * sin(uTime * 1.6 + position.x * 0.7 + position.z * 0.5);',
      );
    injectAtlas(shader, atlasSize, safeMipLevel, 'uv + vec2(uTime * 0.12, uTime * 0.05)');
  };
  material.customProgramCacheKey = () => 'miu-water';
  return { material, uniforms };
}
