// Block count's picture: a table with a little stack of wooden cubes drawn in 3D (each layer its own colour),
// turning gently; three round number buttons below. After a wrong answer the stack turns all the way round;
// a right answer pops the cubes one by one with sparkles.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { LOCK_SECONDS, TURN_SECONDS, type BlockCountState, type Cube } from './logic';

interface Face {
  points: Point[];
  shade: number;
}

/** The faces of a cube that look toward the viewer and touch no other cube, projected. */
function cubeFaces(state: BlockCountState, cube: Cube, occupied: Set<string>, lift: number): { depth: number; faces: Face[] } {
  const { side, angle, cubeSize: s, centre } = state;
  const half = (side - 1) / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const project = (gx: number, gy: number, gz: number): Point => {
    const x = gx - half - 0.5;
    const y = gy - half - 0.5;
    // Turn round the stack's middle, then look from the front and above.
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return { x: centre.x + (rx - ry) * s * 0.75, y: centre.y + (rx + ry) * s * 0.42 - gz * s * 0.9 - lift };
  };
  const corner = (dx: number, dy: number, dz: number): Point => project(cube.x + dx, cube.y + dy, cube.z + dz);
  const has = (x: number, y: number, z: number): boolean => occupied.has(`${x},${y},${z}`);
  const faces: Face[] = [];
  // Side faces: outward normal turned; the viewer looks along +x+y after the turn.
  const sides: { n: [number, number]; pts: [number, number][]; neighbour: [number, number] }[] = [
    { n: [1, 0], pts: [[1, 0], [1, 1]], neighbour: [1, 0] },
    { n: [-1, 0], pts: [[0, 1], [0, 0]], neighbour: [-1, 0] },
    { n: [0, 1], pts: [[1, 1], [0, 1]], neighbour: [0, 1] },
    { n: [0, -1], pts: [[0, 0], [1, 0]], neighbour: [0, -1] },
  ];
  for (const f of sides) {
    const nx = f.n[0] * cos - f.n[1] * sin;
    const ny = f.n[0] * sin + f.n[1] * cos;
    if (nx + ny <= 0.01) continue;
    if (has(cube.x + f.neighbour[0], cube.y + f.neighbour[1], cube.z)) continue;
    const [a, b] = f.pts;
    if (!a || !b) continue;
    faces.push({ points: [corner(a[0], a[1], 0), corner(b[0], b[1], 0), corner(b[0], b[1], 1), corner(a[0], a[1], 1)], shade: nx > ny ? 0.28 : 0.14 });
  }
  if (!has(cube.x, cube.y, cube.z + 1)) faces.push({ points: [corner(0, 0, 1), corner(1, 0, 1), corner(1, 1, 1), corner(0, 1, 1)], shade: -0.12 });
  const cx = cube.x + 0.5 - half - 0.5;
  const cy = cube.y + 0.5 - half - 0.5;
  return { depth: cx * sin + cy * cos + (cx * cos - cy * sin) + cube.z * 0.01, faces };
}

function fillFace(ctx: CanvasRenderingContext2D, view: DrawView, face: Face, colour: string): void {
  const [first, ...rest] = face.points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of rest) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  // Light or shade over the colour, by which way the face looks.
  ctx.globalAlpha = Math.abs(face.shade);
  ctx.fillStyle = face.shade > 0 ? view.theme.ink : view.theme.light;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = view.theme.ink;
  ctx.stroke();
}

export function drawBlockCount(ctx: CanvasRenderingContext2D, state: BlockCountState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const tableY = state.centre.y + state.cubeSize * 1.4;
  paintSky(ctx, view, tableY, 6);
  paintHills(ctx, view, tableY - 10, 40, 90, theme.leaf);
  paintGround(ctx, view, tableY + 40);
  // The table top.
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(state.centre.x, tableY, state.cubeSize * 3.3, state.cubeSize * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  paintShadow(ctx, view, state.centre.x, tableY + 4, state.cubeSize * 4.6);

  const occupied = new Set(state.cubes.map((c) => `${c.x},${c.y},${c.z}`));
  const layerColours = [theme.primary, theme.secondary, theme.leaf, theme.star];
  const popping = state.solvedAgo >= 0;
  const drawn = state.cubes
    .map((cube, i) => ({ cube, i }))
    .filter(({ i }) => !popping || state.solvedAgo < 0.08 * i + 0.15 || view.reducedMotion)
    .map(({ cube }) => ({ cube, ...cubeFaces(state, cube, occupied, 0) }))
    .sort((a, b) => a.depth - b.depth);
  for (const { cube, faces } of drawn) {
    const colour = layerColours[cube.z % layerColours.length] ?? theme.primary;
    for (const face of faces) fillFace(ctx, view, face, colour);
  }
  if (popping) sprites.draw(ctx, 'sparkles', state.centre.x, state.centre.y - state.cubeSize * 2 - state.solvedAgo * 40, 90, { alpha: 1 - state.solvedAgo });

  paintLabel(ctx, view, state.turning > 0 ? 'Xem cả mặt sau nhé!' : 'Có bao nhiêu khối?', arena.width / 2, state.centre.y - state.cubeSize * 3.1, 34);

  const locked = state.turning > TURN_SECONDS - LOCK_SECONDS;
  for (const c of state.choices) {
    const shake = c.wrongAgo < 0.4 && !view.reducedMotion ? Math.sin(c.wrongAgo * 50) * 10 * (1 - c.wrongAgo / 0.4) : 0;
    const r = state.buttonRadius;
    ctx.globalAlpha = locked ? 0.55 : 1;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha *= 0.25;
    ctx.beginPath();
    ctx.arc(c.x + shake, c.y + 7, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = locked ? 0.55 : 1;
    ctx.fillStyle = c.wrongAgo < 1 ? theme.stone : theme.light;
    ctx.beginPath();
    ctx.arc(c.x + shake, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    paintLabel(ctx, view, String(c.value), c.x + shake, c.y + 3, r * 0.95, theme.star);
    ctx.globalAlpha = 1;
  }
  // A frame round the buttons' row, so it reads as one choice.
  const first = state.choices[0];
  const last = state.choices[state.choices.length - 1];
  if (first && last) {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = theme.ink;
    roundRect(ctx, first.x - state.buttonRadius - 20, first.y - state.buttonRadius - 16, last.x - first.x + state.buttonRadius * 2 + 40, state.buttonRadius * 2 + 32, 40);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
