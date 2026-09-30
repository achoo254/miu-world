// The world overview (mock M1.1 and M1.4): one generated map with a floating island per region, rendered
// once from a fixed camera into the image behind Home and the world map. The camera lives here, in plain
// TypeScript, so the generator can place each region's label where the render will show it and the
// preview can render from exactly the same point (tools/world/generate-world-overview.ts, preview.html).
export type Vec3 = readonly [number, number, number];

export const WORLD_OVERVIEW_MAP = 'the-gioi';

/** Rendered image size; its aspect is the stage's (16:10). */
export const WORLD_OVERVIEW_IMAGE = { width: 1600, height: 1000 } as const;

export const WORLD_OVERVIEW_CAMERA: { eye: Vec3; target: Vec3; fov: number } = {
  eye: [-62, 104, -62],
  target: [66, 12, 66],
  fov: 27,
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};

/** Where a world point lands in the rendered image, in percent of its width and height (perspective, y up). */
export function projectToImage(point: Vec3, camera = WORLD_OVERVIEW_CAMERA, image = WORLD_OVERVIEW_IMAGE): { x: number; y: number } {
  const forward = normalize(sub(camera.target, camera.eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const d = sub(point, camera.eye);
  const depth = dot(d, forward);
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360);
  const aspect = image.width / image.height;
  const ndcX = dot(d, right) / (depth * halfHeight * aspect);
  const ndcY = dot(d, up) / (depth * halfHeight);
  return { x: ((ndcX + 1) / 2) * 100, y: ((1 - ndcY) / 2) * 100 };
}
