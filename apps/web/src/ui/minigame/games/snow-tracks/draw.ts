// Who went by?'s picture: a snowy clearing with pine trees, the footprints pressed into the snow one by one
// (drawn as shapes: long and small ovals, paws with toes, three-toed bird feet, webbed feet and a tail line),
// a question bubble where the tracks lead, the four animals to choose from (a wrong one greys out), and the
// right animal popping out at the end of its tracks.
import { bob, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ANIMALS, type Print, type SnowTracksState } from './logic';

function paintPrint(ctx: CanvasRenderingContext2D, print: Print): void {
  ctx.save();
  ctx.translate(print.x, print.y);
  ctx.rotate(print.angle);
  ctx.scale(1.5, 1.5);
  switch (print.kind) {
    case 'hind':
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'front':
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'paw':
      ctx.beginPath();
      ctx.ellipse(-2, 0, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [tx, ty] of [
        [7, -6],
        [9, -2],
        [9, 2],
        [7, 6],
      ] as const) {
        ctx.beginPath();
        ctx.arc(tx, ty, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'claw':
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(10, -6);
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 6);
      ctx.stroke();
      break;
    case 'web':
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(10, -9);
      ctx.quadraticCurveTo(13, 0, 10, 9);
      ctx.closePath();
      ctx.fill();
      break;
    case 'drag':
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

export function drawSnowTracks(ctx: CanvasRenderingContext2D, state: SnowTracksState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.field.top + 10, 6);
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, state.field.top, arena.width, arena.height - state.field.top);
  // Soft drifts.
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse((i * 233) % arena.width, state.field.top + 30 + ((i * 97) % (state.field.bottom - state.field.top)), 120, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i += 1) sprites.draw(ctx, 'evergreen-tree', 40 + i * (arena.width - 80) / 2, state.field.top - 10, 90);

  // Footprints, the newest fading in.
  ctx.fillStyle = theme.ink;
  ctx.strokeStyle = theme.ink;
  const whole = Math.floor(state.shown);
  for (let i = 0; i < Math.min(state.prints.length, whole + 1); i += 1) {
    const print = state.prints[i];
    if (!print) continue;
    ctx.globalAlpha = 0.6 * (i < whole ? 1 : state.shown - whole);
    paintPrint(ctx, print);
  }
  ctx.globalAlpha = 1;

  // Where the tracks lead: a bush with a question, or the animal itself.
  const end = state.prints[state.prints.length - 1];
  if (end) {
    const animal = ANIMALS[state.animal] ?? 'fox';
    if (state.phase === 'reveal') {
      const pop = Math.min(1, state.phaseAgo / 0.25);
      paintShadow(ctx, view, end.x, end.y + 40, 80);
      sprites.draw(ctx, animal, end.x, end.y - 20 * pop + bob(view, 7, 4), 110 * (0.6 + 0.4 * pop));
      sprites.draw(ctx, 'sparkles', end.x + 50, end.y - 60, 44, { alpha: 1 - state.phaseAgo / 1.1 });
    } else {
      sprites.draw(ctx, 'evergreen-tree', end.x, end.y - 20, 100);
      paintLabel(ctx, view, '?', end.x + 34, end.y - 70 + bob(view, 4, 5), 54, theme.primary);
    }
  }

  // The four animals to choose from.
  state.buttons.forEach((b, i) => {
    const out = state.ruledOut[i] ?? false;
    const right = state.phase === 'reveal' && i === state.animal;
    ctx.globalAlpha = out ? 0.35 : 1;
    ctx.fillStyle = right ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, state.buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, ANIMALS[i] ?? 'fox', b.x, b.y, state.buttonRadius * 1.4);
    if (out) {
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(b.x - state.buttonRadius * 0.6, b.y - state.buttonRadius * 0.6);
      ctx.lineTo(b.x + state.buttonRadius * 0.6, b.y + state.buttonRadius * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}
