// Đàn bầu's picture: a riverside evening, a ribbon of pitch flowing in from the right (wide and soft, the
// notes as brighter beads, glides as slopes), a line where the string sings, the glowing dot at the finger's
// height with little notes floating off while it is on the ribbon, and the đàn bầu itself along the bottom:
// a long wooden body, its one string, and the rod with its gourd leaning as the pitch bends.
import { paintHills, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HIGH, LOW, RIBBON_HALF, ribbonPitch, type DanBauState } from './logic';

export function drawDanBau(ctx: CanvasRenderingContext2D, state: DanBauState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.secondary);
  sky.addColorStop(0.7, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  paintHills(ctx, view, state.bottomY + 60, view.time * 8, 60, theme.leaf);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, state.bottomY + 60, arena.width, arena.height - state.bottomY - 60);

  const yOf = (pitch: number): number => state.bottomY - ((pitch - LOW) / (HIGH - LOW)) * (state.bottomY - state.topY);
  // Faint pitch lines.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  for (let p = LOW; p <= HIGH; p += 2) {
    ctx.beginPath();
    ctx.moveTo(0, yOf(p));
    ctx.lineTo(arena.width, yOf(p));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The ribbon, from the left edge (past) to the right edge (to come).
  const t0 = state.time - state.playX / state.speed;
  const t1 = state.time + (arena.width - state.playX) / state.speed;
  const xOf = (t: number): number => state.playX + (t - state.time) * state.speed;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ribbon = (): void => {
    ctx.beginPath();
    let drawing = false;
    for (let t = t0; t <= t1; t += 0.04) {
      const p = ribbonPitch(state.notes, t);
      if (p === null) {
        drawing = false;
        continue;
      }
      if (!drawing) ctx.moveTo(xOf(t), yOf(p));
      else ctx.lineTo(xOf(t), yOf(p));
      drawing = true;
    }
    ctx.stroke();
  };
  // A soft purple band with a bright thread down its middle.
  ctx.strokeStyle = theme.primary;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = RIBBON_HALF * 2;
  ribbon();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ribbon();
  ctx.globalAlpha = 1;
  // Note beads: green once sung well, grey if missed.
  for (const n of state.notes) {
    const x = xOf(n.at + n.length / 2);
    if (x < -40 || x > arena.width + 40) continue;
    ctx.fillStyle = n.points === null ? theme.light : n.points > 0 ? theme.leaf : theme.stone;
    ctx.beginPath();
    ctx.arc(x, yOf(n.pitch), 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';

  // The string's line and the dot.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(state.playX, state.topY - 30);
  ctx.lineTo(state.playX, state.bottomY + 30);
  ctx.stroke();
  ctx.setLineDash([]);
  if (state.dotY !== null) {
    ctx.fillStyle = state.onRibbon ? theme.star : theme.light;
    ctx.beginPath();
    ctx.arc(state.playX, state.dotY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    if (state.onRibbon && !view.reducedMotion) {
      for (let k = 0; k < 3; k += 1) {
        const a = (view.time * 1.5 + k / 3) % 1;
        sprites.draw(ctx, 'musical-note', state.playX - 30 - a * 90, state.dotY - 20 - a * 60 + k * 10, 36, { alpha: 1 - a });
      }
    }
  }

  // The đàn bầu along the bottom.
  const bodyY = arena.height - 80;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 30, bodyY, arena.width - 60, 46, 22);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  const rodX = 70;
  const bend = state.dotY === null ? 0 : ((state.bottomY + state.topY) / 2 - state.dotY) / (state.bottomY - state.topY);
  const rodTopX = rodX + bend * 50;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(rodX, bodyY + 10);
  ctx.lineTo(rodTopX, bodyY - 120);
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.ellipse(rodX, bodyY - 10, 26, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodTopX, bodyY - 118);
  ctx.lineTo(arena.width - 50, bodyY + 10);
  ctx.stroke();

  if (state.lastPoints !== null && state.time - state.lastAt < 0.5) {
    const words = ['Lệch rồi', 'Được!', 'Tuyệt!'];
    paintLabel(ctx, view, words[state.lastPoints] ?? '', state.playX + 120, state.topY - 20, 36, state.lastPoints > 0 ? theme.star : theme.light);
  }
  const first = state.notes[0];
  if (first && state.time < first.at - 0.2) paintLabel(ctx, view, 'Giữ ngón tay, đưa lên xuống theo dải', arena.width / 2, state.topY - 20, Math.min(32, arena.width / 22));
}
