// One material for every opaque chunk: Lambert lighting + fog, sampling the block atlas per tile.
// Greedy quads span several blocks, so the shader wraps block-unit UVs inside each tile rect and
// samples with explicit gradients (no seams), capping the mip level at the atlas' bleed-free level.
// Trees standing between the camera and the child fade (screen-door dither, still opaque: no sorting,
// no extra draw call); quest things are their own meshes and never fade.
import { MeshLambertMaterial, Vector3, type Texture, type WebGLProgramParametersWithUniforms } from 'three';

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

/** The line of sight to keep clear: camera to the child's body; `uSeeOn` 0 when nobody plays (shots). */
export interface SeeThroughUniforms {
  uSeeFrom: { value: Vector3 };
  uSeeTo: { value: Vector3 };
  uSeeOn: { value: number };
}

const SEE_VERTEX_DECLS = 'attribute float seeThrough;\nvarying float vSeeThrough;\nvarying vec3 vSeeWorld;';
const SEE_FRAGMENT_DECLS = 'uniform vec3 uSeeFrom;\nuniform vec3 uSeeTo;\nuniform float uSeeOn;\nvarying float vSeeThrough;\nvarying vec3 vSeeWorld;';
/**
 * A see-through face inside a tube around the line of sight, in front of the child (the tube widens
 * toward her so her whole body and what she stands by show), drops most of its pixels in a 4×4 ordered
 * pattern: the tree reads as faded, the child and the quest things behind it stay in view.
 */
const SEE_FRAGMENT = `
  if (uSeeOn > 0.5 && vSeeThrough > 0.5) {
    vec3 sight = uSeeTo - uSeeFrom;
    float along = dot(vSeeWorld - uSeeFrom, sight) / max(dot(sight, sight), 1e-4);
    if (along > 0.0 && along < 1.0) {
      float away = length(vSeeWorld - (uSeeFrom + sight * along));
      float radius = mix(1.2, 2.8, along);
      float fade = 1.0 - smoothstep(radius - 1.6, radius, away);
      const float bayer[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
      ivec2 cell = ivec2(mod(gl_FragCoord.xy, 4.0));
      if (fade * 0.75 > (bayer[cell.x + cell.y * 4] + 0.5) / 16.0) discard;
    }
  }
`;

export function createBlockMaterial(atlas: Texture, atlasSize: number, safeMipLevel: number): { material: MeshLambertMaterial; seeThrough: SeeThroughUniforms } {
  const seeThrough: SeeThroughUniforms = { uSeeFrom: { value: new Vector3() }, uSeeTo: { value: new Vector3() }, uSeeOn: { value: 0 } };
  const material = new MeshLambertMaterial({ map: atlas });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, seeThrough);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SEE_VERTEX_DECLS}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeeThrough = seeThrough;\nvSeeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SEE_FRAGMENT_DECLS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${SEE_FRAGMENT}`);
    injectAtlas(shader, atlasSize, safeMipLevel, 'uv');
  };
  material.customProgramCacheKey = () => 'miu-block-atlas';
  return { material, seeThrough };
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
