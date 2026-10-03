// The box props of the hub, Trung tâm, after the owner's detail mock (designs/trung-tam/d-01 … d-08,
// 02/10/2026): the glowing panes of the portals in each map's colour and the wooden board naming each map
// over its portal (d-06), the shop's sign with its bag (d-02), the quest board with its gold "!" (d-04), the
// team boards of the gazebo (d-05), the signposts at the central bridge (d-07), the airship and balloons
// over the square, the clock face of the tower (d-01), the traders' tables and goods (d-02, d-03), the stage
// trusses and lantern strings of the event ground (d-08), the shop's red carpet, the upper stages of the
// castle's tallest towers (d-01). Signs are lettered in a
// pixel font of 5-row capitals with the Vietnamese marks above (and the dot below), so every name keeps
// its diacritics. Writes content/world/box-props/trung-tam.json; run it after changing a prop:
//   pnpm exec tsx tools/world/structures/trung-tam-props.ts
// then rebuild the props (pnpm assets:box-props) and the manifest. It prints each prop's height for its
// line in content/world/models.json.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BoxPropCatalog, type BoxProp } from '../../../packages/schema/src/world-target';
import { REPO_ROOT } from '../../assets/asset-lib';

type Box = BoxProp['boxes'][number];
type Vec = [number, number, number];

const round = (v: number): number => Math.round(v * 1000) / 1000 + 0;
const box = (from: Vec, to: Vec, color: string, glow = false): Box => ({ from: from.map(round) as Vec, to: to.map(round) as Vec, color, ...(glow ? { glow: true } : {}) });

// ---------------------------------------------------------------------------------------------------------
// Pixel lettering

/** Capitals five rows high ('#' lit), as wide as each needs; the horned U and O carry their horn. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.##.', '#..#', '####', '#..#', '#..#'],
  B: ['###.', '#..#', '###.', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '###.'],
  Đ: ['.###.', '.#..#', '###.#', '.#..#', '.###.'],
  E: ['####', '#...', '###.', '#...', '####'],
  G: ['.###', '#...', '#.##', '#..#', '.###'],
  H: ['#..#', '#..#', '####', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
  L: ['#...', '#...', '#...', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '###.', '#...', '#...'],
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#..#', '#..#', '#..#', '#..#', '.##.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  X: ['#..#', '#..#', '.##.', '#..#', '#..#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  Ư: ['#..##', '#..#.', '#..#.', '#..#.', '.##..'],
  Ơ: ['.##.#', '#..#.', '#..#.', '#..#.', '.##..'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###.', '...#', '.##.', '#...', '####'],
  '!': ['#', '#', '#', '.', '#'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
};
const SPACE = 2;

/** Combining marks of Vietnamese (after NFD): the hats, the tones, the horn and the dot below. */
const HAT = { '̂': 'circumflex', '̆': 'breve' } as const;
const TONE = { '́': 'acute', '̀': 'grave', '̉': 'hook', '̃': 'tilde' } as const;
const HORN = '̛';
const DOT_BELOW = '̣';

/** Pixels of a mark over a letter whose middle column is `m`: rows -1 (just over the letter) and -2. */
function markPixels(mark: string, m: number): Array<[number, number]> {
  switch (mark) {
    case 'circumflex':
      return [[m - 1, -1], [m, -2], [m + 1, -1]];
    case 'breve':
      return [[m - 1, -2], [m, -1], [m + 1, -2]];
    case 'acute':
      return [[m + 1, -2], [m, -1]];
    case 'grave':
      return [[m - 1, -2], [m, -1]];
    case 'hook':
      return [[m - 1, -2], [m, -2], [m, -1]];
    case 'tilde':
      return [[m - 1, -1], [m, -2], [m + 1, -1], [m + 2, -2]];
    default:
      throw new Error(`no mark ${mark}`);
  }
}

/**
 * A line of text as lit pixels (column, row): row 0 is the capitals' top, marks go up to row -4 (a tone over
 * a hat) and the dot below to row 6. Returns them with the line's width in pixels.
 */
export function letter(text: string): { pixels: Array<[number, number]>; width: number } {
  const pixels: Array<[number, number]> = [];
  let x = 0;
  for (const [, base = '', marks = ''] of text.toUpperCase().normalize('NFD').matchAll(/(\P{M})(\p{M}*)/gu)) {
    if (base === ' ') {
      x += SPACE;
      continue;
    }
    const horned = marks.includes(HORN);
    const key = horned && base === 'U' ? 'Ư' : horned && base === 'O' ? 'Ơ' : base;
    const glyph = GLYPHS[key];
    if (!glyph) throw new Error(`no glyph for "${base}" in "${text}"`);
    glyph.forEach((row, r) => [...row].forEach((c, col) => c === '#' && pixels.push([x + col, r])));
    // The middle column the marks sit over (the letter's body, not its horn).
    const bodyWidth = horned ? 4 : (glyph[0]?.length ?? 1);
    const m = Math.floor(bodyWidth / 2);
    const hat = [...marks].map((c) => HAT[c as keyof typeof HAT]).find(Boolean);
    const tone = [...marks].map((c) => TONE[c as keyof typeof TONE]).find(Boolean);
    if (hat) pixels.push(...markPixels(hat, m).map(([px, py]) => [x + px, py] as [number, number]));
    if (tone) pixels.push(...markPixels(tone, m).map(([px, py]) => [x + px, py - (hat ? 2 : 0)] as [number, number]));
    if (marks.includes(DOT_BELOW)) pixels.push([x + m, 6]);
    x += (glyph[0]?.length ?? 1) + 1;
  }
  return { pixels, width: Math.max(0, x - 1) };
}

/**
 * Boxes of a line of text on a board's front (-z): pixels `p` wide, the line centred on `cx`, its capitals'
 * top at `top`, merged into runs along each row. The front is read from -z, so the line runs toward -x.
 */
function textBoxes(text: string, p: number, cx: number, top: number, z: [number, number], color: string, glow = false): Box[] {
  const { pixels, width } = letter(text);
  const rows = new Map<number, number[]>();
  for (const [c, r] of pixels) rows.set(r, [...(rows.get(r) ?? []), c]);
  const out: Box[] = [];
  for (const [r, cols] of [...rows].sort((a, b) => a[0] - b[0])) {
    const sorted = [...new Set(cols)].sort((a, b) => a - b);
    let start = sorted[0] ?? 0;
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i] ?? 0;
      const next = sorted[i + 1];
      if (next === c + 1) continue;
      // Reading column `col` stands at x = cx + width/2 - col (in pixels): the first letter on +x.
      const x0 = cx + (width / 2 - (c + 1)) * p;
      const x1 = cx + (width / 2 - start) * p;
      out.push(box([x0, top - (r + 1) * p, z[0]], [x1, top - r * p, z[1]], color, glow));
      start = next ?? 0;
    }
  }
  return out;
}

/** Rows a line of text takes over and under its capitals (marks), for sizing its board. */
function extent(text: string): { above: number; below: number; width: number } {
  const { pixels, width } = letter(text);
  const rows = pixels.map(([, r]) => r);
  return { above: Math.max(0, -Math.min(0, ...rows)), below: Math.max(0, Math.max(4, ...rows) - 4), width };
}

const WOOD = { frame: '#8a5a32', face: '#4a2f1a', text: '#fff2cf', post: '#6b4423', light: '#b07a45' };

/** A wooden name board (d-06): a light frame round a dark face lettered in cream; its foot at y = 0. */
function nameBoard(text: string, p: number): Box[] {
  const { above, below, width } = extent(text);
  const margin = 2;
  const w = (width + margin * 2) * p;
  const h = (5 + above + below + margin * 2) * p;
  const frame = 0.08;
  return [
    box([-w / 2 - frame, 0, -0.06], [w / 2 + frame, h + frame * 2, 0.06], WOOD.frame),
    box([-w / 2, frame, -0.09], [w / 2, frame + h, -0.06], WOOD.face),
    // Two nails at the top corners.
    box([-w / 2 + 0.04, h + frame * 0.6, -0.1], [-w / 2 + 0.12, h + frame * 1.4, -0.06], '#d8c08a'),
    box([w / 2 - 0.12, h + frame * 0.6, -0.1], [w / 2 - 0.04, h + frame * 1.4, -0.06], '#d8c08a'),
    ...textBoxes(text, p, 0, frame + h - (margin + above) * p, [-0.14, -0.09], WOOD.text),
  ];
}

// ---------------------------------------------------------------------------------------------------------
// The props

/** The portals' colours (d-06), each a map's: the rim, the glow, the light inside and the core. */
export const PORTAL_COLOURS = {
  yellow: ['#f5b70f', '#ffd84d', '#fff0a8', '#fffbe8'],
  green: ['#1fb455', '#5fe08f', '#b4f5cd', '#f0fff5'],
  orange: ['#ff7a12', '#ffab52', '#ffd6a3', '#fff4e6'],
  pink: ['#f2479a', '#ff8fc4', '#ffcde4', '#fff1f8'],
  teal: ['#0fae9e', '#4fe3cf', '#aef3e8', '#edfffc'],
  lime: ['#86bf1e', '#b8e35a', '#e1f6a8', '#fbfff0'],
  blue: ['#2f6ff0', '#6fa8ff', '#bfdcff', '#eef6ff'],
  red: ['#dc2f34', '#ff6f6f', '#ffbdbd', '#fff0f0'],
  ice: ['#3cc3f5', '#94e1ff', '#d8f4ff', '#ffffff'],
  violet: ['#8c3ff5', '#b98cff', '#e1d0ff', '#f8f2ff'],
} as const;
export type PortalColour = keyof typeof PORTAL_COLOURS;

/**
 * A portal's glowing vortex in its arch (placePortal's opening: five wide, four high, three at the top), a
 * tunnel of light with depth seen from either face (owner, 03/10/2026: the pane was flat, "2D"): the glow
 * fills the opening at its middle; rings of light stand out toward each face, wide and deep-coloured at the
 * face, smaller and paler as they go in, so the eye looks down a tunnel to the bright core; sparks hang at
 * every depth, some drifting out in front of the arch.
 */
function portalPane([rim, glow, light, core]: readonly string[]): Box[] {
  const [cRim, cGlow, cLight, cCore] = [rim ?? '#ffffff', glow ?? '#ffffff', light ?? '#ffffff', core ?? '#ffffff'];
  // The glow filling the opening, its middle (seen through every ring).
  const out: Box[] = [box([-2.45, 0, -0.05], [2.45, 4.0, 0.05], cGlow, true), box([-1.45, 4.0, -0.05], [1.45, 4.95, 0.05], cGlow, true)];
  /** A ring of light: the outline of a rectangle `hw` half wide from `y0` to `y1`, `t` thick, between depths z0..z1. */
  const ring = (hw: number, y0: number, y1: number, t: number, z0: number, z1: number, color: string): void => {
    out.push(box([-hw, y0, z0], [-hw + t, y1, z1], color, true));
    out.push(box([hw - t, y0, z0], [hw, y1, z1], color, true));
    out.push(box([-hw, y1 - t, z0], [hw, y1, z1], color, true));
    out.push(box([-hw, y0, z0], [hw, y0 + t, z1], color, true));
  };
  for (const s of [-1, 1]) {
    const at = (a: number, b: number): [number, number] => (s < 0 ? [-b, -a] : [a, b]);
    // From the face inward: the rim's colour at the face, paler rings deeper in, the core at the heart.
    const rings: Array<[number, number, number, number, [number, number], string]> = [
      [2.45, 0, 4.0, 0.32, at(0.55, 0.7), cRim],
      [1.95, 0.35, 3.75, 0.28, at(0.38, 0.55), cGlow],
      [1.45, 0.7, 3.45, 0.26, at(0.22, 0.38), cLight],
      [0.95, 1.05, 3.1, 0.24, at(0.1, 0.22), cCore],
    ];
    for (const [hw, y0, y1, t, [z0, z1], color] of rings) ring(hw, y0, y1, t, z0, z1, color);
    // The arch's top step (three wide) carries the outer ring up into it.
    const [za, zb] = at(0.55, 0.7);
    out.push(box([-1.45, 4.0, za], [1.45, 4.95, zb], cRim, true));
    out.push(box([-1.1, 4.0, za], [1.1, 4.65, zb], cGlow, true));
    // The bright core at the tunnel's end.
    const [ca, cb] = at(0.05, 0.1);
    out.push(box([-0.55, 1.4, ca], [0.55, 2.75, cb], cCore, true));
    // Sparks at every depth: inside the tunnel, at its mouth and drifting out in front of the arch.
    const sparks: Array<[number, number, number, number]> = [
      [-1.7, 3.3, 0.3, 0.14],
      [1.6, 2.5, 0.45, 0.14],
      [-1.2, 0.9, 0.62, 0.16],
      [1.3, 0.6, 0.8, 0.12],
      [0.3, 3.9, 0.9, 0.16],
      [-0.5, 0.4, 1.05, 0.12],
      [0.9, 3.4, 1.2, 0.14],
      [-1.9, 2.0, 1.35, 0.1],
      [2.0, 3.6, 1.5, 0.12],
      [-0.2, 4.5, 1.25, 0.1],
    ];
    for (const [x, y, z, size] of sparks) {
      const [z0, z1] = at(z, z + size);
      out.push(box([x, y, z0], [x + size, y + size, z1], z > 0.7 ? '#ffffff' : cLight, true));
    }
  }
  return out;
}

/** The shop's sign (d-02, d-01): "CỬA HÀNG" lettered in cream on a dark board with a gold bag beside it. */
function shopSign(): Box[] {
  const p = 0.17;
  const text = 'CỬA HÀNG';
  const { above, width } = extent(text);
  const icon = 1.3;
  const margin = 2 * p;
  const w = width * p + icon + 0.35 + margin * 2;
  const h = (5 + above) * p + margin * 2;
  const frame = 0.12;
  // The bag on the reading left (+x), the text to its right.
  const bagX = w / 2 - margin - icon / 2;
  const textCx = bagX - icon / 2 - 0.35 - (width * p) / 2;
  const capTop = frame + margin + 5 * p;
  return [
    box([-w / 2 - frame, 0, -0.08], [w / 2 + frame, h + frame * 2, 0.08], WOOD.frame),
    box([-w / 2, frame, -0.11], [w / 2, frame + h, -0.08], '#3f2716'),
    box([-w / 2 - frame - 0.05, h + frame * 2, -0.2], [w / 2 + frame + 0.05, h + frame * 2 + 0.12, 0.1], WOOD.post),
    // The bag: a gold body, its flap, a dark lock and two handles.
    box([bagX - 0.55, frame + margin, -0.16], [bagX + 0.55, frame + margin + 0.95, -0.11], '#e8b54a'),
    box([bagX - 0.55, frame + margin + 0.62, -0.18], [bagX + 0.55, frame + margin + 0.95, -0.16], '#f4cd6a'),
    box([bagX - 0.08, frame + margin + 0.5, -0.2], [bagX + 0.08, frame + margin + 0.66, -0.16], WOOD.post),
    box([bagX - 0.38, frame + margin + 0.95, -0.15], [bagX - 0.28, frame + margin + 1.25, -0.11], '#e8b54a'),
    box([bagX + 0.28, frame + margin + 0.95, -0.15], [bagX + 0.38, frame + margin + 1.25, -0.11], '#e8b54a'),
    box([bagX - 0.38, frame + margin + 1.17, -0.15], [bagX + 0.38, frame + margin + 1.27, -0.11], '#e8b54a'),
    ...textBoxes(text, p, textCx, capTop, [-0.16, -0.11], WOOD.text),
  ];
}

/** Sheets pinned on a board: a cream page with lines and a red pin, its top-left corner at (x, y). */
function notice(x: number, y: number, w: number, h: number, z: number, pin: string): Box[] {
  const out: Box[] = [box([x - w, y - h, z - 0.02], [x, y, z], '#fdf6e3')];
  for (let k = 0; k < 4; k++) {
    const ly = y - 0.25 - k * 0.17;
    if (ly < y - h + 0.08) break;
    out.push(box([x - w + 0.1 + (k % 2) * 0.1, ly - 0.04, z - 0.03], [x - 0.1, ly, z - 0.02], '#8f7f63'));
  }
  out.push(box([x - w / 2 - 0.05, y - 0.12, z - 0.05], [x - w / 2 + 0.05, y - 0.02, z - 0.02], pin));
  return out;
}

/** The quest board (d-04): a big wooden board on two posts under a shingle roof, notices pinned on it, its name over it and a gold "!" disc on top. */
function questBoard(): Box[] {
  const out: Box[] = [];
  for (const x of [-2.4, 2.15]) out.push(box([x, 0, -0.12], [x + 0.25, 4.0, 0.12], WOOD.post));
  out.push(box([-2.2, 0.85, -0.08], [2.2, 3.15, 0.08], WOOD.light), box([-2.05, 0.95, -0.11], [2.05, 3.05, -0.08], '#c8945a'));
  out.push(box([-2.3, 0.75, -0.3], [2.3, 0.85, 0.05], WOOD.post));
  out.push(...notice(2.0, 2.9, 1.0, 1.25, -0.11, '#d33a2c'), ...notice(0.85, 2.75, 0.9, 1.0, -0.11, '#2f6ff0'), ...notice(-0.2, 2.95, 0.95, 1.45, -0.11, '#d33a2c'), ...notice(-1.25, 2.6, 0.7, 0.9, -0.11, '#2fa34a'), ...notice(0.4, 1.55, 0.8, 0.5, -0.11, '#e8b54a'));
  // Its name on a plate over the board.
  const p = 0.055;
  const name = 'BẢNG NHIỆM VỤ';
  const { above, below } = extent(name);
  const plateH = (5 + above + below + 3) * p;
  out.push(box([-1.85, 3.18, -0.1], [1.85, 3.18 + plateH, 0.06], WOOD.face), ...textBoxes(name, p, 0, 3.18 + plateH - (1.5 + above) * p, [-0.14, -0.1], WOOD.text));
  // Shingle roof over it all.
  out.push(box([-2.85, 4.0, -0.55], [2.85, 4.15, 0.45], '#8a3b2a'), box([-2.6, 4.15, -0.4], [2.6, 4.3, 0.3], '#a8492f'), box([-2.3, 4.3, -0.22], [2.3, 4.42, 0.12], '#8a3b2a'));
  // The gold disc with its "!" (glowing, as the mock's), stepped round.
  const disc: Array<[number, number]> = [[0.32, 0], [0.5, 0.1], [0.58, 0.25], [0.6, 0.4], [0.58, 0.85], [0.5, 1.0], [0.32, 1.1]];
  for (let i = 0; i + 1 < disc.length; i++) {
    const [r, y0] = disc[i] ?? [0, 0];
    const y1 = disc[i + 1]?.[1] ?? y0;
    out.push(box([-r, 4.45 + y0, -0.1], [r, 4.45 + y1, 0.1], '#ffc928', true));
  }
  out.push(box([-0.42, 4.6, -0.12], [0.42, 5.4, -0.1], '#ffe27a', true));
  out.push(box([-0.09, 4.86, -0.15], [0.09, 5.35, -0.12], '#7a4a00'), box([-0.09, 4.66, -0.15], [0.09, 4.8, -0.12], '#7a4a00'));
  return out;
}

/** A team's board hanging from the gazebo's beam (d-05): white letters on a dark board, two cords up to y 0.9. */
function teamBoard(text: string): Box[] {
  const p = 0.07;
  const { width } = extent(text);
  const w = (width + 4) * p;
  const h = 9 * p;
  return [
    box([-w / 2, 0, -0.04], [w / 2, h, 0.04], '#23232b'),
    box([-w / 2 - 0.04, h - 0.04, -0.05], [w / 2 + 0.04, h, 0.05], '#8a5a32'),
    box([-w / 2 + 0.15, h, -0.015], [-w / 2 + 0.19, 0.9, 0.015], '#3b2a1a'),
    box([w / 2 - 0.19, h, -0.015], [w / 2 - 0.15, 0.9, 0.015], '#3b2a1a'),
    ...textBoxes(text, p, 0, h - 2 * p, [-0.07, -0.04], '#ffffff'),
  ];
}

/**
 * A signpost at the central bridge (d-07): a post on a stone foot, a lantern on top, three arrow boards out to
 * the reader's left (`side` -1) or right (+1), each naming a district with an arrow toward it.
 */
function signpost(names: readonly string[], side: -1 | 1): Box[] {
  const out: Box[] = [box([-0.32, 0, -0.32], [0.32, 0.45, 0.32], '#9a9aa3'), box([-0.13, 0.45, -0.13], [0.13, 4.25, 0.13], WOOD.post)];
  out.push(box([-0.22, 4.25, -0.22], [0.22, 4.35, 0.22], '#2b2b30'), box([-0.17, 4.35, -0.17], [0.17, 4.85, 0.17], '#ffd36b', true), box([-0.24, 4.85, -0.24], [0.24, 4.97, 0.24], '#2b2b30'), box([-0.06, 4.97, -0.06], [0.06, 5.1, 0.06], '#2b2b30'));
  const p = 0.065;
  names.forEach((name, i) => {
    const text = side < 0 ? `< ${name}` : `${name} >`;
    const { above, below, width } = extent(text);
    const w = (width + 5) * p;
    const h = (5 + 4 + Math.max(above, 2) + below) * p;
    const yTop = 3.95 - i * 0.82;
    // The reader's left is +x on the front (-z) face: a board out to the left runs toward +x.
    const [near, far] = side < 0 ? [0.13, 0.13 + w] : [-0.13, -0.13 - w];
    const [x0, x1] = [Math.min(near, far), Math.max(near, far)];
    out.push(box([x0, yTop - h, -0.07], [x1, yTop, 0.07], WOOD.frame), box([x0 + 0.05, yTop - h + 0.05, -0.1], [x1 - 0.05, yTop - 0.05, -0.07], WOOD.face));
    // The pointed end: two steps past the board's far edge.
    const dir = Math.sign(far - near);
    for (const [k, inset] of [[1, 0.12], [2, 0.24]] as const) {
      const xa = far + dir * (k - 1) * 0.12;
      const xb = far + dir * k * 0.12;
      out.push(box([Math.min(xa, xb), yTop - h + inset, -0.07], [Math.max(xa, xb), yTop - inset, 0.07], WOOD.frame));
    }
    out.push(...textBoxes(text, p, (x0 + x1) / 2, yTop - (2 + Math.max(above, 2)) * p, [-0.13, -0.1], WOOD.text));
  });
  return out;
}

/** A cigar of slices along x: each slice a cross of two boxes (round enough from afar), coloured by `paint`. */
function spindle(length: number, radius: number, cy: number, paint: (x: number) => string): Box[] {
  const out: Box[] = [];
  const n = Math.round(length / 0.5);
  for (let i = 0; i < n; i++) {
    const x0 = -length / 2 + i * 0.5;
    const t = (x0 + 0.25) / (length / 2);
    const r = radius * Math.sqrt(Math.max(0.05, 1 - t * t));
    const c = paint(x0 + 0.25);
    out.push(box([x0, cy - r, -r * 0.72], [x0 + 0.5, cy + r, r * 0.72], c), box([x0, cy - r * 0.72, -r], [x0 + 0.5, cy + r * 0.72, r], c));
  }
  return out;
}

/** The airship over the square (d-01): a cream envelope with red and gold bands, fins, a gondola with lit windows. */
function airship(): Box[] {
  const out = spindle(11, 1.9, 3.1, (x) => (Math.abs(x) < 0.3 ? '#e8b23a' : Math.abs(Math.abs(x) - 3) < 0.3 ? '#d9434a' : x > 4.5 ? '#c9c2b0' : '#f2ead8'));
  out.push(box([-5.6, 3.0, -0.08], [-4.4, 5.6, 0.08], '#d9434a'), box([-5.6, 3.0, -2.5], [-4.4, 3.2, 2.5], '#d9434a'), box([-5.9, 2.85, -0.15], [-5.5, 3.35, 0.15], '#5a5a62'));
  out.push(box([-1.6, 0, -0.55], [1.6, 0.7, 0.55], '#8a5a32'), box([-1.7, 0.7, -0.6], [1.7, 0.85, 0.6], '#6b4423'));
  for (const x of [-1.1, -0.35, 0.4, 1.15]) for (const z of [-0.57, 0.53]) out.push(box([x - 0.2, 0.25, z], [x + 0.2, 0.55, z + 0.04], '#ffd36b', true));
  for (const x of [-1.4, 1.4]) for (const z of [-0.45, 0.45]) out.push(box([x - 0.03, 0.85, z - 0.03], [x + 0.03, 1.55, z + 0.03], '#3b2a1a'));
  return out;
}

/** A hot-air balloon: an envelope of stacked bands in `bands`' colours, ropes and a wicker basket. */
function balloon(bands: readonly string[]): Box[] {
  const out: Box[] = [box([-0.45, 0, -0.45], [0.45, 0.6, 0.45], '#8a5a32'), box([-0.5, 0.55, -0.5], [0.5, 0.65, 0.5], '#6b4423')];
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] as const) out.push(box([x - 0.03, 0.65, z - 0.03], [x + 0.03, 1.7, z + 0.03], '#3b2a1a'));
  const profile = [0.7, 1.1, 1.5, 1.85, 2.05, 2.15, 2.15, 2.05, 1.85, 1.5, 1.0];
  profile.forEach((r, i) => {
    const y0 = 1.7 + i * 0.45;
    const c = bands[i % bands.length] ?? '#ffffff';
    out.push(box([-r, y0, -r * 0.72], [r, y0 + 0.45, r * 0.72], c), box([-r * 0.72, y0, -r], [r * 0.72, y0 + 0.45, r], c));
  });
  return out;
}

/**
 * The upper stage of the castle's tallest towers (d-01), above the 48-block world: a stone shaft as wide as
 * the tower with rows of lit windows, a cornice, a tall stepped red roof and a flag, so the castle rises over
 * the square as high as in the mock. Its foot sits on the tower's cornice.
 */
function towerCrown(radius: number): Box[] {
  const stone = '#b4b8bf';
  const dark = '#8f949c';
  const w = radius + 0.4;
  const shaft = 10;
  const out: Box[] = [box([-w, 0, -w * 0.72], [w, shaft, w * 0.72], stone), box([-w * 0.72, 0, -w], [w * 0.72, shaft, w], stone)];
  for (let y = 2; y < shaft - 1; y += 3) {
    for (const [x, z, sx, sz] of [[0, -w, 0.35, 0.06], [0, w, 0.35, 0.06], [-w, 0, 0.06, 0.35], [w, 0, 0.06, 0.35]] as const) {
      out.push(box([x - sx - 0.02, y, z - sz - 0.02], [x + sx + 0.02, y + 1.2, z + sz + 0.02], '#ffd36b', true));
    }
  }
  const c = w + 1;
  out.push(box([-c, shaft, -c * 0.72], [c, shaft + 0.8, c * 0.72], dark), box([-c * 0.72, shaft, -c], [c * 0.72, shaft + 0.8, c], dark));
  const roof = Math.round(c * 2.3);
  for (let k = 0; k < roof; k++) {
    const r = c * (1 - k / roof) + 0.15;
    const y0 = shaft + 0.8 + k;
    out.push(box([-r, y0, -r * 0.72], [r, y0 + 1, r * 0.72], '#c0402f'), box([-r * 0.72, y0, -r], [r * 0.72, y0 + 1, r], '#c0402f'));
  }
  const tip = shaft + 0.8 + roof;
  out.push(box([-0.08, tip, -0.08], [0.08, tip + 3, 0.08], '#6b4423'), box([0.08, tip + 1.8, -0.04], [1.6, tip + 2.9, 0.04], '#d9434a'));
  return out;
}

/** The clock tower's face (d-01): a cream dial in a dark frame, hour marks and two hands; front -z. */
function clockFace(): Box[] {
  const out: Box[] = [box([-1.3, 0, -0.06], [1.3, 2.6, 0.06], '#3b3b45'), box([-1.12, 0.18, -0.09], [1.12, 2.42, -0.06], '#f6efd9'), box([-1.0, 0.3, -0.1], [1.0, 2.3, -0.09], '#fbf6e8')];
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const [x, y] = [Math.sin(a) * 0.85, 1.3 + Math.cos(a) * 0.85];
    const s = h % 3 === 0 ? 0.09 : 0.05;
    out.push(box([x - s, y - s, -0.12], [x + s, y + s, -0.1], '#3b3b45'));
  }
  out.push(box([-0.04, 1.26, -0.13], [0.04, 1.95, -0.11], '#3b3b45'), box([0, 1.26, -0.14], [0.5, 1.34, -0.12], '#3b3b45'), box([-0.08, 1.22, -0.15], [0.08, 1.38, -0.13], '#d9434a'));
  return out;
}

/** A traders' table (d-03): a plank top on four legs, a cloth and the goods `items` (colour, x, z, size, glow). */
function tradeTable(cloth: string, items: ReadonlyArray<readonly [string, number, number, number, boolean?]>): Box[] {
  const out: Box[] = [box([-0.85, 0.68, -0.48], [0.85, 0.78, 0.48], WOOD.light)];
  for (const x of [-0.75, 0.65]) for (const z of [-0.4, 0.3]) out.push(box([x, 0, z], [x + 0.1, 0.68, z + 0.1], WOOD.post));
  out.push(box([-0.6, 0.78, -0.5], [0.6, 0.8, 0.35], cloth), box([-0.6, 0.55, -0.52], [0.6, 0.8, -0.5], cloth));
  for (const [c, x, z, s, glow] of items) out.push(box([x - s / 2, 0.8, z - s / 2], [x + s / 2, 0.8 + s, z + s / 2], c, glow ?? false));
  return out;
}

/** A heap of coloured goods on a counter (d-02): little cubes stacked two high. */
function goodsPile(): Box[] {
  const colours = ['#3a8cff', '#ffc928', '#ff6fb1', '#5fd068', '#9b6bff', '#ff8a3d'];
  const out: Box[] = [];
  let k = 0;
  for (const [x, z, y] of [[-0.35, -0.2, 0], [0, -0.2, 0], [0.35, -0.2, 0], [-0.18, 0.15, 0], [0.18, 0.15, 0], [-0.18, -0.02, 0.28], [0.18, -0.02, 0.28], [0, 0.0, 0.54]] as const) {
    out.push(box([x - 0.14, y, z - 0.14], [x + 0.14, y + 0.27, z + 0.14], colours[k++ % colours.length] ?? '#ffffff'));
  }
  return out;
}

/** A stage truss (d-08): a black lattice tower with two spotlights on top. */
function truss(): Box[] {
  const out: Box[] = [];
  const h = 6.4;
  for (const x of [-0.3, 0.22]) for (const z of [-0.3, 0.22]) out.push(box([x, 0, z], [x + 0.08, h, z + 0.08], '#2b2b30'));
  for (let y = 0.6; y < h; y += 0.6) {
    out.push(box([-0.3, y, -0.3], [0.3, y + 0.05, -0.25], '#3b3b42'), box([-0.3, y, 0.25], [0.3, y + 0.05, 0.3], '#3b3b42'));
    out.push(box([-0.3, y, -0.3], [-0.25, y + 0.05, 0.3], '#3b3b42'), box([0.25, y, -0.3], [0.3, y + 0.05, 0.3], '#3b3b42'));
  }
  out.push(box([-0.4, h, -0.4], [0.4, h + 0.12, 0.4], '#2b2b30'));
  for (const [x, c] of [[-0.22, '#ffe9a8'], [0.22, '#ff9ccb']] as const) out.push(box([x - 0.14, h - 0.35, -0.55], [x + 0.14, h - 0.07, -0.3], c, true));
  return out;
}

/** A string of paper lanterns (d-08), six blocks long, hanging from its rope at y 0.85. */
function lanternString(): Box[] {
  const out: Box[] = [box([-3, 0.82, -0.02], [3, 0.86, 0.02], '#3b2a1a')];
  for (let i = 0; i < 6; i++) {
    const x = -2.5 + i;
    const sag = 0.15 * Math.sin((Math.PI * (i + 0.5)) / 6);
    const c = i % 2 === 0 ? '#ff5a3c' : '#ffb03b';
    out.push(box([x - 0.03, 0.62 - sag, -0.03], [x + 0.03, 0.82, 0.03], '#3b2a1a'), box([x - 0.17, 0.2 - sag, -0.17], [x + 0.17, 0.6 - sag, 0.17], c, true));
    out.push(box([x - 0.12, 0.6 - sag, -0.12], [x + 0.12, 0.65 - sag, 0.12], '#3b2a1a'), box([x - 0.12, 0.15 - sag, -0.12], [x + 0.12, 0.2 - sag, 0.12], '#3b2a1a'));
  }
  return out;
}

/** The shop's red carpet (d-02): seven long, three wide, a gold border. */
function carpet(): Box[] {
  return [box([-1.5, 0, -3.5], [1.5, 0.03, 3.5], '#e2b13c'), box([-1.35, 0.03, -3.35], [1.35, 0.05, 3.35], '#b3263a')];
}

/** Every box prop of the hub (content/world/box-props/trung-tam.json), by id. */
export function trungTamProps(regionNames: Readonly<Record<string, string>>): Record<string, BoxProp> {
  const props: Record<string, BoxProp> = {};
  for (const [colour, shades] of Object.entries(PORTAL_COLOURS)) props[`tt-portal-${colour}`] = { boxes: portalPane(shades) };
  for (const [map, name] of Object.entries(regionNames)) props[`tt-sign-${map}`] = { boxes: nameBoard(name, 0.1) };
  props['tt-sign-shop'] = { boxes: shopSign() };
  props['tt-quest-board'] = { boxes: questBoard() };
  props['tt-sign-team-1'] = { boxes: teamBoard('TEAM 1') };
  props['tt-sign-team-2'] = { boxes: teamBoard('TEAM 2') };
  props['tt-signpost-west'] = { boxes: signpost(['Khu sống', 'Khu học tập', 'Khu mua bán'], -1) };
  props['tt-signpost-east'] = { boxes: signpost(['Lâu đài', 'Thư viện', 'Cảng biển'], 1) };
  props['tt-airship'] = { boxes: airship() };
  props['tt-balloon-rainbow'] = { boxes: balloon(['#e5383b', '#ff8a1f', '#ffd23f', '#5fd068', '#3a8cff', '#9b6bff']) };
  props['tt-balloon-blue'] = { boxes: balloon(['#2f6ff0', '#f5f0e6', '#ffd23f', '#f5f0e6']) };
  props['tt-clock-face'] = { boxes: clockFace() };
  props['tt-trade-table-gems'] = { boxes: tradeTable('#3f6fb5', [['#3a8cff', -0.4, -0.1, 0.18, true], ['#9b4dff', -0.1, 0.1, 0.16, true], ['#ff5fa8', 0.15, -0.15, 0.15, true], ['#ffcc33', 0.45, 0.05, 0.12], ['#ffcc33', 0.45, 0.05, 0.24]]) };
  props['tt-trade-table-toys'] = { boxes: tradeTable('#b8333d', [['#e5383b', -0.45, -0.1, 0.22], ['#ffd23f', -0.15, 0.1, 0.2], ['#5fd068', 0.15, -0.12, 0.24], ['#3a8cff', 0.45, 0.08, 0.18]]) };
  props['tt-trade-table-potions'] = { boxes: tradeTable('#4f8a3c', [['#59d8ff', -0.4, -0.05, 0.16, true], ['#ff6fb1', -0.15, 0.12, 0.16, true], ['#9be15d', 0.1, -0.1, 0.16, true], ['#f2e3b3', 0.42, 0.05, 0.22]]) };
  props['tt-goods-pile'] = { boxes: goodsPile() };
  props['tt-truss'] = { boxes: truss() };
  props['tt-lantern-string'] = { boxes: lanternString() };
  props['tt-carpet'] = { boxes: carpet() };
  props['tt-tower-crown-3'] = { boxes: towerCrown(3) };
  props['tt-tower-crown-4'] = { boxes: towerCrown(4) };
  return props;
}

/** Height of a prop's top (for its line in content/world/models.json). */
export const propHeight = (prop: BoxProp): number => round(Math.max(...prop.boxes.flatMap((b) => [b.from[1], b.to[1]])));

/** One box per line, so the file stays readable and diffable. */
function catalogJson(props: Record<string, BoxProp>): string {
  const entries = Object.entries(props).map(([id, prop]) => `    ${JSON.stringify(id)}: {\n      "boxes": [\n${prop.boxes.map((b) => `        ${JSON.stringify(b)}`).join(',\n')}\n      ]\n    }`);
  return `{\n  "version": 1,\n  "props": {\n${entries.join(',\n')}\n  }\n}\n`;
}

async function main(): Promise<void> {
  const regions = JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/regions.json'), 'utf8')) as { regions: Array<{ id: string; name: string; map?: string }> };
  const names = Object.fromEntries(regions.regions.filter((r) => r.map && r.id !== 'trung-tam').map((r) => [r.id, r.name]));
  const props = trungTamProps(names);
  BoxPropCatalog.parse({ version: 1, props });
  await writeFile(path.join(REPO_ROOT, 'content/world/box-props/trung-tam.json'), catalogJson(props));
  for (const [id, prop] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) console.log(`    "generated/box-props/${id}.glb": { "height": ${propHeight(prop)} },`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
