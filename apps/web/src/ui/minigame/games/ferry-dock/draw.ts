// Ferry dock's picture: grassy banks top and bottom with wooden piers (the one to reach lit, with people
// waiting), the river with streaks flowing faster mid-river, the ferry with a speed ring (green when slow enough
// to dock, red when too fast), a line from the ferry to the finger pulling it, and a bump splash.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { currentAt, PIER_HALF, SAFE_SPEED, type FerryState } from './logic';

export function drawFerryDock(ctx: CanvasRenderingContext2D, state: FerryState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const topBank = state.topEdge - 34;
  const bottomBank = state.bottomEdge + 34;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, topBank);
  ctx.fillRect(0, bottomBank, arena.width, arena.height - bottomBank);
  // Flow streaks.
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  for (let k = 0; k < 10; k += 1) {
    const y = topBank + ((k + 0.5) / 10) * (bottomBank - topBank);
    const speed = currentAt(state, y);
    const x = ((view.time * speed + k * 173) % (arena.width + 80)) - 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + speed * 0.3, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Piers.
  state.piers.forEach((pier, i) => {
    const lit = i === state.target && state.phase === 'sail';
    const y = pier.bank === 'top' ? topBank - 10 : bottomBank - 14;
    ctx.fillStyle = lit ? theme.star : theme.wood;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 4;
    roundRect(ctx, pier.x - PIER_HALF, y, PIER_HALF * 2, 24, 6);
    ctx.fill();
    ctx.stroke();
    if (lit) {
      const py = pier.bank === 'top' ? Math.max(HUD_SAFE_TOP + 20, topBank - 40) : bottomBank + 34;
      sprites.draw(ctx, 'rabbit', pier.x - 30, py + bob(view, 5, 3), 48);
      sprites.draw(ctx, 'bear', pier.x + 30, py + bob(view, 5, 3, 1), 48);
    }
  });
  // Pull line to the finger.
  const { ferry, vel } = state;
  if (state.finger && state.phase === 'sail') {
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(ferry.x, ferry.y);
    ctx.lineTo(state.finger.x, state.finger.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  const speed = Math.hypot(vel.x, vel.y);
  ctx.strokeStyle = speed < SAFE_SPEED ? theme.leaf : theme.danger;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(ferry.x, ferry.y + 10, 70, 36, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'ferry', ferry.x, ferry.y, 120, { flipX: vel.x > 5 });
  if (state.time - state.bumpAt < 0.4) sprites.draw(ctx, 'droplet', ferry.x + 40, ferry.y - 40, 40, { alpha: 1 - (state.time - state.bumpAt) / 0.4 });
  if (state.phase === 'docked') paintLabel(ctx, view, 'Cập bến!', arena.width / 2, (topBank + bottomBank) / 2, 48, theme.star);
}
