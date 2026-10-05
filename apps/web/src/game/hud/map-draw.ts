// How each marker looks on the round minimap and on the full map (2D canvas): a ring for a gate (its portal's
// colour), a house for home, a gold star for the quest's place, a badge with a game pad for a character with
// minigames, a badge with a bus for a ride station, a small dot for a named place, and the child's arrow.
import { headingAngle, type PlaceKind } from './minimap-model';

/** A rounded rectangle on the current path (drawn with arcs: `roundRect` is missing on older iPads). */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a marker of `kind` centred on (px, py), `r` its radius in canvas pixels. */
export function drawMarker(ctx: CanvasRenderingContext2D, kind: PlaceKind, px: number, py: number, r: number, colour: string, outline: string): void {
  ctx.fillStyle = colour;
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.5, r * 0.3);
  ctx.beginPath();
  switch (kind) {
    case 'home':
      ctx.moveTo(px, py - r * 1.3);
      ctx.lineTo(px + r * 1.2, py - r * 0.1);
      ctx.lineTo(px + r * 0.85, py - r * 0.1);
      ctx.lineTo(px + r * 0.85, py + r);
      ctx.lineTo(px - r * 0.85, py + r);
      ctx.lineTo(px - r * 0.85, py - r * 0.1);
      ctx.lineTo(px - r * 1.2, py - r * 0.1);
      ctx.closePath();
      break;
    case 'quest':
      for (let k = 0; k < 10; k++) {
        const radius = k % 2 === 0 ? r * 1.3 : r * 0.55;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        if (k === 0) ctx.moveTo(px + radius * Math.cos(a), py + radius * Math.sin(a));
        else ctx.lineTo(px + radius * Math.cos(a), py + radius * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'stop':
      roundedRect(ctx, px - r, py - r, 2 * r, 2 * r, r * 0.35);
      break;
    case 'place':
      ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, r * 0.18);
      break;
    default:
      ctx.arc(px, py, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // What is drawn inside the badge, in the outline's colour.
  ctx.fillStyle = outline;
  ctx.beginPath();
  if (kind === 'gate') {
    // The portal's opening.
    ctx.arc(px, py, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'side') {
    // A game pad: its body, then the cross and two buttons cut out of it in the badge's colour.
    roundedRect(ctx, px - r * 0.68, py - r * 0.36, r * 1.36, r * 0.78, r * 0.3);
    ctx.fill();
    ctx.fillStyle = colour;
    const t = r * 0.11;
    ctx.fillRect(px - r * 0.48, py - t, r * 0.36, 2 * t);
    ctx.fillRect(px - r * 0.3 - t, py - r * 0.18, 2 * t, r * 0.36);
    ctx.beginPath();
    ctx.arc(px + r * 0.27, py - r * 0.06, r * 0.1, 0, Math.PI * 2);
    ctx.moveTo(px + r * 0.57, py + r * 0.1);
    ctx.arc(px + r * 0.47, py + r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'story') {
    // A heart: the character's story and the friendship it grows.
    ctx.moveTo(px, py + r * 0.5);
    ctx.bezierCurveTo(px - r * 0.85, py - r * 0.05, px - r * 0.35, py - r * 0.75, px, py - r * 0.25);
    ctx.bezierCurveTo(px + r * 0.35, py - r * 0.75, px + r * 0.85, py - r * 0.05, px, py + r * 0.5);
    ctx.fill();
  } else if (kind === 'stop') {
    // A bus from the side: its body, a row of windows, two wheels.
    roundedRect(ctx, px - r * 0.62, py - r * 0.5, r * 1.24, r * 0.85, r * 0.2);
    ctx.fill();
    ctx.fillStyle = colour;
    ctx.fillRect(px - r * 0.46, py - r * 0.34, r * 0.92, r * 0.26);
    ctx.beginPath();
    ctx.arc(px - r * 0.32, py + r * 0.38, r * 0.15, 0, Math.PI * 2);
    ctx.moveTo(px + r * 0.47, py + r * 0.38);
    ctx.arc(px + r * 0.32, py + r * 0.38, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The child: an arrow the way she faces (player-controller.ts `facing`), ringed in the outline's colour. */
export function drawPlayer(ctx: CanvasRenderingContext2D, px: number, py: number, r: number, facing: number, colour: string, outline: string): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(headingAngle(facing));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.7, r * 0.75);
  ctx.lineTo(-r * 0.35, 0);
  ctx.lineTo(-r * 0.7, -r * 0.75);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(2, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
