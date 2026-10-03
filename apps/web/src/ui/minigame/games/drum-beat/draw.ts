// Drum beat's picture: a festival sky, a wooden lane with the ring at its left end, red full notes and blue
// hollow notes sliding in from the right, and the big drum below: a red middle and a blue studded rim, each
// bouncing and flashing when struck. Words show how the last note went; a short hint opens the song.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { GOOD_WINDOW, noteX, type DrumBeatState, type Note } from './logic';

const WORDS: Record<NonNullable<Note['result']>, string> = { perfect: 'Tuyệt!', good: 'Được!', wrong: 'Sai chỗ gõ', late: 'Trễ rồi' };
const NOTE_RADIUS = 34;

function paintNote(ctx: CanvasRenderingContext2D, view: DrawView, note: Note, x: number, y: number, scale: number): void {
  const { theme } = view;
  const r = NOTE_RADIUS * scale;
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  if (note.kind === 'face') {
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= 0.5;
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 14 * scale;
  ctx.beginPath();
  ctx.arc(x, y, r - 8 * scale, 0, Math.PI * 2);
  ctx.stroke();
}

function paintDrum(ctx: CanvasRenderingContext2D, view: DrawView, state: DrumBeatState): void {
  const { theme } = view;
  const { drum, faceRadius, rimRadius } = state;
  const ago = state.time - state.struckAt;
  const flash = ago < 0.15 ? 1 - ago / 0.15 : 0;
  const squash = view.reducedMotion ? 0 : flash * 0.05;
  // The barrel under the drum head.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, drum.x - rimRadius * 0.95, drum.y, rimRadius * 1.9, rimRadius * 0.75, 30);
  ctx.fill();
  const rimScale = state.struck === 'rim' ? 1 - squash : 1;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(drum.x, drum.y, rimRadius * rimScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (state.struck === 'rim' && flash > 0) {
    ctx.globalAlpha = flash * 0.6;
    ctx.fillStyle = theme.light;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Studs round the rim.
  ctx.fillStyle = theme.star;
  const studRing = (faceRadius + rimRadius) / 2;
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(drum.x + Math.cos(a) * studRing, drum.y + Math.sin(a) * studRing, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const faceScale = state.struck === 'face' ? 1 - squash : 1;
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.arc(drum.x, drum.y, faceRadius * faceScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (state.struck === 'face' && flash > 0) {
    ctx.globalAlpha = flash * 0.6;
    ctx.fillStyle = theme.light;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // A sun emblem in the middle of the head, like a festival drum.
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(drum.x, drum.y, faceRadius * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(drum.x + Math.cos(a) * faceRadius * 0.42, drum.y + Math.sin(a) * faceRadius * 0.42);
    ctx.lineTo(drum.x + Math.cos(a) * faceRadius * 0.62, drum.y + Math.sin(a) * faceRadius * 0.62);
    ctx.stroke();
  }
  paintLabel(ctx, view, 'tùng', drum.x, drum.y + faceRadius * 0.72, 26);
  paintLabel(ctx, view, 'cắc', drum.x, drum.y - (faceRadius + rimRadius) / 2, 24);
}

export function drawDrumBeat(ctx: CanvasRenderingContext2D, state: DrumBeatState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.drum.y - state.rimRadius * 0.4;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 0, 80, theme.leaf);
  paintGround(ctx, view, groundY);

  // The lane and its ring.
  const { laneY, ringX } = state;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  roundRect(ctx, 30, laneY - 50, arena.width + 40, 100, 50);
  ctx.fill();
  ctx.stroke();
  const due = state.notes.some((n) => n.result === null && Math.abs(n.at - state.time) <= GOOD_WINDOW);
  ctx.strokeStyle = due ? theme.star : theme.light;
  ctx.lineWidth = due ? 9 : 6;
  ctx.beginPath();
  ctx.arc(ringX, laneY, 44, 0, Math.PI * 2);
  ctx.stroke();

  for (const note of state.notes) {
    if (note.result === null) {
      const x = noteX(state, note);
      if (x > arena.width + NOTE_RADIUS || x < -NOTE_RADIUS) continue;
      paintNote(ctx, view, note, x, laneY, 1);
      continue;
    }
    const ago = state.time - note.judgedAt;
    if (ago > 0.4) continue;
    const hit = note.result === 'perfect' || note.result === 'good';
    ctx.globalAlpha = 1 - ago / 0.4;
    // A hit note bursts bigger in the ring; a missed one drops off the lane.
    if (hit) paintNote(ctx, view, note, ringX, laneY, 1 + ago * 2);
    else paintNote(ctx, view, note, Math.max(ringX, noteX(state, note)), laneY + ago * 220, 0.9);
    ctx.globalAlpha = 1;
  }

  sprites.draw(ctx, 'drum', 60, groundY + 30, 80);
  sprites.draw(ctx, 'drum', arena.width - 60, groundY + 30, 80, { flipX: true });
  paintDrum(ctx, view, state);

  if (state.lastResult && state.time - state.lastAt < 0.5) {
    const good = state.lastResult === 'perfect' || state.lastResult === 'good';
    paintLabel(ctx, view, WORDS[state.lastResult], ringX + 120, laneY - 78, good ? 40 : 32, good ? theme.star : theme.light);
  }
  const first = state.notes[0];
  if (first && state.time < first.at - 0.3) {
    // On the empty lane, before the first note arrives.
    const x = (ringX + 50 + arena.width) / 2;
    paintLabel(ctx, view, 'Nốt đỏ: gõ giữa trống', x, laneY - 20, 28, theme.light);
    paintLabel(ctx, view, 'Nốt xanh: gõ viền trống', x, laneY + 22, 28, theme.light);
  }
}
