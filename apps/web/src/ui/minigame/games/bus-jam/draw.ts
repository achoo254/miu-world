// Bus jam's picture: a road under the HUD with the bus at the stop, painted in its group's colour with the
// group's animal on its sign and three windows that fill as animals board; the buses still to come wait in a
// small queue on the left. Below, the bench with its seats, then the station floor where every animal stands
// on a disc of its group's colour. Animals with a free way out stand tall; a tap on a boxed-in one makes it
// shake. Animals walk to the bus or the bench; a full bus drives off to the right.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { Theme } from '../../theme';
import type { DrawView, Point } from '../../types';
import { cellCentre, freeCells, GROUPS, SEATS, WALK_SECONDS, type BusState } from './logic';

export const groupColour = (theme: Theme, group: number): string => [theme.primary, theme.secondary, theme.leaf, theme.star, theme.danger][group % 5] ?? theme.primary;

function paintBus(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, group: number, aboard: number): void {
  const { theme, sprites } = view;
  const h = w * 0.42;
  ctx.fillStyle = groupColour(theme, group);
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  // Sign with the group's animal, and three windows.
  ctx.fillStyle = theme.light;
  roundRect(ctx, x + w / 2 - h * 0.95, y - h * 0.38, h * 0.8, h * 0.62, 10);
  ctx.fill();
  sprites.draw(ctx, GROUPS[group] ?? 'cat', x + w / 2 - h * 0.55, y - h * 0.07, h * 0.55);
  const winW = (w - h * 1.2) / SEATS;
  for (let i = 0; i < SEATS; i += 1) {
    const wx = x - w / 2 + 12 + i * winW;
    ctx.fillStyle = theme.waterLight;
    roundRect(ctx, wx, y - h * 0.38, winW - 10, h * 0.5, 8);
    ctx.fill();
    if (i < aboard) sprites.draw(ctx, GROUPS[group] ?? 'cat', wx + (winW - 10) / 2, y - h * 0.13, Math.min(winW - 12, h * 0.48));
  }
  ctx.fillStyle = theme.ink;
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    ctx.beginPath();
    ctx.arc(wx, y + h / 2, h * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintRider(ctx: CanvasRenderingContext2D, view: DrawView, group: number, at: Point, size: number, free: boolean, shake: number): void {
  const { theme, sprites } = view;
  ctx.fillStyle = groupColour(theme, group);
  ctx.beginPath();
  ctx.ellipse(at.x + shake, at.y + size * 0.36, size * 0.48, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = free ? theme.light : theme.ink;
  ctx.lineWidth = free ? 5 : 3;
  ctx.stroke();
  sprites.draw(ctx, GROUPS[group] ?? 'cat', at.x + shake, at.y - (free ? 6 : 0), size * (free ? 0.85 : 0.72), { alpha: free ? 1 : 0.75 });
}

export function drawBusJam(ctx: CanvasRenderingContext2D, state: BusState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, state.stop.y + 40, 8);
  // Road.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, state.stop.y + 34, arena.width, 26);
  // Station floor.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.stop.y + 60, arena.width, arena.height);
  const c = state.cell;
  for (let i = 0; i < state.cols * state.rows; i += 1) {
    const p = cellCentre(state, i);
    ctx.fillStyle = i % 2 === Math.floor(i / state.cols) % 2 ? theme.stone : theme.groundDeep;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(p.x - c / 2, p.y - c / 2, c, c);
    ctx.globalAlpha = 1;
  }
  // The exit along the grid's top edge.
  ctx.fillStyle = theme.star;
  ctx.fillRect(state.left, state.top - 6, state.cols * c, 6);

  // Buses: the one at the stop, and the queue.
  const busW = Math.min(arena.width * 0.5, 300);
  const group = state.departing >= 0 ? state.departingGroup : (state.buses[0] ?? 0);
  const drive = state.departing >= 0 ? state.departing * state.departing * 900 : 0;
  const arrive = state.departing < 0 && state.busAge < 0.4 ? (1 - state.busAge / 0.4) * -400 : 0;
  paintBus(ctx, view, state.stop.x + drive + arrive, state.stop.y, busW, group, state.departing >= 0 ? SEATS : state.aboard);
  // The buses still to come wait in a line behind the stop, small: as many as there is room for.
  const room = Math.max(0, Math.floor((state.stop.x - busW / 2 - 14) / 46));
  const queue = state.buses.slice(1, 1 + Math.min(5, room));
  const queueY = state.stop.y + 20;
  queue.forEach((g, i) => {
    const qx = 14 + i * 46;
    ctx.fillStyle = groupColour(theme, g);
    roundRect(ctx, qx, queueY - 13, 40, 26, 8);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    view.sprites.draw(ctx, GROUPS[g] ?? 'cat', qx + 20, queueY, 22);
  });

  // The bench.
  const seatGap = Math.min(100, (arena.width - 40) / state.benchSize);
  const benchW = seatGap * state.benchSize;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, arena.width / 2 - benchW / 2, state.benchY + 18, benchW, 22, 8);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  const seatX = (seat: number): number => arena.width / 2 + (seat - (state.benchSize - 1) / 2) * seatGap;
  const full = state.riders.filter((r) => r.seat >= 0).length;
  if (full >= state.benchSize - 1) paintLabel(ctx, view, 'Ghế sắp đầy!', arena.width / 2, state.benchY + 58, 22, theme.danger);

  const occupied = new Set(state.riders.filter((r) => r.cell >= 0).map((r) => r.cell));
  const free = freeCells(state.cols, state.rows, occupied);
  const size = Math.min(c * 0.9, 96);
  for (const rider of state.riders) {
    const walk = Math.min(1, (state.time - rider.leftAt) / WALK_SECONDS);
    if (rider.cell >= 0) {
      const shake = state.blocked.cell === rider.cell && state.blocked.ago < 0.4 && !view.reducedMotion ? Math.sin(state.blocked.ago * 50) * 8 : 0;
      paintRider(ctx, view, rider.group, cellCentre(state, rider.cell), size, free.has(rider.cell), shake);
    } else if (rider.seat >= 0) {
      const to = { x: seatX(rider.seat), y: state.benchY };
      const at = { x: rider.from.x + (to.x - rider.from.x) * walk, y: rider.from.y + (to.y - rider.from.y) * walk };
      paintRider(ctx, view, rider.group, at, Math.min(seatGap * 0.9, 80), true, 0);
    } else if (rider.boarded && walk < 1) {
      const to = state.stop;
      paintRider(ctx, view, rider.group, { x: rider.from.x + (to.x - rider.from.x) * walk, y: rider.from.y + (to.y - rider.from.y) * walk }, size * 0.8, true, 0);
    }
  }
  if (state.resetAgo < 1) paintLabel(ctx, view, 'Xếp lại bến nào!', arena.width / 2, state.top + (state.rows * c) / 2, 40, theme.star);
}
