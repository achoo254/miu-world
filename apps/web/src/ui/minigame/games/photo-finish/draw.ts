// Photo finish's picture: a race track with a lane per runner, a start line and a chequered finish line. In
// the race the runners bob along; then a photo frame comes up showing the moment the winner touched the line,
// stretched sideways around the line so close finishes are easy to see, with the question ("Ai về thứ 2?")
// and a big place badge. A wrong lane shakes and the finish plays again slowly; the right lane gets a star.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { photoTime, runnerX, type PhotoState } from './logic';

/** How much the photo stretches the track around the finish line. */
const PHOTO_ZOOM = 2.2;

function paintTrack(ctx: CanvasRenderingContext2D, view: DrawView, state: PhotoState): void {
  const { arena, theme } = view;
  const { laneTop, laneHeight } = state;
  state.runners.forEach((_, lane) => {
    ctx.fillStyle = lane % 2 === 0 ? theme.ground : theme.groundDeep;
    ctx.fillRect(0, laneTop + lane * laneHeight, arena.width, laneHeight);
  });
  ctx.fillStyle = theme.light;
  for (let lane = 0; lane <= state.runners.length; lane += 1) ctx.fillRect(0, laneTop + lane * laneHeight - 2, arena.width, 4);
  ctx.fillRect(state.startX - 3, laneTop, 6, laneHeight * state.runners.length);
}

function paintFinish(ctx: CanvasRenderingContext2D, view: DrawView, state: PhotoState, x: number): void {
  const { theme } = view;
  const size = 12;
  const h = state.laneHeight * state.runners.length;
  for (let row = 0; row * size < h; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(x - size + col * size, state.laneTop + row * size, size, Math.min(size, h - row * size));
    }
  }
}

export function drawPhotoFinish(ctx: CanvasRenderingContext2D, state: PhotoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.laneTop, 10);
  paintTrack(ctx, view, state);
  const photo = state.phase === 'photo' || state.phase === 'right';
  const t = photo ? photoTime(state) : state.raceTime;
  const zoom = (x: number): number => (photo ? state.finishX + (x - state.finishX) * PHOTO_ZOOM : x);
  paintFinish(ctx, view, state, state.finishX);
  const size = Math.min(state.laneHeight * 0.85, 84);
  for (const runner of state.runners) {
    const y = state.laneTop + (runner.lane + 0.5) * state.laneHeight;
    const running = !photo && state.raceTime < runner.finish + 0.3;
    const hop = running && !view.reducedMotion ? Math.abs(Math.sin(state.raceTime * 14 + runner.lane)) * 8 : 0;
    const shake = runner.lane === state.wrongLane && state.phase === 'replay' && state.inPhase < 0.5 && !view.reducedMotion ? Math.sin(state.inPhase * 50) * 8 : 0;
    // The runner's nose touches its x: the picture sits just behind it.
    const x = zoom(runnerX(state, runner, t)) - size * 0.4 + shake;
    sprites.draw(ctx, runner.sprite, x, y - hop, size, { flipX: true });
  }

  if (photo) {
    // The photo frame around the finish.
    const left = Math.max(10, state.finishX - arena.width * 0.62);
    const right = Math.min(arena.width - 10, state.finishX + 70);
    const top = state.laneTop - 12;
    const bottom = state.laneTop + state.laneHeight * state.runners.length + 12;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, top, left, bottom - top);
    ctx.fillRect(right, top, arena.width - right, bottom - top);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 10;
    roundRect(ctx, left, top, right - left, bottom - top, 10);
    ctx.stroke();
    if (state.phase === 'right') {
      const winner = [...state.runners].sort((a, b) => a.finish - b.finish)[state.ask - 1];
      if (winner) sprites.draw(ctx, 'star', state.finishX + 40, state.laneTop + (winner.lane + 0.5) * state.laneHeight - 20 - state.inPhase * 30, 60);
    }
  }

  // The question, with the place as a big badge.
  const qy = HUD_SAFE_TOP + 30;
  const badge = { x: arena.width / 2 + 120, y: qy };
  if (photo || state.phase === 'replay') {
    paintLabel(ctx, view, state.phase === 'replay' ? 'Xem chậm lại nè' : 'Ai về thứ', arena.width / 2 - (state.phase === 'replay' ? 0 : 30), qy, 34);
  }
  if (photo) {
    ctx.fillStyle = state.ask === 1 ? theme.star : state.ask === 2 ? theme.stone : theme.wood;
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.stroke();
    paintLabel(ctx, view, `${state.ask}`, badge.x, badge.y + 2, 40);
  }
  if (state.phase === 'race' && state.raceTime < 0.6) paintLabel(ctx, view, 'Xuất phát!', arena.width / 2, qy, 34);
}
