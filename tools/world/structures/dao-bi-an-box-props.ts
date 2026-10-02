// The mystery island's own props of boxes (content/world/box-props/dao-bi-an.json), after the owner's detail
// mock (designs/dao-bi-an/d-01 … d-14, 02/10/2026): the dock's hanging lanterns and the rowing boats of the
// rides, the pirates' black-sailed ship and their skull flag, the gold of the treasure room (heaps, an open
// chest, the golden guardians), the glowing crystals of the cave and the temple, glowing mushrooms and
// fireflies of the night forest, the volcano's smoke, a map table, a wreck, drying nets, vines, torches.
// Written as code so each shape stays readable; run this file to rewrite the catalogue, then
// `pnpm assets:box-props` builds the models. Prints each prop's height for content/world/models.json.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../../assets/asset-lib';

type Vec = [number, number, number];
interface Box {
  from: Vec;
  to: Vec;
  color: string;
  glow?: boolean;
}

const r2 = (v: number): number => Math.round(v * 1000) / 1000;
const box = (from: Vec, to: Vec, color: string, glow = false): Box => ({ from: from.map(r2) as Vec, to: to.map(r2) as Vec, color, ...(glow ? { glow: true } : {}) });
/** A box by its middle (x, z), its foot `y0` and its size. */
const block = (x: number, y0: number, z: number, w: number, h: number, d: number, color: string, glow = false): Box => box([x - w / 2, y0, z - d / 2], [x + w / 2, y0 + h, z + d / 2], color, glow);

const WOOD = '#8a5a32';
const WOOD_DARK = '#5e3b22';
const WOOD_LIGHT = '#c98f5a';
const IRON = '#2f3238';
const GOLD = '#d9a92e';
const GOLD_GLOW = '#ffd75a';
const SAIL = '#f4efe2';
const STONE = '#7d838e';
const FLAME = '#ff9f2e';
const FLAME_TIP = '#ffe08a';

/** A dock post with an arm and a lantern hanging from it (d-02). */
function dockLantern(): Box[] {
  return [
    block(0, 0, 0, 0.32, 3.2, 0.32, WOOD_DARK),
    block(0, 0, 0, 0.5, 0.25, 0.5, WOOD),
    box([-0.16, 2.95, -0.09], [1, 3.12, 0.09], WOOD_DARK),
    box([0.2, 2.6, -0.06], [0.5, 2.95, 0.06], WOOD_DARK),
    block(0.78, 2.72, 0, 0.04, 0.23, 0.04, IRON),
    block(0.78, 2.66, 0, 0.42, 0.08, 0.42, IRON),
    block(0.78, 2.12, 0, 0.32, 0.54, 0.32, '#ffc65a', true),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx = 0, sz = 0]) => block(0.78 + sx * 0.18, 2.1, sz * 0.18, 0.06, 0.58, 0.06, IRON)),
    block(0.78, 2.02, 0, 0.42, 0.08, 0.42, IRON),
  ];
}

/** The ride's rowing boat with a little sail (lengthwise along x). */
function rowboat(): Box[] {
  return [
    box([-1.5, 0, -0.55], [1.5, 0.32, 0.55], WOOD),
    box([-1.6, 0.32, -0.65], [1.6, 0.62, -0.5], WOOD_LIGHT),
    box([-1.6, 0.32, 0.5], [1.6, 0.62, 0.65], WOOD_LIGHT),
    box([1.5, 0.15, -0.45], [1.95, 0.62, 0.45], WOOD),
    box([-1.75, 0.2, -0.45], [-1.5, 0.62, 0.45], WOOD),
    box([-0.9, 0.38, -0.5], [-0.6, 0.48, 0.5], WOOD_DARK),
    box([0.5, 0.38, -0.5], [0.8, 0.48, 0.5], WOOD_DARK),
    block(0, 0.3, 0, 0.12, 2.4, 0.12, WOOD_DARK),
    box([0.08, 0.95, -0.05], [1.25, 1.15, 0.05], SAIL),
    box([0.08, 1.15, -0.05], [1.1, 1.55, 0.05], SAIL),
    box([0.08, 1.55, -0.05], [0.85, 1.95, 0.05], SAIL),
    box([0.08, 1.95, -0.05], [0.55, 2.3, 0.05], SAIL),
    box([0.06, 1.45, -0.06], [1.15, 1.5, 0.06], '#3fa7e0'),
    box([0.06, 2.5, -0.03], [0.55, 2.7, 0.03], '#d9342b'),
    box([-2.1, 0.45, -0.04], [-1.6, 0.55, 0.04], WOOD_DARK),
  ];
}

/** The pirates' ship (d-12): a dark hull, two masts under black sails with a white skull, a red flag. */
function pirateShip(): Box[] {
  const HULL = '#4a3020';
  const BLACK = '#22232a';
  const WHITE = '#f1ede0';
  const sail = (mx: number, y0: number, h: number, half: number): Box[] => [
    box([mx + 0.12, y0, -half], [mx + 0.26, y0 + h, half], BLACK),
    box([mx + 0.08, y0 + h, -half - 0.3], [mx + 0.3, y0 + h + 0.14, half + 0.3], WOOD_DARK),
  ];
  /** The skull and crossbones on one face of a sail (`out` +1 its front, -1 its back). */
  const skullFace = (mx: number, cy: number, out: 1 | -1): Box[] => {
    const at = (d0: number, d1: number): [number, number] => (out > 0 ? [mx + 0.26 + d0, mx + 0.26 + d1] : [mx + 0.12 - d1, mx + 0.12 - d0]);
    const [w0, w1] = at(0, 0.06);
    const [e0, e1] = at(0.05, 0.08);
    return [
      box([w0, cy - 0.35, -0.42], [w1, cy + 0.45, 0.42], WHITE),
      box([w0, cy - 0.6, -0.24], [w1, cy - 0.35, 0.24], WHITE),
      box([e0, cy, -0.3], [e1, cy + 0.22, -0.08], BLACK),
      box([e0, cy, 0.08], [e1, cy + 0.22, 0.3], BLACK),
      box([w0, cy - 1.15, -0.85], [w1, cy - 0.95, 0.85], WHITE),
      box([w0, cy - 1.35, -0.1], [w1, cy - 0.75, 0.1], WHITE),
    ];
  };
  const skull = (mx: number, cy: number): Box[] => [...skullFace(mx, cy, 1), ...skullFace(mx, cy, -1)];
  return [
    box([-4, 0, -1.2], [4, 0.8, 1.2], HULL),
    box([-4.2, 0.8, -1.3], [4.2, 1.25, -1.05], WOOD),
    box([-4.2, 0.8, 1.05], [4.2, 1.25, 1.3], WOOD),
    box([-3.9, 0.7, -1.05], [3.9, 0.84, 1.05], WOOD_LIGHT),
    box([4, 0.3, -0.8], [5, 1.25, 0.8], HULL),
    box([5, 0.9, -0.08], [6.4, 1.04, 0.08], WOOD_DARK),
    box([-4, 0.8, -1.2], [-2.2, 2.6, 1.2], HULL),
    box([-4.15, 2.6, -1.3], [-2.05, 2.8, 1.3], WOOD_DARK),
    box([-3.6, 1.5, -1.22], [-3.1, 1.95, -1.2], '#ffd36b', true),
    box([-3.6, 1.5, 1.2], [-3.1, 1.95, 1.22], '#ffd36b', true),
    ...[-1, 1, 3].map((x) => box([x - 0.2, 0.35, -1.24], [x + 0.2, 0.62, -1.2], IRON)),
    ...[-1, 1, 3].map((x) => box([x - 0.2, 0.35, 1.2], [x + 0.2, 0.62, 1.24], IRON)),
    block(-0.6, 0.8, 0, 0.18, 7.2, 0.18, WOOD_DARK),
    block(2.4, 0.8, 0, 0.16, 5.6, 0.16, WOOD_DARK),
    ...sail(-0.6, 3.2, 3.6, 1.7),
    ...sail(-0.6, 7.0, 0.9, 1.0),
    ...skull(-0.6, 5.3),
    ...sail(2.4, 3.0, 2.6, 1.2),
    ...skull(2.4, 4.6),
    box([-0.65, 8.0, -0.03], [-0.55, 8.6, 1.2], '#c0282d'),
    box([-0.7, 8.25, 0.55], [-0.5, 8.4, 0.75], WHITE),
  ];
}

/** Stepped golden coins (d-14), `w` across, `h` high, glinting on top. */
function goldPile(w: number, h: number, gems: boolean): Box[] {
  const out: Box[] = [];
  const steps = Math.max(2, Math.round(h / 0.18));
  for (let i = 0; i < steps; i++) {
    const k = 1 - i / steps;
    const y0 = (h * i) / steps;
    out.push(block(0, y0, 0, w * k, h / steps, w * k * 0.9, i % 2 === 0 ? GOLD : '#e8b833'));
  }
  out.push(block(0, h - 0.02, 0, w * 0.22, 0.08, w * 0.2, GOLD_GLOW, true));
  out.push(block(w * 0.25, h * 0.3, w * 0.1, w * 0.12, 0.06, w * 0.12, GOLD_GLOW, true));
  out.push(block(-w * 0.28, h * 0.2, -w * 0.12, w * 0.12, 0.06, w * 0.12, GOLD_GLOW, true));
  if (gems) {
    out.push(block(-w * 0.15, h * 0.55, w * 0.18, 0.16, 0.16, 0.16, '#d9342b', true));
    out.push(block(w * 0.18, h * 0.5, -w * 0.15, 0.16, 0.16, 0.16, '#3fa7e0', true));
    out.push(block(w * 0.05, h * 0.7, -w * 0.05, 0.14, 0.14, 0.14, '#42d977', true));
    // A golden goblet on the heap.
    out.push(block(w * 0.2, h * 0.62, w * 0.2, 0.08, 0.3, 0.08, GOLD));
    out.push(block(w * 0.2, h * 0.92, w * 0.2, 0.24, 0.22, 0.24, GOLD));
  }
  return out;
}

/** An open chest brimming with gold (d-03, d-14). */
function treasureChest(): Box[] {
  return [
    block(0, 0, 0, 1.1, 0.6, 0.72, '#7a4a24'),
    ...[-0.4, 0, 0.4].map((x) => block(x, 0, 0, 0.1, 0.62, 0.76, GOLD)),
    block(0, 0.6, -0.02, 1.0, 0.18, 0.62, GOLD_GLOW, true),
    block(0, 0.78, -0.05, 0.6, 0.12, 0.4, GOLD, false),
    block(0, 0.6, 0.38, 1.12, 0.55, 0.12, '#7a4a24'),
    block(0, 1.1, 0.38, 1.14, 0.06, 0.14, GOLD),
    block(0, 0.3, -0.37, 0.16, 0.2, 0.04, IRON),
    block(0.25, 0.86, -0.1, 0.14, 0.14, 0.14, '#d9342b', true),
  ];
}

/** A golden guardian on a stone plinth (d-14): legs, body, arms at its sides, a head with a crown. */
function goldStatue(): Box[] {
  const G2 = '#c7952a';
  return [
    block(0, 0, 0, 1.6, 0.6, 1.2, STONE),
    block(0, 0.6, 0, 1.4, 0.12, 1.0, '#6c727c'),
    block(-0.3, 0.72, 0, 0.42, 1.0, 0.5, G2),
    block(0.3, 0.72, 0, 0.42, 1.0, 0.5, G2),
    block(0, 1.72, 0, 1.15, 1.15, 0.65, GOLD),
    block(0, 2.0, -0.34, 0.5, 0.5, 0.04, GOLD_GLOW, true),
    block(-0.72, 1.85, 0, 0.3, 0.95, 0.4, G2),
    block(0.72, 1.85, 0, 0.3, 0.95, 0.4, G2),
    block(0, 2.87, 0, 0.8, 0.75, 0.7, GOLD),
    block(-0.18, 3.25, -0.36, 0.14, 0.1, 0.03, '#ff5a2e', true),
    block(0.18, 3.25, -0.36, 0.14, 0.1, 0.03, '#ff5a2e', true),
    block(0, 3.62, 0, 0.9, 0.16, 0.8, G2),
    ...[-0.32, 0, 0.32].map((x) => block(x, 3.78, 0, 0.14, x === 0 ? 0.42 : 0.28, 0.14, GOLD)),
  ];
}

/** A cluster of glowing crystal prisms on a dark rock (d-08, d-09). */
function crystals(bright: string, pale: string, scale: number): Box[] {
  const s = scale;
  return [
    block(0, 0, 0, 0.9 * s, 0.22 * s, 0.8 * s, '#4a4f5a'),
    block(0, 0.15 * s, 0, 0.26 * s, 1.5 * s, 0.26 * s, bright, true),
    block(0, 1.6 * s, 0, 0.14 * s, 0.2 * s, 0.14 * s, pale, true),
    block(-0.28 * s, 0.12 * s, 0.12 * s, 0.2 * s, 1.0 * s, 0.2 * s, pale, true),
    block(0.3 * s, 0.12 * s, -0.08 * s, 0.22 * s, 0.85 * s, 0.22 * s, bright, true),
    block(0.08 * s, 0.12 * s, 0.32 * s, 0.16 * s, 0.6 * s, 0.16 * s, bright, true),
    block(-0.2 * s, 0.12 * s, -0.3 * s, 0.14 * s, 0.5 * s, 0.14 * s, pale, true),
  ];
}

/** The temple's great crystal (d-09): a diamond of glowing layers over a ring of light. */
function bigCrystal(): Box[] {
  const out: Box[] = [block(0, 0, 0, 1.4, 0.06, 1.4, '#3fa7e0', true)];
  const layers = [[0.2, 0.5], [0.45, 0.4], [0.7, 0.35], [0.95, 0.35], [1.1, 0.3], [0.9, 0.3], [0.65, 0.3], [0.4, 0.3], [0.15, 0.25]] as const;
  let y = 0.55;
  layers.forEach(([w, h], i) => {
    out.push(block(0, y, 0, w, h, w * 0.55, i % 2 === 0 ? '#6fe3ff' : '#a8f0ff', true));
    y += h;
  });
  return out;
}

/** A glowing mushroom of the night forest (d-13). */
function glowMushroom(cap: string, spot: string, h: number): Box[] {
  return [
    block(0, 0, 0, 0.18 * h, 0.6 * h, 0.18 * h, '#e8f4ff'),
    block(0, 0.55 * h, 0, 0.75 * h, 0.22 * h, 0.75 * h, cap, true),
    block(0, 0.77 * h, 0, 0.5 * h, 0.15 * h, 0.5 * h, cap, true),
    block(0.18 * h, 0.78 * h, 0.2 * h, 0.12 * h, 0.06 * h, 0.12 * h, spot, true),
    block(-0.2 * h, 0.7 * h, -0.1 * h, 0.1 * h, 0.06 * h, 0.1 * h, spot, true),
    block(0.32 * h, 0, 0.25 * h, 0.08 * h, 0.3 * h, 0.08 * h, '#e8f4ff'),
    block(0.32 * h, 0.28 * h, 0.25 * h, 0.28 * h, 0.1 * h, 0.28 * h, cap, true),
  ];
}

/** A standing torch (d-07, d-10, d-12). */
function torch(): Box[] {
  return [
    block(0, 0, 0, 0.36, 0.12, 0.36, IRON),
    block(0, 0.12, 0, 0.12, 1.3, 0.12, WOOD_DARK),
    block(0, 1.42, 0, 0.3, 0.1, 0.3, IRON),
    block(0, 1.52, 0, 0.22, 0.25, 0.22, FLAME, true),
    block(0, 1.77, 0, 0.12, 0.13, 0.12, FLAME_TIP, true),
  ];
}

/** The volcano's plume (d-11): dark clouds billowing up, glowing orange at their foot. */
function smoke(): Box[] {
  const greys = ['#55555c', '#6a6a72', '#7e7e86', '#5e5e66', '#8c8c94'];
  // [x, y, z, size]: a narrow column rising from the crater, billowing out wide at its head.
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 3], [0.6, 2, 0.4, 3.6], [-0.5, 4, -0.3, 4.2], [1.2, 6, 0.5, 5], [-1.5, 8, 0.8, 6], [2, 9.5, -0.8, 6.5],
    [-3.5, 11, 0.5, 7], [3.8, 11.5, 1, 7.5], [0, 12.5, -1.5, 9], [-6, 13, -1, 6], [6.5, 13.5, 0.5, 6], [0, 15, 1, 8],
  ];
  return [
    block(0, 0, 0, 3.2, 0.8, 3.2, '#ff7a2e', true),
    block(0, 0.8, 0, 2.4, 1, 2.4, '#ffb347', true),
    ...puffs.map(([x, y, z, s], i) => block(x, y + 1.6, z, s, s * 0.55, s * 0.9, greys[i % greys.length] ?? '#6a6a72')),
  ];
}

/** The captain's map table (d-03): a plank table, the parchment with a red cross and a dotted way, a compass. */
function mapTable(): Box[] {
  return [
    block(0, 0.72, 0, 1.7, 0.1, 1.0, WOOD_LIGHT),
    ...[[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]].map(([x = 0, z = 0]) => block(x, 0, z, 0.1, 0.72, 0.1, WOOD_DARK)),
    block(0, 0.82, 0, 1.2, 0.02, 0.75, '#f1e3b8'),
    block(0.35, 0.84, -0.1, 0.18, 0.02, 0.05, '#c0282d'),
    block(0.35, 0.84, -0.1, 0.05, 0.02, 0.18, '#c0282d'),
    ...[[-0.4, 0.2], [-0.25, 0.1], [-0.1, 0.0], [0.08, -0.06], [0.22, -0.1]].map(([x = 0, z = 0]) => block(x, 0.84, z, 0.05, 0.02, 0.05, '#7a4a24')),
    block(-0.55, 0.84, -0.25, 0.08, 0.02, 0.18, '#3fa7e0'),
    block(-0.5, 0.82, 0.3, 0.22, 0.05, 0.22, GOLD),
    block(-0.5, 0.87, 0.3, 0.04, 0.02, 0.16, '#d9342b'),
  ];
}

/** A wrecked hull half under the water by the beach (d-03). */
function wreck(): Box[] {
  return [
    box([-2.2, 0, -0.8], [1.8, 0.5, 0.8], '#5a3a22'),
    box([-2.2, 0.5, -0.9], [1.2, 0.95, -0.7], WOOD),
    box([-1.4, 0.5, 0.7], [1.8, 1.1, 0.9], WOOD),
    box([1.8, 0.2, -0.5], [2.4, 1.3, 0.5], '#5a3a22'),
    box([-0.5, 0.5, -0.12], [-0.25, 1.6, 0.12], WOOD_DARK),
    box([0.6, 0.5, -0.7], [0.75, 0.75, 0.7], WOOD_LIGHT),
    box([-1.6, 0.5, -0.6], [-1.45, 0.85, 0.6], WOOD_LIGHT),
  ];
}

/** Fireflies of the night forest (d-13): little lights scattered in the air. */
function fireflies(): Box[] {
  const spots: Vec[] = [[0, 0.3, 0], [0.6, 0.9, 0.3], [-0.5, 1.3, -0.4], [0.3, 1.7, -0.6], [-0.7, 0.7, 0.5], [0.8, 1.4, -0.2], [-0.2, 2.0, 0.6], [0.1, 1.1, 0.8]];
  return [block(0, 0, 0, 0.02, 0.02, 0.02, '#2f3a2a'), ...spots.map(([x, y, z], i) => block(x, y, z, 0.1, 0.1, 0.1, i % 3 === 0 ? '#fff6a0' : '#d8ff7a', true))];
}

/** A slab of old stone carved with glowing signs (d-06, d-10), standing on its edge (face toward -z). */
function glyphPanel(): Box[] {
  const GLYPH = '#59f0ff';
  return [
    block(0, 0, 0, 1.3, 1.7, 0.22, '#6c727c'),
    block(0, 1.7, 0, 1.4, 0.12, 0.28, '#5a5f68'),
    block(0, 0.3, -0.12, 0.08, 1.1, 0.03, GLYPH, true),
    block(0, 1.15, -0.12, 0.8, 0.08, 0.03, GLYPH, true),
    block(0, 0.55, -0.12, 0.6, 0.08, 0.03, GLYPH, true),
    block(-0.3, 0.55, -0.12, 0.08, 0.6, 0.03, GLYPH, true),
    block(0.3, 0.55, -0.12, 0.08, 0.6, 0.03, GLYPH, true),
    block(0, 0.85, -0.12, 0.22, 0.22, 0.03, '#b8fbff', true),
  ];
}

/** The pirates' flag on its pole (d-12). */
function skullFlag(): Box[] {
  return [
    block(0, 0, 0, 0.4, 0.2, 0.4, WOOD_DARK),
    block(0, 0, 0, 0.12, 4.2, 0.12, WOOD_DARK),
    box([0.06, 2.7, -0.03], [1.7, 3.9, 0.03], '#1e1e24'),
    box([0.65, 3.25, -0.05], [1.1, 3.7, 0.05], '#f1ede0'),
    box([0.72, 3.12, -0.05], [1.03, 3.25, 0.05], '#f1ede0'),
    box([0.73, 3.42, -0.06], [0.83, 3.55, 0.06], '#1e1e24'),
    box([0.92, 3.42, -0.06], [1.02, 3.55, 0.06], '#1e1e24'),
    box([0.45, 2.92, -0.05], [1.3, 3.02, 0.05], '#f1ede0'),
  ];
}

/** Fishers' net drying between two posts, red floats along its top (the fishing huts by the beach). */
function netRack(): Box[] {
  const NET = '#3d4a45';
  const out: Box[] = [block(-1.1, 0, 0, 0.14, 1.9, 0.14, WOOD_DARK), block(1.1, 0, 0, 0.14, 1.9, 0.14, WOOD_DARK), box([-1.15, 1.75, -0.05], [1.15, 1.85, 0.05], WOOD_DARK)];
  for (let x = -0.9; x <= 0.91; x += 0.3) out.push(box([x - 0.015, 0.45, -0.015], [x + 0.015, 1.75, 0.015], NET));
  for (let y = 0.5; y <= 1.71; y += 0.3) out.push(box([-1.04, y - 0.015, -0.015], [1.04, y + 0.015, 0.015], NET));
  for (const x of [-0.75, -0.15, 0.45]) out.push(block(x, 1.62, 0, 0.14, 0.12, 0.1, '#d9342b'));
  return out;
}

/** Vines hanging from a ledge or a branch (d-04, d-07): strands of leaves `h` long, their top at `h`. */
function vines(h: number): Box[] {
  const greens = ['#3f8a3a', '#5cb85c', '#2f7a34'];
  const strands: Array<[number, number, number]> = [[-0.5, 0, 0.9], [-0.2, 0.1, 0.6], [0.15, -0.05, 1], [0.45, 0.05, 0.75], [0.7, -0.1, 0.5], [-0.75, 0.05, 0.55]];
  const out: Box[] = [box([-0.9, h - 0.1, -0.12], [0.9, h, 0.12], greens[2] ?? '#2f7a34')];
  strands.forEach(([x, z, k], i) => {
    out.push(box([x - 0.05, h - h * k, z - 0.05], [x + 0.05, h, z + 0.05], greens[i % 2] ?? '#3f8a3a'));
    out.push(block(x, h - h * k * 0.6, z, 0.18, 0.14, 0.12, greens[(i + 1) % 2] ?? '#5cb85c'));
  });
  out.push(block(0, 0, 0, 0.02, 0.02, 0.02, greens[0] ?? '#3f8a3a'));
  return out;
}

/** The moon over the night forest (d-13): a round pale disc of boxes, facing -z. */
function moon(): Box[] {
  const PALE = '#f6f2d4';
  return [
    box([-1.6, 0, -0.1], [1.6, 6, 0.1], PALE, true),
    box([-2.4, 0.8, -0.1], [2.4, 5.2, 0.1], PALE, true),
    box([-2.8, 1.6, -0.1], [2.8, 4.4, 0.1], PALE, true),
    box([-0.9, 3.4, -0.13], [-0.2, 4.1, -0.1], '#e4dfbd', true),
    box([0.6, 1.6, -0.13], [1.4, 2.3, -0.1], '#e4dfbd', true),
  ];
}

/** A shaft of light down onto the gold (d-14): thin glowing columns. */
function lightShaft(): Box[] {
  return [
    block(0, 0, 0, 1.6, 0.04, 1.6, '#fff1b0', true),
    block(-0.5, 0, -0.4, 0.06, 7, 0.06, '#fff1b0', true),
    block(0.45, 0, 0.3, 0.06, 7, 0.06, '#fff6cc', true),
    block(0.1, 0, -0.55, 0.05, 7, 0.05, '#fff1b0', true),
    block(-0.3, 0, 0.5, 0.05, 7, 0.05, '#fff6cc', true),
  ];
}

/** A small cannon on its wooden carriage (the pirates' cove). */
function cannon(): Box[] {
  return [
    box([-0.5, 0, -0.35], [0.5, 0.3, 0.35], WOOD),
    block(-0.35, 0, -0.38, 0.3, 0.3, 0.06, WOOD_DARK),
    block(-0.35, 0, 0.38, 0.3, 0.3, 0.06, WOOD_DARK),
    block(0.35, 0, -0.38, 0.3, 0.3, 0.06, WOOD_DARK),
    block(0.35, 0, 0.38, 0.3, 0.3, 0.06, WOOD_DARK),
    box([-0.55, 0.3, -0.2], [0.9, 0.62, 0.2], IRON),
    box([0.9, 0.34, -0.24], [1.0, 0.58, 0.24], IRON),
  ];
}

/** Every prop of the island, by id (the generator places them as generated/box-props/<id>.glb). */
export const DAO_BI_AN_PROPS: Readonly<Record<string, Box[]>> = {
  'dba-big-crystal': bigCrystal(),
  'dba-cannon': cannon(),
  'dba-crystal-blue': crystals('#59d8ff', '#a8f0ff', 1.1),
  'dba-crystal-purple': crystals('#b26bff', '#e0b8ff', 0.95),
  'dba-dock-lantern': dockLantern(),
  'dba-fireflies': fireflies(),
  'dba-glow-mushroom': glowMushroom('#4fd1ff', '#c8f6ff', 1.2),
  'dba-glow-mushroom-pink': glowMushroom('#c77dff', '#f1d6ff', 0.9),
  'dba-glyph-panel': glyphPanel(),
  'dba-gold-chest': treasureChest(),
  'dba-gold-heap': goldPile(2.6, 1.1, true),
  'dba-gold-pile': goldPile(1.2, 0.5, false),
  'dba-gold-statue': goldStatue(),
  'dba-light-shaft': lightShaft(),
  'dba-map-table': mapTable(),
  'dba-moon': moon(),
  'dba-net-rack': netRack(),
  'dba-pirate-ship': pirateShip(),
  'dba-rowboat': rowboat(),
  'dba-skull-flag': skullFlag(),
  'dba-smoke': smoke(),
  'dba-torch': torch(),
  'dba-vines': vines(3),
  'dba-wreck': wreck(),
};

/** Height of a prop in blocks (its boxes from lowest to highest), the line content/world/models.json needs. */
export const propHeight = (boxes: readonly Box[]): number => r2(Math.max(...boxes.map((b) => Math.max(b.from[1], b.to[1]))) - Math.min(...boxes.map((b) => Math.min(b.from[1], b.to[1]))));

async function main(): Promise<void> {
  const file = path.join(REPO_ROOT, 'content/world/box-props/dao-bi-an.json');
  const props = Object.fromEntries(Object.entries(DAO_BI_AN_PROPS).map(([id, boxes]) => [id, { boxes }]));
  await writeFile(file, `${JSON.stringify({ version: 1, props }, null, 1)}\n`);
  for (const [id, boxes] of Object.entries(DAO_BI_AN_PROPS)) console.log(`    "generated/box-props/${id}.glb": { "height": ${propHeight(boxes)} },`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
