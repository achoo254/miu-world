// The minimap on /play (owner's mock, panel 14): a round map in the top right corner under the menu, north up,
// the child's arrow in its middle, the gates in their portal colours, her home, the characters who offer a
// minigame, the quest's place. A tap opens the whole map (map-sheet.ts), where a tap on a place walks her
// there. The disc is drawn on a 2D canvas a few times a second (half as often on the low quality), never per
// frame; the game writes it, React never does.
import type { Atlas } from '@miu/voxel/block-table';
import type { Horizon } from '@miu/voxel/region-format';
import type { WalkGoal } from '../../game-bridge/game-store';
import { drawMarker, drawPlayer } from './map-draw';
import { createMapSheet, el } from './map-sheet';
import { MAP_MARGIN, MARKER_COLOURS, commonHeight, minimapPixels, onDisc, questMarker, toMinimap, type MinimapMarker, type MinimapView, type PlaceKind } from './minimap-model';

/** Blocks from the child to the disc's edge. */
const DISC_REACH = 36;
/** Seconds between two drawings of the disc (low quality: twice as long). */
const REDRAW_S = 0.25;
/** What the small disc shows: the places worth heading for, not every stop and named place. */
const ON_DISC: ReadonlySet<PlaceKind> = new Set(['gate', 'home', 'story', 'side', 'quest']);

export interface MinimapInput {
  atlas: Atlas;
  atlasImage: CanvasImageSource | null;
  horizon: Horizon;
  /** The core's size in blocks (x, z). */
  size: readonly [number, number];
  /** The map's fixed markers (minimap-model.ts `minimapMarkers`). */
  markers: readonly MinimapMarker[];
  /** The map's name, over the full map. */
  title: string;
  lite: boolean;
  /** "Đi tới đây" on the full map: walk her to that place. */
  onGo(goal: WalkGoal): void;
}

/** The quest's place now: the target the quest card points at. */
export interface MinimapQuest {
  id: string;
  label: string;
  x: number;
  z: number;
}

export interface Minimap {
  root: HTMLElement;
  /** The full map covers the screen: nothing of the 3D view shows. */
  readonly covering: boolean;
  /** Where the child is, which way she faces, and the quest's place (null when none on this map). */
  update(dt: number, at: { x: number; z: number; facing: number }, quest: MinimapQuest | null): void;
  /** The characters who offer a minigame on this map (read after the map is up). */
  setSideMarkers(markers: readonly MinimapMarker[]): void;
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
  root.append(disc);
  host.append(root);

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  // Colours from the design tokens (ui/tokens.css) where the game's DOM sits under them.
  const token = (name: string, fallback: string): string => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  const meadow = token('--color-grass', '#9fd38a');
  const outline = token('--color-surface', '#ffffff');
  const ink = token('--color-ink', '#2b2140');

  let at = { x: input.size[0] / 2, z: input.size[1] / 2, facing: 0 };
  let side: readonly MinimapMarker[] = [];
  let quest: MinimapMarker | null = null;
  let questKey = '';
  /** Every marker of the full map, rebuilt only when the quest's place or the side markers change. */
  let markers: readonly MinimapMarker[] = input.markers;
  let wait = 0;
  const rebuild = (): void => {
    markers = [...input.markers, ...side, ...(quest ? [quest] : [])];
  };

  const sheet = createMapSheet({
    base,
    extent: [cw * cell, ch * cell],
    rect: { x0: -MAP_MARGIN, z0: -MAP_MARGIN, x1: input.size[0] + MAP_MARGIN, z1: input.size[1] + MAP_MARGIN },
    title: input.title,
    colours: { meadow, outline, ink },
    onGo: (goal) => input.onGo(goal),
    onClosed: () => {
      delete root.dataset.open;
      drawDisc();
      disc.focus({ preventScroll: true });
    },
  });

  const drawDisc = (): void => {
    const size = Math.max(1, Math.round((discCanvas.getBoundingClientRect().width || 128) * ratio));
    if (discCanvas.width !== size) {
      discCanvas.width = size;
      discCanvas.height = size;
    }
    const ctx = discCanvas.getContext('2d');
    if (!ctx) return;
    const view: MinimapView = { x: at.x, z: at.z, half: DISC_REACH, size };
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = meadow;
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    const [x0, z0] = toMinimap(view, 0, 0);
    const [x1, z1] = toMinimap(view, cw * cell, ch * cell);
    ctx.drawImage(base, x0, z0, x1 - x0, z1 - z0);
    const dot = Math.max(5, size * 0.035);
    for (const m of markers) {
      if (!ON_DISC.has(m.kind) || !onDisc(view, m.x, m.z, dot)) continue;
      const [px, py] = toMinimap(view, m.x, m.z);
      drawMarker(ctx, m.kind, px, py, dot, m.colour, outline);
    }
    const [px, py] = toMinimap(view, at.x, at.z);
    drawPlayer(ctx, px, py, Math.max(7, size * 0.05), at.facing, MARKER_COLOURS.player, outline);
    ctx.restore();
  };

  const open = (): void => {
    root.dataset.open = 'true';
    sheet.show({ markers, player: at });
  };
  disc.addEventListener('click', open);
  // Touches on the disc never reach the game's camera drag under it, nor its guard against text selection
  // (which cancels a touch's click).
  disc.addEventListener('pointerdown', (e) => e.stopPropagation());
  disc.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  return {
    root,
    get covering() {
      return sheet.isOpen;
    },
    update(dt, now, place) {
      at = now;
      const key = place ? `${place.id}:${place.x}:${place.z}` : '';
      if (key !== questKey) {
        questKey = key;
        quest = place ? questMarker(place) : null;
        rebuild();
      }
      if (sheet.isOpen) {
        sheet.update({ markers, player: at });
        return;
      }
      wait -= dt;
      if (wait > 0) return;
      wait = REDRAW_S * (input.lite ? 2 : 1);
      drawDisc();
    },
    setSideMarkers(next) {
      side = next;
      rebuild();
      wait = 0;
    },
    dispose() {
      sheet.dispose();
      root.remove();
    },
  };
}
