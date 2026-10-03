// Ant lemmings' picture: a cut through the ground (soil under a grass strip), with the anthill the ants come
// out of, the nest (a hole under a leaf) at one end, gaps dropping into the dark, and a pond at the other end.
// Walking ants trot along; a guard stands up with a gold ring; a bridge ant lies across its gap. Lost ants
// tumble into the gap or float away on the pond. The count of ants still to come sits by the anthill.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { AntsState } from './logic';

export function drawAntLemmings(ctx: CanvasRenderingContext2D, state: AntsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const g = state.groundY;
  const { level } = state;
  paintSky(ctx, view, g, 8);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, g, arena.width, arena.height - g);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, g, arena.width, 22);
  for (const gap of level.gaps) {
    ctx.fillStyle = theme.ink;
    ctx.fillRect(gap.x0, g, gap.x1 - gap.x0, arena.height - g);
  }
  ctx.fillStyle = theme.water;
  ctx.fillRect(level.pond.x0, g + 4, level.pond.x1 - level.pond.x0, 70);
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(level.pond.x0, g + 4, level.pond.x1 - level.pond.x0, 6);
  ctx.globalAlpha = 1;
  // Anthill and nest.
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(level.spawnX, g, 46, 34, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(level.nestX, g + 6, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'leaf', level.nestX, g - 40 + Math.sin(view.time * 2) * 3, 56);
  if (state.toSpawn > 0) paintLabel(ctx, view, `${state.toSpawn}`, level.spawnX, g - 56, 26);

  for (const a of state.ants) {
    const flip = a.dir < 0;
    if (a.state === 'walk') {
      const hop = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 14 + a.x)) * 3;
      sprites.draw(ctx, 'ant', a.x, g - 14 - hop, 40, { flipX: flip });
    } else if (a.state === 'guard') {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(a.x, g - 22, 26, 0, Math.PI * 2);
      ctx.stroke();
      sprites.draw(ctx, 'ant', a.x, g - 22, 42, { rotate: -Math.PI / 2 });
    } else if (a.state === 'bridge') {
      sprites.draw(ctx, 'ant', a.x, g + 4, 66, { rotate: Math.PI });
    } else if (a.state === 'lost' && a.since < 1.5) {
      if (a.fell === 'gap') sprites.draw(ctx, 'ant', a.x, g + a.since * 200, 36, { rotate: a.since * 8, alpha: 1 - a.since / 1.5 });
      else sprites.draw(ctx, 'ant', a.x + a.since * 30, g + 10 + Math.sin(a.since * 6) * 4, 36, { rotate: Math.PI, alpha: 1 - a.since / 1.5 });
    } else if (a.state === 'home' && a.since < 0.6) {
      sprites.draw(ctx, 'ant', level.nestX, g - 10 + a.since * 30, 36 * (1 - a.since), { alpha: 1 - a.since / 0.6 });
    }
  }
  if (state.levels === 1 && state.time < 5) paintLabel(ctx, view, 'Chạm kiến để chặn đường hoặc làm cầu!', arena.width / 2, HUD_SAFE_TOP + 30, 26);
}
