// Robot vacuum's picture: a room seen from above (wooden floor, walls), furniture, dust patches, the charging
// mat in the corner, the robot with an arrow for where it faces (shaking after a bump), a faint dotted trail
// of where the program will take it, the program as a strip of arrow tiles (the playing one lit), and the
// command buttons drawn as big arrows, a bin and a play button.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { SIZE, type Button, type Command, type RobotState } from './logic';

export const FURNITURE: readonly SpriteRef[] = ['package', 'teddy-bear', 'books', 'wastebasket', 'basket'];
const DX = [1, 0, -1, 0] as const;
const DY = [0, 1, 0, -1] as const;

/** An arrow for a command, drawn in a box of size `s` centred on (x, y). */
function paintCommand(ctx: CanvasRenderingContext2D, kind: Button, x: number, y: number, s: number, colour: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = s * 0.12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'go') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.32);
    ctx.lineTo(0, -s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, -s * 0.05);
    ctx.lineTo(0, -s * 0.36);
    ctx.lineTo(s * 0.26, -s * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'left' || kind === 'right') {
    const d = kind === 'left' ? -1 : 1;
    ctx.beginPath();
    ctx.arc(-d * s * 0.05, s * 0.05, s * 0.24, kind === 'left' ? 0 : Math.PI, -Math.PI / 2, kind === 'left');
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d * s * 0.02 - d * s * 0.05, -s * 0.36);
    ctx.lineTo(d * s * 0.3 - d * s * 0.05, -s * 0.19);
    ctx.lineTo(d * s * 0.02 - d * s * 0.05, -s * 0.02);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'undo') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, 0);
    ctx.lineTo(-s * 0.16, -s * 0.24);
    ctx.lineTo(s * 0.34, -s * 0.24);
    ctx.lineTo(s * 0.34, s * 0.24);
    ctx.lineTo(-s * 0.16, s * 0.24);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, -s * 0.1);
    ctx.lineTo(s * 0.18, s * 0.1);
    ctx.moveTo(s * 0.18, -s * 0.1);
    ctx.lineTo(-s * 0.02, s * 0.1);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.3);
    ctx.lineTo(s * 0.32, 0);
    ctx.lineTo(-s * 0.2, s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Where the program takes the robot from its start (squares in order) and whether it bumps. */
function trail(state: RobotState): { squares: number[]; bump: boolean } {
  let at = state.room.start;
  let facing = state.room.facing;
  const squares = [at];
  for (const cmd of state.program as Command[]) {
    if (cmd === 'left') facing = (facing + 3) % 4;
    else if (cmd === 'right') facing = (facing + 1) % 4;
    else {
      const x = (at % SIZE) + (DX[facing] ?? 0);
      const y = Math.floor(at / SIZE) + (DY[facing] ?? 0);
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || state.room.blocked[y * SIZE + x]) return { squares, bump: true };
      at = y * SIZE + x;
      squares.push(at);
    }
  }
  return { squares, bump: false };
}

export function drawRobotPath(ctx: CanvasRenderingContext2D, state: RobotState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { left, top, cell } = state.grid;
  const size = cell * SIZE;
  const centre = (i: number): Point => ({ x: left + ((i % SIZE) + 0.5) * cell, y: top + (Math.floor(i / SIZE) + 0.5) * cell });
  // Walls and floor.
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, left - 12, top - 12, size + 24, size + 24, 14);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  ctx.fillRect(left, top, size, size);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  for (let k = 1; k < SIZE; k += 1) {
    ctx.beginPath();
    ctx.moveTo(left, top + k * cell);
    ctx.lineTo(left + size, top + k * cell);
    ctx.moveTo(left + k * cell, top);
    ctx.lineTo(left + k * cell, top + size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Charging mat.
  const mat = centre(state.room.start);
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.6;
  roundRect(ctx, mat.x - cell * 0.42, mat.y - cell * 0.42, cell * 0.84, cell * 0.84, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  let f = 0;
  state.room.blocked.forEach((b, i) => {
    if (!b) return;
    const p = centre(i);
    sprites.draw(ctx, FURNITURE[f % FURNITURE.length] ?? 'package', p.x, p.y, cell * 0.8);
    f += 1;
  });
  state.room.dust.forEach((d, k) => {
    if (state.cleaned[k]) return;
    const p = centre(d);
    ctx.fillStyle = theme.stone;
    for (const [dx, dy, r] of [
      [-8, -4, 12],
      [8, -6, 10],
      [0, 8, 13],
      [10, 8, 8],
    ] as const) {
      ctx.beginPath();
      ctx.arc(p.x + dx * (cell / 80), p.y + dy * (cell / 80), r * (cell / 80), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // The program's trail while editing.
  if (state.phase === 'edit' && state.program.length > 0) {
    const { squares, bump } = trail(state);
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 6;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    squares.forEach((sq, i) => {
      const p = centre(sq);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (bump) {
      const p = centre(squares[squares.length - 1] ?? state.room.start);
      paintLabel(ctx, view, '✕', p.x + cell * 0.3, p.y - cell * 0.3, 30, theme.danger);
    }
  }

  // The robot.
  const at = centre(state.at);
  const shake = state.phase === 'bump' && !view.reducedMotion ? Math.sin(state.phaseAgo * 50) * 6 * (1 - state.phaseAgo) : 0;
  sprites.draw(ctx, 'robot', at.x + shake, at.y, cell * 0.78);
  const fx = DX[state.facing] ?? 0;
  const fy = DY[state.facing] ?? 0;
  ctx.fillStyle = theme.secondary;
  ctx.beginPath();
  const tip = { x: at.x + fx * cell * 0.48, y: at.y + fy * cell * 0.48 };
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - fx * 14 - fy * 12, tip.y - fy * 14 + fx * 12);
  ctx.lineTo(tip.x - fx * 14 + fy * 12, tip.y - fy * 14 - fx * 12);
  ctx.closePath();
  ctx.fill();
  if (state.phase === 'clean') sprites.draw(ctx, 'sparkles', at.x + cell * 0.3, at.y - cell * 0.4, cell * 0.6, { alpha: 1 - state.phaseAgo / 1.3 });

  // The program strip.
  const { strip } = state;
  for (let i = 0; i < 12; i += 1) {
    const x = strip.x + (i % strip.perRow) * (strip.tile + 6) + strip.tile / 2;
    const y = strip.y + Math.floor(i / strip.perRow) * (strip.tile + 8) + strip.tile / 2;
    const cmd = state.program[i];
    const playing = state.phase !== 'edit' && i === state.pc - 1;
    ctx.fillStyle = playing ? theme.star : cmd ? theme.secondary : theme.stone;
    ctx.globalAlpha = cmd ? 1 : 0.35;
    roundRect(ctx, x - strip.tile / 2, y - strip.tile / 2, strip.tile, strip.tile, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (cmd) paintCommand(ctx, cmd, x, y, strip.tile, theme.light);
  }

  // Buttons.
  for (const b of state.buttons) {
    const colour = b.kind === 'run' ? theme.leaf : b.kind === 'undo' ? theme.danger : theme.primary;
    ctx.globalAlpha = state.phase === 'edit' ? 1 : 0.5;
    ctx.fillStyle = colour;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 18);
    ctx.fill();
    ctx.stroke();
    paintCommand(ctx, b.kind, b.x, b.y, Math.min(b.w, b.h) * 0.9, theme.light);
    ctx.globalAlpha = 1;
  }
}
