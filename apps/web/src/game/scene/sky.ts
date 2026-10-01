// Gradient sky dome (one draw call) whose horizon colour matches the fog.
import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';

export const SKY_TOP = new Color('#6fbef2');
export const SKY_HORIZON = new Color('#dff2ff');

/** The dome's live colours (the uniforms themselves), for moods that tint the sky. */
export function skyColours(sky: Mesh): { top: Color; horizon: Color } {
  const { uniforms } = sky.material as ShaderMaterial;
  return { top: uniforms.top?.value as Color, horizon: uniforms.horizon?.value as Color };
}

export function createSky(radius: number): Mesh {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    // Own copies: world events tint this sky (rain, dusk) without touching the shared constants.
    uniforms: { top: { value: SKY_TOP.clone() }, horizon: { value: SKY_HORIZON.clone() } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
      void main() { float t = clamp(vDir.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, t), 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const sky = new Mesh(new SphereGeometry(radius, 24, 12), material);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  return sky;
}
