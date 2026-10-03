// The minimap on /play (owner's mock, panel 14): a round map in the top right corner under the menu, north up,
// the child's arrow in its middle, the gates in their portal colours, her home, the quest's place. A tap
// opens the whole map with its legend; a tap on it (or its ✕) closes it again. Drawn on a 2D canvas a few
// times a second (half as often on the low quality), never per frame; the game writes it, React never does.
import type { Atlas } from '@miu/voxel/block-table';
import type { Horizon } from '@miu/voxel/region-format';
import { MARKER_COLOURS, commonHeight, headingAngle, minimapLegend, minimapPixels, onDisc, toMinimap, type MinimapMarker, type MinimapView } from './minimap-model';

/** Blocks from the child to the disc's edge. */
const DISC_REACH = 36;
/** Seconds between two drawings of the disc (low quality: twice as long). */
const REDRAW_S = 0.25;

export interface MinimapInput {
  atlas: Atlas;
  atlasImage: CanvasImageSource | null;
  horizon: Horizon;
  /** The core's size in blocks (x, z). */
  size: readonly [number, number];
  markers: readonly MinimapMarker[];
  lite: boolean;
}

export interface Minimap {
  root: HTMLElement;
  /** Where the child is, which way she faces, and the quest's place (null when none on this map). */
  update(dt: number, at: { x: number; z: number; facing: number }, quest: { x: number; z: number } | null): void;
  dispose(): void;
}

/** Each block's colour, read off its top tile in the atlas (averaged by drawing it into one pixel). */
function blockColours(atlas: Atlas, image: CanvasImageSource | null): Map<number, [number, number, number]> {
  const out = new Map<number, [number, number, number]>();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = image ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  if (!ctx || !image) return out;
  for (const block of atlas.blocks) {
    const [x, y, w, h] = block.top;
    ctx.clearRect(0, 0, 1, 1);
    ctx.drawImage(image, x, y, w, h, 0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
    out.set(block.id, [r, g, b]);
  }
  return out;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, dataId?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (dataId) node.dataset.id = dataId;
  return node;
}

export function createMinimap(host: HTMLElement, input: MinimapInput): Minimap {
  // The map from above, one pixel per horizon cell, drawn once.
  const [cw, ch] = input.horizon.cells;
  const base = document.createElement('canvas');
  base.width = cw;
  base.height = ch;
  const colours = blockColours(input.atlas, input.atlasImage);
  const ground = commonHeight(input.horizon.heights);
  base.getContext('2d')?.putImageData(new ImageData(minimapPixels(input.horizon, (id) => colours.get(id), ground), cw, ch), 0, 0);
  const cell = input.horizon.cell;

  const root = el('div', 'minimap', 'game-minimap');
  const disc = el('button', 'minimap-disc', 'game-minimap-open');
  disc.type = 'button';
  disc.setAttribute('aria-label', 'Bản đồ nhỏ: chạm để xem cả bản đồ');
  const discCanvas = el('canvas', 'minimap-canvas');
  const north = el('span', 'minimap-north');
  north.textContent = 'B';
  north.setAttribute('aria-hidden', 'true');
  disc.append(discCanvas, north);

  const sheet = el('div', 'minimap-sheet', 'game-minimap-sheet');
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Bản đồ');
  const sheetCanvas = el('canvas', 'minimap-sheet-canvas');
  const legend = el('ul', 'minimap-legend', 'game-minimap-legend');
  const close = el('button', 'minimap-close', 'game-minimap-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Đóng bản đồ');
  close.textContent = '✕';
  sheet.append(sheetCanvas, legend, close);
  root.append(disc, sheet);
  host.append(root);

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  // Colours from the design tokens (ui/tokens.css) where the game's DOM sits under them.
  const token = (name: string, fallback: string): string => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  const meadow = token('--color-grass', '#9fd38a');
  const outline = token('--color-surface', '#ffffff');
  const fit = (canvas: HTMLCanvasElement): number => {
    const side = Math.max(1, Math.round((canvas.getBoundingClientRect().width || 128) * ratio));
    if (canvas.width !== side) {
      canvas.width = side;
      canvas.height = side;
    }
    return side;
  };

  let at = { x: input.size[0] / 2, z: input.size[1] / 2, facing: 0 };
  let quest: { x: number; z: number } | null = null;
  let wait = 0;
  let legendFor = '';

  const drawMap = (ctx: CanvasRenderingContext2D, view: MinimapView, round: boolean): void => {
    const { size } = view;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    if (round) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    // The land round the core is not in the horizon: a soft meadow under it.
    ctx.fillStyle = meadow;
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    const [x0, z0] = toMinimap(view, 0, 0);
    const [x1, z1] = toMinimap(view, cw * cell, ch * cell);
    ctx.drawImage(base, x0, z0, x1 - x0, z1 - z0);
    const dot = Math.max(5, size * (round ? 0.035 : 0.018));
    const mark = (m: { x: number; z: number; colour: string }, shape: 'ring' | 'house' | 'star'): void => {
      if (round && !onDisc(view, m.x, m.z, dot)) return;
      const [px, py] = toMinimap(view, m.x, m.z);
      ctx.fillStyle = m.colour;
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(1.5, dot * 0.3);
      ctx.beginPath();
      if (shape === 'house') {
        ctx.moveTo(px, py - dot * 1.3);
        ctx.lineTo(px + dot * 1.2, py - dot * 0.1);
        ctx.lineTo(px + dot * 0.85, py - dot * 0.1);
        ctx.lineTo(px + dot * 0.85, py + dot);
        ctx.lineTo(px - dot * 0.85, py + dot);
        ctx.lineTo(px - dot * 0.85, py - dot * 0.1);
        ctx.lineTo(px - dot * 1.2, py - dot * 0.1);
        ctx.closePath();
      } else if (shape === 'star') {
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? dot * 1.3 : dot * 0.55;
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          if (k === 0) ctx.moveTo(px + r * Math.cos(a), py + r * Math.sin(a));
          else ctx.lineTo(px + r * Math.cos(a), py + r * Math.sin(a));
        }
        ctx.closePath();
      } else ctx.arc(px, py, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    for (const m of input.markers) mark(m, m.kind === 'home' ? 'house' : 'ring');
    if (quest) mark({ ...quest, colour: MARKER_COLOURS.quest }, 'star');
    // The child: an arrow the way she faces, ringed in white.
    const [px, py] = toMinimap(view, at.x, at.z);
    const a = headingAngle(at.facing);
    const r = Math.max(7, size * 0.05);
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.7, r * 0.75);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(-r * 0.7, -r * 0.75);
    ctx.closePath();
    ctx.fillStyle = MARKER_COLOURS.player;
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2, r * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawDisc = (): void => {
    const size = fit(discCanvas);
    const ctx = discCanvas.getContext('2d');
    if (ctx) drawMap(ctx, { x: at.x, z: at.z, half: DISC_REACH, size }, true);
  };
  const drawSheet = (): void => {
    const size = fit(sheetCanvas);
    const ctx = sheetCanvas.getContext('2d');
    const half = Math.max(input.size[0], input.size[1]) / 2;
    if (ctx) drawMap(ctx, { x: input.size[0] / 2, z: input.size[1] / 2, half, size }, false);
    const entries = minimapLegend(input.markers, quest !== null);
    const key = entries.map((e) => e.label).join('|');
    if (key === legendFor) return;
    legendFor = key;
    legend.replaceChildren(
      ...entries.map((entry) => {
        const item = el('li', `minimap-legend-item minimap-legend-item--${entry.kind}`);
        const chip = el('span', 'minimap-legend-chip');
        chip.style.background = entry.colour;
        item.append(chip, document.createTextNode(entry.label));
        return item;
      }),
    );
  };

  const open = (): void => {
    sheet.hidden = false;
    root.dataset.open = 'true';
    drawSheet();
    close.focus({ preventScroll: true });
  };
  const shut = (): void => {
    sheet.hidden = true;
    delete root.dataset.open;
    disc.focus({ preventScroll: true });
  };
  disc.addEventListener('click', open);
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target === sheetCanvas) shut();
  });
  // Touches on the minimap never reach the game's camera drag under it, nor its guard against text selection
  // (which cancels a touch's click).
  for (const node of [disc, sheet]) {
    node.addEventListener('pointerdown', (e) => e.stopPropagation());
    node.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  return {
    root,
    update(dt, now, place) {
      at = now;
      quest = place;
      wait -= dt;
      if (wait > 0) return;
      wait = REDRAW_S * (input.lite ? 2 : 1);
      if (sheet.hidden) drawDisc();
      else drawSheet();
    },
    dispose() {
      root.remove();
    },
  };
}
