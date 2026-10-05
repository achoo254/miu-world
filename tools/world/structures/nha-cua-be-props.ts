// The box props of the child's home, Nhà của bé, after the owner's mock (plan 261003, panels 1–10 and 13): the
// timetable board on the wall over the study desk with its days and periods and the lunch break, the school
// uniform calendar beside the wardrobe, the bed under its pink polka-dot quilt with the bunny pillow, the cat
// rug, the pink curtains, the wardrobe, the little dressing table, the cream sofa with its pink cushions, the
// fridge with its magnets, the children's drawings pinned on the wall, the gallery railing, the two leaves of
// the arched front door, the cat-shaped mailbox, the flag with its cat, the cat's head over the name board,
// the watering can. What opens in the game (the wardrobe's and the fridge's doors, the mailbox's flap, the
// stair cupboard's door, the front door's leaves) is a moving part with its hinge (BoxProp `parts`), with
// something behind it to see when it is open. Boards are lettered with the hub's pixel capitals (trung-tam-props.ts), so the marks of
// "THỜI KHÓA BIỂU" and "LỊCH ĐỒNG PHỤC" stay. Each prop stands on y = 0, its front toward -z. Writes
// content/world/box-props/nha-cua-be.json; run it after changing a prop:
//   pnpm exec tsx tools/world/structures/nha-cua-be-props.ts
// then rebuild the props (pnpm assets:box-props) and the manifest. It prints each prop's height for its line
// in content/world/models.json.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BoxPropCatalog, type BoxProp } from '../../../packages/schema/src/world-target';
import { REPO_ROOT } from '../../assets/asset-lib';
import { box, catalogJson, propHeight, textBoxes } from './trung-tam-props';

type Box = BoxProp['boxes'][number];

/** The boxes as part `name` of their prop (a door, a flap): they turn together about the part's hinge. */
const asPart = (name: string, boxes: Box[]): Box[] => boxes.map((b) => ({ ...b, part: name }));

const WOOD = { dark: '#6b4423', mid: '#8a5a32', light: '#c98f5a', pale: '#e3c193' };
const PINK = { deep: '#e86f9c', mid: '#f4a3bf', pale: '#fbd3e2' };
const CREAM = '#fbf3e1';
const WHITE = '#fffdf8';
const INK = '#3b2a20';

/**
 * A cat's head `size` across centred on (cx, cy), between depths `zFront` (its face, toward -z) and `zBack` (a
 * second face, toward +z): ears with pink insides, eyes, a pink nose and whiskers on both faces.
 */
function catFace(cx: number, cy: number, size: number, zFront: number, fur: string, zBack: number): Box[] {
  const s = size / 2;
  const out: Box[] = [box([cx - s, cy - s * 0.85, zFront], [cx + s, cy + s * 0.75, zBack], fur)];
  for (const side of [-1, 1]) {
    const x = (a: number, b: number): [number, number] => (side < 0 ? [cx - b * s, cx - a * s] : [cx + a * s, cx + b * s]);
    const [e0, e1] = x(0.45, 0.95);
    const [t0, t1] = x(0.6, 0.85);
    out.push(box([e0, cy + s * 0.75, zFront], [e1, cy + s * 1.05, zBack], fur));
    out.push(box([t0, cy + s * 1.05, zFront], [t1, cy + s * 1.3, zBack], fur));
  }
  // Both faces: the front one just before zFront, the back one just behind zBack.
  for (const [z0, z1] of [[zFront - 0.02, zFront], [zBack, zBack + 0.02]] as const) {
    for (const side of [-1, 1]) {
      const x = (a: number, b: number): [number, number] => (side < 0 ? [cx - b * s, cx - a * s] : [cx + a * s, cx + b * s]);
      const [i0, i1] = x(0.62, 0.82);
      const [y0, y1] = x(0.28, 0.52);
      const [w0, w1] = x(0.55, 1.05);
      out.push(box([i0, cy + s * 0.82, z0], [i1, cy + s * 1.02, z1], PINK.mid));
      out.push(box([y0, cy, z0], [y1, cy + s * 0.3, z1], INK));
      for (const dy of [-0.22, -0.38]) out.push(box([w0, cy + s * dy, z0], [w1, cy + s * dy + s * 0.05, z1], INK));
    }
    out.push(box([cx - s * 0.12, cy - s * 0.22, z0], [cx + s * 0.12, cy - s * 0.08, z1], PINK.deep));
  }
  return out;
}

/** "THỜI KHÓA BIỂU" (panel 4): a framed board of the week, five days across and seven periods down, the lunch break between. */
function timetableBoard(): Box[] {
  const out: Box[] = [
    box([-1.3, 0, -0.04], [1.3, 1.8, 0.04], WOOD.mid),
    box([-1.2, 0.1, -0.06], [1.2, 1.7, -0.04], CREAM),
    box([-1.2, 1.36, -0.07], [1.2, 1.7, -0.06], PINK.mid),
    ...textBoxes('THỜI KHÓA BIỂU', 0.026, 0, 1.6, [-0.09, -0.07], INK),
  ];
  // Days across (Monday to Friday), each headed in its colour; periods down, four in the morning, three after lunch.
  const days = ['#ef6f6c', '#f5a742', '#f2d14c', '#6fc27a', '#5aa6e8'];
  const lessons = ['#fde6e3', '#e4f1fb', '#fff3cf', '#e5f6e7', '#efe6fb'];
  const [x0, x1] = [-1.08, 1.08];
  const col = (x1 - x0) / 6;
  // A narrow first column numbers the periods.
  const rows = [1.22, 1.1, 0.98, 0.86, 0.74, 0.56, 0.44, 0.32];
  for (let c = 0; c < 6; c++) {
    const cx0 = x0 + c * col + 0.015;
    const cx1 = x0 + (c + 1) * col - 0.015;
    out.push(box([cx0, 1.24, -0.075], [cx1, 1.33, -0.06], c === 0 ? WOOD.light : days[c - 1] ?? '#ccc'));
    rows.forEach((top, r) => {
      if (r === 4) return; // the lunch break's row
      const shade = c === 0 ? WOOD.pale : lessons[(r + c) % lessons.length] ?? WHITE;
      out.push(box([cx0, top - 0.1, -0.07], [cx1, top, -0.06], shade));
    });
  }
  // NGHỈ TRƯA: a yellow band across the week between the morning and the afternoon.
  out.push(box([x0, 0.6, -0.075], [x1, 0.72, -0.06], '#ffd76a'));
  for (let i = 0; i < 9; i++) out.push(box([x0 + 0.5 + i * 0.13, 0.64, -0.08], [x0 + 0.58 + i * 0.13, 0.68, -0.075], WOOD.mid));
  // Two red pins.
  for (const x of [-1.05, 1.05]) out.push(box([x - 0.04, 1.58, -0.11], [x + 0.04, 1.66, -0.06], '#d9342b'));
  return out;
}

/** "LỊCH ĐỒNG PHỤC" (the uniform days): a hanging calendar, a shirt for each school day in its colour. */
function uniformCalendar(): Box[] {
  const out: Box[] = [
    box([-0.85, 0, -0.03], [0.85, 2.0, 0.03], WHITE),
    box([-0.85, 1.6, -0.05], [0.85, 2.0, -0.03], '#d9342b'),
    ...textBoxes('LỊCH ĐỒNG PHỤC', 0.02, 0, 1.88, [-0.07, -0.05], WHITE),
    // The rings it hangs by.
    box([-0.5, 1.95, -0.06], [-0.42, 2.12, 0.02], '#4a4a52'),
    box([0.42, 1.95, -0.06], [0.5, 2.12, 0.02], '#4a4a52'),
  ];
  // Monday to Friday: a day tab, then a shirt (white with a red scarf, blue, sports yellow, white, blue).
  const tabs = ['#ef6f6c', '#f5a742', '#f2d14c', '#6fc27a', '#5aa6e8'];
  const shirts: Array<[string, string | null]> = [[WHITE, '#d9342b'], ['#7fb6ea', null], ['#ffd34d', '#2f6ff0'], [WHITE, '#d9342b'], ['#7fb6ea', null]];
  for (let i = 0; i < 5; i++) {
    const top = 1.5 - i * 0.29;
    out.push(box([-0.75, top - 0.22, -0.05], [-0.45, top, -0.03], tabs[i] ?? '#ccc'));
    const [shirt, trim] = shirts[i] ?? [WHITE, null];
    const cx = 0.15;
    // A T-shirt: body, sleeves, and a scarf or a collar stripe; outlined on the white page by a grey back.
    out.push(box([cx - 0.17, top - 0.23, -0.045], [cx + 0.17, top - 0.01, -0.03], '#9aa0a8'));
    out.push(box([cx - 0.15, top - 0.22, -0.055], [cx + 0.15, top - 0.02, -0.045], shirt));
    out.push(box([cx - 0.27, top - 0.09, -0.055], [cx + 0.27, top - 0.02, -0.045], shirt));
    if (trim) out.push(box([cx - 0.04, top - 0.12, -0.065], [cx + 0.04, top - 0.02, -0.055], trim));
    out.push(box([0.48, top - 0.14, -0.05], [0.72, top - 0.1, -0.03], '#c8c2b6'));
  }
  return out;
}

// ——— Styles the child picks (content/home/decor.json): each family of props shares one size, so any pick
// stands where the default stood and takes no more floor. ———

/**
 * A flat picture of `cols` x `rows` cells of side `cell`, centred on (cx, cy) in the plane facing -z (`plane`
 * 'xy', between depths z[0] and z[1]) or lying on the floor (`plane` 'xz', between heights z[0] and z[1], its
 * top row toward +z): each cell's colour from `at` (null leaves it out), cells of one colour merged along rows.
 */
function pixels(cols: number, rows: number, cell: number, cx: number, cy: number, z: [number, number], plane: 'xy' | 'xz', at: (i: number, j: number) => string | null): Box[] {
  const out: Box[] = [];
  for (let j = 0; j < rows; j++) {
    let i = 0;
    while (i < cols) {
      const colour = at(i, j);
      let k = i + 1;
      while (k < cols && at(k, j) === colour) k++;
      if (colour) {
        const x0 = cx + (i - cols / 2) * cell;
        const x1 = cx + (k - cols / 2) * cell;
        const v0 = cy + (rows / 2 - j - 1) * cell;
        const v1 = cy + (rows / 2 - j) * cell;
        out.push(plane === 'xy' ? box([x0, v0, z[0]], [x1, v1, z[1]], colour) : box([x0, z[0], v0], [x1, z[1], v1], colour));
      }
      i = k;
    }
  }
  return out;
}

/** Little pictures (7 x 7) for quilts, rugs and flags: '#' is the mark's colour, '.' leaves the cloth. */
const MARKS: Readonly<Record<string, readonly string[]>> = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  flower: ['..###..', '.##.##.', '###.###', '.##.##.', '..###..', '...#...', '..###..'],
  paw: ['.#...#.', '.#.#.#.', '.......', '..###..', '.#####.', '.#####.', '..#.#..'],
  bunny: ['.#...#.', '.#...#.', '.#...#.', '.#####.', '#######', '#.###.#', '.#####.'],
  leaf: ['....##.', '...###.', '..####.', '.####..', '.###...', '.#.....', '#......'],
  moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
};

/** A mark's cells: `at(i, j)` is true where it is drawn. */
const markAt = (mark: keyof typeof MARKS) => (i: number, j: number): boolean => (MARKS[mark]?.[j] ?? '').charAt(i) === '#';

type QuiltPattern = 'dots' | 'stars' | 'stripes' | 'flowers' | 'hearts' | 'checks' | 'rainbow';
type PillowAnimal = 'bunny' | 'bear' | 'cat' | 'duck';
interface BedStyle {
  quilt: string;
  pattern: QuiltPattern;
  mark: string;
  pillow: PillowAnimal;
  frame: string;
  head: string;
}

/** The pillow animals: its body, its ears (or none), its face's marks. */
function pillow(animal: PillowAnimal): Box[] {
  const fur = { bunny: WHITE, bear: '#c98f5a', cat: '#f0a04b', duck: '#ffd23f' }[animal];
  const out: Box[] = [box([-0.48, 0.6, 0.6], [0.48, 0.86, 1.08], fur)];
  if (animal === 'bunny') {
    for (const x of [-0.23, 0.23]) {
      out.push(box([x - 0.07, 0.86, 0.82], [x + 0.07, 1.26, 0.9], WHITE));
      out.push(box([x - 0.04, 0.92, 0.81], [x + 0.04, 1.2, 0.82], PINK.mid));
    }
  } else if (animal === 'bear') {
    for (const x of [-0.32, 0.32]) out.push(box([x - 0.1, 0.86, 0.8], [x + 0.1, 1.04, 0.92], '#a8743f'));
    out.push(box([-0.14, 0.64, 0.57], [0.14, 0.76, 0.6], '#e9c79a'));
  } else if (animal === 'cat') {
    for (const side of [-1, 1]) {
      out.push(box([side * 0.4 - 0.1, 0.86, 0.82], [side * 0.4 + 0.1, 0.98, 0.9], fur));
      out.push(box([side * 0.4 - 0.05 - side * 0.03, 0.98, 0.82], [side * 0.4 + 0.05 - side * 0.03, 1.06, 0.9], fur));
    }
    for (const side of [-1, 1]) out.push(box([side * 0.26 - 0.12, 0.69, 0.58], [side * 0.26 + 0.12, 0.7, 0.6], INK));
  } else {
    out.push(box([-0.09, 0.66, 0.5], [0.09, 0.74, 0.6], '#f5a742'));
  }
  for (const x of [-0.16, 0.16]) out.push(box([x - 0.04, 0.74, 0.58], [x + 0.04, 0.82, 0.6], INK));
  if (animal !== 'duck') out.push(box([-0.04, 0.68, 0.58], [0.04, 0.73, 0.6], PINK.deep));
  return out;
}

/** A bed of panel 3, in a style: a wooden frame, the quilt and its pattern, a pillow animal at its head (+z). */
function styledBed(s: BedStyle): Box[] {
  const out: Box[] = [
    box([-0.85, 0, -1.25], [0.85, 0.36, 1.25], s.frame),
    box([-0.8, 0.36, -1.18], [0.8, 0.6, 1.2], WHITE),
    box([-0.84, 0.55, -1.22], [0.84, 0.7, 0.42], s.quilt),
    box([-0.84, 0.25, -1.24], [0.84, 0.55, -1.2], s.quilt),
    // Headboard (+z) with a heart, footboard (-z).
    box([-0.92, 0, 1.2], [0.92, 1.45, 1.32], s.head),
    box([-0.18, 1.0, 1.18], [0.18, 1.24, 1.2], s.mark),
    box([-0.92, 0, -1.34], [0.92, 0.82, -1.24], s.head),
    ...pillow(s.pillow),
  ];
  // A canopy over the bed (panel 3's princess bed): four slim posts, a cloth roof in the quilt's colour with a
  // scalloped valance, drapes tied back at the head.
  const cloth = s.pattern === 'rainbow' ? PINK.pale : s.quilt;
  for (const x of [-0.88, 0.88]) for (const z of [-1.3, 1.26]) out.push(box([x - 0.04, 0, z - 0.04], [x + 0.04, 2.5, z + 0.04], s.head));
  out.push(box([-0.95, 2.48, -1.36], [0.95, 2.56, 1.34], cloth));
  for (const [x0, x1, z0, z1] of [[-0.95, 0.95, -1.38, -1.34], [-0.95, 0.95, 1.34, 1.38], [-0.97, -0.93, -1.36, 1.34], [0.93, 0.97, -1.36, 1.34]] as const) {
    out.push(box([x0, 2.3, z0], [x1, 2.48, z1], cloth));
    out.push(box([x0, 2.26, z0], [x1, 2.3, z1], s.mark === WHITE ? PINK.deep : s.mark));
  }
  for (const x of [-0.84, 0.66]) out.push(box([x, 0.9, 1.1], [x + 0.18, 2.3, 1.24], cloth), box([x - 0.02, 1.35, 1.08], [x + 0.2, 1.45, 1.26], s.mark === WHITE ? PINK.deep : s.mark));
  // The pattern over the quilt's top, a picture 8 cells across and 8 down.
  const rainbow = ['#ef6f6c', '#f5a742', '#f2d14c', '#6fc27a', '#5aa6e8', '#a77de0'];
  const at = (i: number, j: number): string | null => {
    if (s.pattern === 'dots') return i % 2 === 0 && (j + Math.floor(i / 2)) % 2 === 0 ? s.mark : null;
    if (s.pattern === 'stripes') return i % 2 === 0 ? s.mark : null;
    if (s.pattern === 'checks') return (i + j) % 2 === 0 ? s.mark : null;
    if (s.pattern === 'rainbow') return rainbow[Math.floor((j * 6) / 8)] ?? null;
    // Stars, flowers, hearts: a little mark in alternate quarters.
    const mark = s.pattern === 'stars' ? 'star' : s.pattern === 'flowers' ? 'flower' : 'heart';
    const [qi, qj] = [Math.floor(i / 4), Math.floor(j / 4)];
    return (qi + qj) % 2 === 0 && markAt(mark)(Math.min(6, (i % 4) * 2), Math.min(6, (j % 4) * 2)) ? s.mark : null;
  };
  out.push(...pixels(8, 8, 0.2, 0, -0.4, [0.7, 0.712], 'xz', at));
  return out;
}

const BEDS: Readonly<Record<string, BedStyle>> = {
  'ncb-bed-pink': { quilt: PINK.mid, pattern: 'dots', mark: WHITE, pillow: 'bunny', frame: WOOD.light, head: WOOD.mid },
  'ncb-bed-blue': { quilt: '#7fb6ea', pattern: 'stars', mark: '#ffe066', pillow: 'bear', frame: WOOD.light, head: WOOD.mid },
  'ncb-bed-mint': { quilt: '#9fe0c4', pattern: 'stripes', mark: WHITE, pillow: 'cat', frame: WHITE, head: '#e8e0d2' },
  'ncb-bed-yellow': { quilt: '#ffe08a', pattern: 'flowers', mark: '#f08a5d', pillow: 'duck', frame: WOOD.pale, head: WOOD.light },
  'ncb-bed-lilac': { quilt: '#cdb4f0', pattern: 'hearts', mark: PINK.deep, pillow: 'bunny', frame: WHITE, head: '#f0e6fa' },
  'ncb-bed-red': { quilt: '#e2584f', pattern: 'checks', mark: WHITE, pillow: 'bear', frame: WOOD.mid, head: WOOD.dark },
  'ncb-bed-rainbow': { quilt: WHITE, pattern: 'rainbow', mark: '#5aa6e8', pillow: 'cat', frame: WOOD.light, head: WOOD.mid },
};

/** The study desk (panel 4) in a colour: a top 1.6 x 0.8 at 0.78, a cabinet of drawers on the left, legs on the right. */
function styledDesk(top: string, body: string, knob: string): Box[] {
  return [
    box([-0.8, 0.72, -0.4], [0.8, 0.78, 0.4], top),
    box([-0.78, 0, -0.38], [-0.28, 0.72, 0.38], body),
    ...[0.18, 0.44].map((y) => box([-0.74, y, -0.4], [-0.32, y + 0.22, -0.38], top)),
    ...[0.27, 0.53].map((y) => box([-0.57, y, -0.42], [-0.49, y + 0.05, -0.4], knob)),
    ...[-0.32, 0.32].map((z) => box([0.66, 0, z - 0.06], [0.78, 0.72, z + 0.06], body)),
    box([-0.28, 0.6, 0.3], [0.72, 0.72, 0.36], body),
  ];
}

const DESKS: Readonly<Record<string, [string, string, string]>> = {
  'ncb-desk-oak': [WOOD.pale, WOOD.light, WOOD.dark],
  'ncb-desk-white': [WHITE, '#e8e0d2', '#e2b13c'],
  'ncb-desk-pink': [PINK.pale, PINK.mid, WHITE],
  'ncb-desk-blue': ['#dcecfb', '#7fb6ea', WHITE],
  'ncb-desk-mint': ['#e2f6ec', '#8fd4b4', WHITE],
  'ncb-desk-yellow': ['#fff3cf', '#f6c945', WOOD.dark],
};

/**
 * A wardrobe of panel 3 in a colour: two doors with knobs (hinged at the sides, opening outward), a crown with its
 * mark, feet; behind the doors a dark inside with a rail and three hanging clothes.
 */
function styledWardrobe(body: string, doors: string, crown: string, mark: string): BoxProp {
  return {
    boxes: [
      box([-0.8, 0.12, -0.35], [0.8, 2.5, 0.35], body),
      ...asPart('door-left', [
        box([-0.75, 0.2, -0.37], [-0.03, 2.4, -0.35], doors),
        box([-0.12, 1.2, -0.4], [-0.06, 1.4, -0.37], '#e2b13c'),
        ...pixels(7, 7, 0.06, -0.39, 1.95, [-0.39, -0.37], 'xy', (i, j) => (markAt('heart')(i, j) ? mark : null)),
      ]),
      ...asPart('door-right', [
        box([0.03, 0.2, -0.37], [0.75, 2.4, -0.35], doors),
        box([0.06, 1.2, -0.4], [0.12, 1.4, -0.37], '#e2b13c'),
        ...pixels(7, 7, 0.06, 0.39, 1.95, [-0.39, -0.37], 'xy', (i, j) => (markAt('star')(i, j) ? mark : null)),
      ]),
      box([-0.86, 2.5, -0.4], [0.86, 2.62, 0.4], crown),
      box([-0.3, 2.62, -0.2], [0.3, 2.72, 0.2], mark),
      ...[-0.7, 0.7].flatMap((x) => [-0.28, 0.28].map((z) => box([x - 0.06, 0, z - 0.06], [x + 0.06, 0.12, z + 0.06], WOOD.dark))),
      // Inside, hidden by the closed doors.
      box([-0.74, 0.21, -0.356], [0.74, 2.39, -0.35], '#7a5234'),
      box([-0.7, 2.08, -0.364], [0.7, 2.11, -0.356], '#b8bfc9'),
      box([-0.6, 1.2, -0.364], [-0.3, 2.06, -0.356], PINK.mid),
      box([-0.2, 1.5, -0.364], [0.15, 2.06, -0.356], '#6fa8dc'),
      box([0.28, 1.3, -0.364], [0.6, 2.06, -0.356], '#ffd23f'),
      box([-0.7, 0.21, -0.364], [0.7, 0.24, -0.356], '#5c3c22'),
    ],
    parts: { 'door-left': { pivot: [-0.75, 0, -0.36], axis: 'y', angle: 100 }, 'door-right': { pivot: [0.75, 0, -0.36], axis: 'y', angle: -100 } },
  };
}

const WARDROBES: Readonly<Record<string, [string, string, string, string]>> = {
  'ncb-wardrobe': [WOOD.light, WOOD.pale, PINK.mid, PINK.deep],
  'ncb-wardrobe-white': ['#f3ede2', WHITE, '#9fd4c9', '#5aa6e8'],
  'ncb-wardrobe-blue': ['#6fa8e0', '#a9cdf2', WHITE, '#ffe066'],
  'ncb-wardrobe-mint': ['#7cc9a6', '#b8ead2', WHITE, PINK.deep],
  'ncb-wardrobe-lilac': ['#b49ae0', '#dccaf4', WHITE, PINK.deep],
  'ncb-wardrobe-yellow': ['#f2c14e', '#fde7a2', WOOD.mid, '#ef6f6c'],
};

/** Side of a rug's picture cell: sixteen across make a rug about three blocks wide, a room's centre. */
const RUG_CELL = 0.19;

/** A round rug about three across, a picture on it (16 x 16 cells): its ground, its mark, its border. */
function pictureRug(ground: string, border: string, at: (u: number, v: number) => string | null): Box[] {
  const n = 16;
  return pixels(n, n, RUG_CELL, 0, 0, [0, 0.03], 'xz', (i, j) => {
    const [u, v] = [(i + 0.5) / n - 0.5, (j + 0.5) / n - 0.5];
    const r = Math.hypot(u, v);
    if (r > 0.5) return null;
    if (r > 0.43) return border;
    return at(u, v) ?? ground;
  });
}

/** A mark of MARKS drawn in the middle of a rug (u, v in -0.5..0.5), `size` of the rug across. */
const rugMark = (mark: keyof typeof MARKS, colour: string, size = 0.62) => (u: number, v: number): string | null => {
  const [i, j] = [Math.floor((u / size + 0.5) * 7), Math.floor((0.5 - v / size) * 7)];
  return i >= 0 && j >= 0 && i < 7 && j < 7 && markAt(mark)(i, j) ? colour : null;
};

const RUGS: Readonly<Record<string, () => Box[]>> = {
  'ncb-rug-rainbow': () => pictureRug(WHITE, '#a77de0', (_u, v) => ['#ef6f6c', '#f5a742', '#f2d14c', '#6fc27a', '#5aa6e8'][Math.floor((v + 0.5) * 5)] ?? null),
  'ncb-rug-heart': () => pictureRug(PINK.pale, PINK.deep, rugMark('heart', PINK.deep)),
  'ncb-rug-star': () => pictureRug('#3f5f9e', '#ffe066', rugMark('star', '#ffe066')),
  'ncb-rug-flower': () => pictureRug('#e8f6d6', '#6fc27a', rugMark('flower', '#f08a5d')),
  'ncb-rug-leaf': () => pictureRug('#fff3cf', '#5fae5a', rugMark('leaf', '#5fae5a')),
  'ncb-rug-checks': () => pictureRug(WHITE, '#d9342b', (u, v) => ((Math.floor((u + 0.5) * 6) + Math.floor((v + 0.5) * 6)) % 2 === 0 ? '#ef7f78' : null)),
};

/** Curtains (panels 2, 3) in colours: a rod, two drawn panels tied back, a scalloped valance; for a window two wide. */
function styledCurtains(main: string, deep: string, pale: string): Box[] {
  const out: Box[] = [
    box([-1.25, 2.12, -0.06], [1.25, 2.2, 0], WOOD.dark),
    box([-1.2, 1.92, -0.1], [1.2, 2.12, -0.06], pale),
  ];
  for (const side of [-1, 1]) {
    const [a, b] = side < 0 ? [-1.2, -0.72] : [0.72, 1.2];
    out.push(box([a, 0.15, -0.09], [b, 1.92, -0.03], main));
    out.push(box([a - 0.02, 0.95, -0.1], [b + 0.02, 1.05, -0.08], deep));
  }
  for (let i = 0; i < 6; i++) out.push(box([-1.2 + i * 0.4 + 0.05, 1.86, -0.11], [-1.2 + i * 0.4 + 0.35, 1.92, -0.09], deep));
  return out;
}

const CURTAINS: Readonly<Record<string, [string, string, string]>> = {
  'ncb-curtains-pink': [PINK.mid, PINK.deep, PINK.pale],
  'ncb-curtains-blue': ['#8cc0ef', '#4f86d9', '#d6e9fb'],
  'ncb-curtains-yellow': ['#ffd86b', '#f5a742', '#fff3cf'],
  'ncb-curtains-mint': ['#9fe0c4', '#4caf8a', '#e2f6ec'],
  'ncb-curtains-lilac': ['#cdb4f0', '#8a5fd0', '#f0e6fa'],
  'ncb-curtains-lace': [WHITE, '#d9cbb4', '#f6efe2'],
  'ncb-curtains-red': ['#e2584f', '#a8322b', '#f8d0cc'],
};

/** A floor lamp's pole and foot (in `colour`), `height` high. */
const lampPole = (height: number, colour: string): Box[] => [box([-0.25, 0, -0.25], [0.25, 0.06, 0.25], colour), box([-0.04, 0.06, -0.04], [0.04, height, 0.04], colour)];

const FLOOR_LAMPS: Readonly<Record<string, () => Box[]>> = {
  // A red toadstool, its white spots, lamplight glowing under its cap.
  'ncb-lamp-mushroom': () => [
    box([-0.12, 0, -0.12], [0.12, 1.2, 0.12], CREAM),
    box([-0.4, 1.2, -0.4], [0.4, 1.28, 0.4], '#ffe9a8', true),
    box([-0.42, 1.28, -0.42], [0.42, 1.55, 0.42], '#e2584f'),
    box([-0.28, 1.55, -0.28], [0.28, 1.68, 0.28], '#e2584f'),
    ...[[-0.25, -0.43], [0.2, -0.43], [-0.43, 0.1], [0.43, -0.15]].map(([x, z]) => box([(x ?? 0) - 0.06, 1.35, (z ?? 0) - 0.02], [(x ?? 0) + 0.06, 1.45, (z ?? 0) + 0.02], WHITE)),
    box([-0.07, 1.62, -0.29], [0.07, 1.67, -0.27], WHITE),
  ],
  'ncb-lamp-star': () => [...lampPole(1.25, WOOD.dark), ...pixels(7, 7, 0.09, 0, 1.5, [-0.06, 0.06], 'xy', (i, j) => (markAt('star')(i, j) ? '#ffe066' : null)).map((b) => ({ ...b, glow: true }))],
  'ncb-lamp-moon': () => [...lampPole(1.2, '#4a4a52'), ...pixels(7, 7, 0.09, 0.05, 1.5, [-0.06, 0.06], 'xy', (i, j) => (markAt('moon')(i, j) ? '#fff1b8' : null)).map((b) => ({ ...b, glow: true }))],
  // A lantern on a post: a dark frame round glowing glass, a little roof.
  'ncb-lamp-lantern': () => [
    ...lampPole(1.25, '#3f4248'),
    box([-0.2, 1.25, -0.2], [0.2, 1.3, 0.2], '#3f4248'),
    box([-0.16, 1.3, -0.16], [0.16, 1.66, 0.16], '#ffd36b', true),
    ...[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z]) => box([(x ?? 0) - 0.03, 1.3, (z ?? 0) - 0.03], [(x ?? 0) + 0.03, 1.66, (z ?? 0) + 0.03], '#3f4248')),
    box([-0.24, 1.66, -0.24], [0.24, 1.72, 0.24], '#3f4248'),
    box([-0.12, 1.72, -0.12], [0.12, 1.8, 0.12], '#3f4248'),
  ],
  // A tall tulip: a green stem with two leaves, a pink bloom glowing.
  'ncb-lamp-flower': () => [
    box([-0.22, 0, -0.22], [0.22, 0.08, 0.22], '#4caf8a'),
    box([-0.04, 0.08, -0.04], [0.04, 1.3, 0.04], '#4caf8a'),
    box([0.04, 0.5, -0.03], [0.3, 0.6, 0.03], '#5fbf6a'),
    box([-0.3, 0.75, -0.03], [-0.04, 0.85, 0.03], '#5fbf6a'),
    box([-0.2, 1.3, -0.2], [0.2, 1.62, 0.2], PINK.mid, true),
    ...[-0.14, 0, 0.14].map((x) => box([x - 0.05, 1.62, -0.06], [x + 0.05, 1.74, 0.06], PINK.deep, true)),
  ],
};

/** A picket fence two blocks long in a colour: pointed pales on two rails, deep enough to stop the child. */
function styledPicket(pale: string, rail: string): Box[] {
  const out: Box[] = [box([-1, 0.25, -0.16], [1, 0.33, 0.16], rail), box([-1, 0.62, -0.16], [1, 0.7, 0.16], rail)];
  for (let i = 0; i < 6; i++) {
    const x = -0.85 + i * 0.34;
    out.push(box([x - 0.07, 0, -0.05], [x + 0.07, 0.86, 0.05], pale));
    out.push(box([x - 0.04, 0.86, -0.05], [x + 0.04, 0.95, 0.05], pale));
  }
  return out;
}

const PICKETS: Readonly<Record<string, [string, string]>> = {
  'ncb-picket-white': [WHITE, '#e8e0d2'],
  'ncb-picket-pink': [PINK.pale, PINK.mid],
  'ncb-picket-blue': ['#cfe4fa', '#7fb6ea'],
  'ncb-picket-yellow': ['#fff0b8', '#f2c14e'],
  'ncb-picket-wood': [WOOD.light, WOOD.mid],
  'ncb-picket-mint': ['#d8f3e6', '#8fd4b4'],
};

/** A clipped hedge two blocks long with flowers in it, as high and deep as the fences. */
function hedge(): Box[] {
  const out: Box[] = [box([-1, 0, -0.3], [1, 0.9, 0.3], '#4f9d4a'), box([-0.95, 0.9, -0.25], [0.95, 1.0, 0.25], '#5fae5a')];
  const blooms: Array<[number, number, number, string]> = [[-0.7, 0.6, -1, PINK.mid], [-0.2, 0.3, -1, '#ffe066'], [0.35, 0.7, -1, PINK.deep], [0.75, 0.35, -1, WHITE], [-0.45, 0.4, 1, '#ffe066'], [0.1, 0.7, 1, PINK.mid], [0.6, 0.5, 1, WHITE]];
  for (const [x, y, side, c] of blooms) out.push(box([x - 0.06, y - 0.06, side * 0.3 - (side > 0 ? 0 : 0.02)], [x + 0.06, y + 0.06, side * 0.3 + (side > 0 ? 0.02 : 0)], c));
  return out;
}

/** Garden lights by the walk, about 2.6 high: a post and its glowing head. */
const GARDEN_LAMPS: Readonly<Record<string, () => Box[]>> = {
  'ncb-garden-lamp-mushroom': () => [
    box([-0.15, 0, -0.15], [0.15, 1.8, 0.15], CREAM),
    box([-0.5, 1.8, -0.5], [0.5, 1.88, 0.5], '#ffe9a8', true),
    box([-0.55, 1.88, -0.55], [0.55, 2.25, 0.55], '#e2584f'),
    box([-0.35, 2.25, -0.35], [0.35, 2.4, 0.35], '#e2584f'),
    ...[[-0.3, -0.56], [0.25, -0.56], [-0.56, 0.1], [0.56, -0.2], [0.1, 0.56]].map(([x, z]) => box([(x ?? 0) - 0.08, 2.0, (z ?? 0) - 0.02], [(x ?? 0) + 0.08, 2.12, (z ?? 0) + 0.02], WHITE)),
  ],
  'ncb-garden-lamp-star': () => [box([-0.3, 0, -0.3], [0.3, 0.1, 0.3], '#3f4248'), box([-0.06, 0.1, -0.06], [0.06, 1.9, 0.06], '#3f4248'), ...pixels(7, 7, 0.12, 0, 2.3, [-0.08, 0.08], 'xy', (i, j) => (markAt('star')(i, j) ? '#ffe066' : null)).map((b) => ({ ...b, glow: true }))],
  'ncb-garden-lamp-flower': () => [
    box([-0.06, 0, -0.06], [0.06, 1.9, 0.06], '#4caf8a'),
    box([0.06, 0.8, -0.04], [0.42, 0.92, 0.04], '#5fbf6a'),
    box([-0.42, 1.2, -0.04], [-0.06, 1.32, 0.04], '#5fbf6a'),
    box([-0.28, 1.9, -0.28], [0.28, 2.35, 0.28], PINK.mid, true),
    ...[-0.2, 0, 0.2].map((x) => box([x - 0.07, 2.35, -0.08], [x + 0.07, 2.52, 0.08], PINK.deep, true)),
  ],
  // A white globe on a black post, stacked boxes round as a ball.
  'ncb-garden-lamp-globe': () => [
    box([-0.3, 0, -0.3], [0.3, 0.12, 0.3], '#2f3136'),
    box([-0.07, 0.12, -0.07], [0.07, 1.95, 0.07], '#2f3136'),
    box([-0.22, 1.95, -0.22], [0.22, 2.0, 0.22], '#2f3136'),
    box([-0.2, 2.0, -0.2], [0.2, 2.06, 0.2], '#fff6dc', true),
    box([-0.28, 2.06, -0.28], [0.28, 2.38, 0.28], '#fff6dc', true),
    box([-0.2, 2.38, -0.2], [0.2, 2.46, 0.2], '#fff6dc', true),
  ],
};

type FaceAnimal = 'dog' | 'bunny' | 'bear' | 'panda' | 'fox' | 'chick';

/** An animal's head `size` across on both faces (the name board's crest, panel 13), like the cat's. */
function animalFace(animal: FaceAnimal, cx: number, cy: number, size: number, zFront: number, zBack: number): Box[] {
  const s = size / 2;
  const fur = { dog: '#c98f5a', bunny: WHITE, bear: '#a8743f', panda: WHITE, fox: '#f08a3c', chick: '#ffd23f' }[animal];
  const out: Box[] = [box([cx - s, cy - s * 0.85, zFront], [cx + s, cy + s * 0.75, zBack], fur)];
  for (const side of [-1, 1]) {
    const ex = cx + side * s * 0.7;
    if (animal === 'dog') out.push(box([ex - s * 0.18 + side * s * 0.2, cy - s * 0.5, zFront - 0.03], [ex + s * 0.18 + side * s * 0.2, cy + s * 0.7, zBack + 0.03], '#8a5a32'));
    if (animal === 'bunny') out.push(box([ex - s * 0.16 - side * s * 0.25, cy + s * 0.75, zFront], [ex + s * 0.16 - side * s * 0.25, cy + s * 1.7, zBack], WHITE));
    if (animal === 'bear' || animal === 'panda') out.push(box([ex - s * 0.22, cy + s * 0.6, zFront], [ex + s * 0.22, cy + s * 1.0, zBack], animal === 'panda' ? INK : '#8a5a32'));
    if (animal === 'fox') out.push(box([ex - s * 0.2, cy + s * 0.75, zFront], [ex + s * 0.2, cy + s * 1.25, zBack], fur));
    if (animal === 'chick') out.push(box([cx - s * 0.1, cy + s * 0.75, zFront], [cx + s * 0.1, cy + s * 1.05, zBack], '#f5a742'));
  }
  for (const [z0, z1] of [[zFront - 0.02, zFront], [zBack, zBack + 0.02]] as const) {
    for (const side of [-1, 1]) {
      const ex = cx + side * s * 0.38;
      if (animal === 'panda') out.push(box([ex - s * 0.2, cy - s * 0.05, z0], [ex + s * 0.2, cy + s * 0.4, z1], INK));
      out.push(box([ex - s * 0.1, cy + s * 0.05, z0 - (animal === 'panda' ? 0.01 : 0)], [ex + s * 0.1, cy + s * 0.3, z1 + (animal === 'panda' ? 0.01 : 0)], animal === 'panda' ? WHITE : INK));
      out.push(box([cx + side * s * 0.62 - s * 0.1, cy - s * 0.35, z0], [cx + side * s * 0.62 + s * 0.1, cy - s * 0.2, z1], PINK.mid));
    }
    if (animal === 'chick') out.push(box([cx - s * 0.15, cy - s * 0.3, z0 - 0.02], [cx + s * 0.15, cy - s * 0.05, z1 + 0.02], '#f5a742'));
    else out.push(box([cx - s * 0.12, cy - s * 0.22, z0], [cx + s * 0.12, cy - s * 0.06, z1], animal === 'bunny' || animal === 'panda' ? PINK.deep : INK));
  }
  return out;
}

const SIGN_ANIMALS: Readonly<Record<string, FaceAnimal>> = {
  'ncb-sign-dog': 'dog',
  'ncb-sign-bunny': 'bunny',
  'ncb-sign-bear': 'bear',
  'ncb-sign-panda': 'panda',
  'ncb-sign-fox': 'fox',
  'ncb-sign-chick': 'chick',
};

/** A flag on its pole (panel 1), its cloth in a colour with a mark on both sides. */
function styledFlag(cloth: string, mark: keyof typeof MARKS, ink: string): Box[] {
  return [
    box([-0.06, 0, -0.06], [0.06, 3.5, 0.06], WOOD.dark),
    box([-0.1, 3.5, -0.1], [0.1, 3.66, 0.1], '#e2b13c'),
    box([0.06, 2.5, -0.03], [1.36, 3.4, 0.03], cloth),
    ...pixels(7, 7, 0.1, 0.71, 2.95, [-0.05, -0.03], 'xy', (i, j) => (markAt(mark)(i, j) ? ink : null)),
    ...pixels(7, 7, 0.1, 0.71, 2.95, [0.03, 0.05], 'xy', (i, j) => (markAt(mark)(6 - i, j) ? ink : null)),
  ];
}

const FLAGS: Readonly<Record<string, [string, keyof typeof MARKS, string]>> = {
  'ncb-flag-dog': ['#7fb6ea', 'paw', WHITE],
  'ncb-flag-bunny': ['#cdb4f0', 'bunny', WHITE],
  'ncb-flag-star': ['#3f5f9e', 'star', '#ffe066'],
  'ncb-flag-heart': [WHITE, 'heart', '#e2584f'],
  'ncb-flag-flower': ['#9fe0c4', 'flower', '#f08a5d'],
};

// ——— The staircase (panel 2): balusters and handrail on the stringer, newel posts with lanterns, a runner. ———

/**
 * A length of the stair's balustrade one block long, standing on the stringer: two balusters under the
 * handrail, rising a block over its length on a flight (`rise`) or level on the landing; deep enough (0.36)
 * to stop the child at the stair's open side.
 */
function stairRail(rise: boolean): Box[] {
  const out: Box[] = [];
  const at = (z: number): number => 0.95 + (rise ? z + 0.5 : 0);
  // The handrail: short steps along the slope, each a hand's width.
  for (let k = 0; k < (rise ? 8 : 1); k++) {
    const [z0, z1] = rise ? [-0.5 + k / 8, -0.5 + (k + 1) / 8] : [-0.5, 0.5];
    out.push(box([-0.18, at(z0), z0], [0.18, at(z0) + 0.12, z1], WOOD.mid));
  }
  for (const z of [-0.25, 0.25]) out.push(box([-0.05, 0, z - 0.05], [0.05, at(z), z + 0.05], WOOD.pale));
  out.push(box([-0.12, 0, -0.5], [0.12, 0.06, 0.5], WOOD.dark));
  return out;
}

/** A newel post: a square post with a cap and a little lantern glowing on top. */
function newelPost(): Box[] {
  return [
    box([-0.2, 0, -0.2], [0.2, 1.25, 0.2], WOOD.dark),
    box([-0.25, 1.25, -0.25], [0.25, 1.33, 0.25], WOOD.mid),
    box([-0.13, 1.33, -0.13], [0.13, 1.63, 0.13], '#ffd36b', true),
    ...[[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].map(([x, z]) => box([(x ?? 0) - 0.025, 1.33, (z ?? 0) - 0.025], [(x ?? 0) + 0.025, 1.63, (z ?? 0) + 0.025], '#3f4248')),
    box([-0.18, 1.63, -0.18], [0.18, 1.7, 0.18], '#3f4248'),
  ];
}

/** The stair runner over one step's tread, and down its riser (to the step below) where it rises. */
function stairRunner(rise: boolean): Box[] {
  const out: Box[] = [box([-0.75, 0, -0.5], [0.75, 0.025, 0.5], '#d9534f'), ...[-0.75, 0.69].map((x) => box([x, 0.025, -0.5], [x + 0.06, 0.03, 0.5], '#ffd36b'))];
  if (rise) out.push(box([-0.75, -1, -0.525], [0.75, 0, -0.5], '#d9534f'), box([-0.75, -0.06, -0.535], [0.75, 0, -0.525], '#ffd36b'));
  return out;
}

/**
 * The cupboard under the stairs: half a door high (owner, 05/10/2026: the door-high one read as the house's
 * door), a little hatch with a heart on the stringer's open side (its face toward -z), hinged at its left; inside,
 * a broom and the toy box.
 */
function underStairDoor(): BoxProp {
  return {
    boxes: [
      box([-0.55, 0, -0.05], [-0.48, 1.12, 0], WOOD.dark),
      box([0.48, 0, -0.05], [0.55, 1.12, 0], WOOD.dark),
      box([-0.55, 1.05, -0.05], [0.55, 1.12, 0], WOOD.dark),
      box([-0.48, 0, -0.05], [0.48, 0.04, 0], WOOD.dark),
      box([-0.48, 0.04, -0.012], [0.48, 1.05, 0], '#2f2219'),
      box([0.2, 0.04, -0.02], [0.24, 0.9, -0.012], WOOD.light),
      box([0.12, 0.04, -0.03], [0.32, 0.2, -0.012], '#e2b13c'),
      box([-0.38, 0.04, -0.04], [-0.08, 0.3, -0.012], PINK.deep),
      ...asPart('door', [
        box([-0.48, 0.04, -0.045], [0.48, 1.05, -0.012], WOOD.light),
        box([-0.4, 0.12, -0.052], [0.4, 0.97, -0.045], '#d9a273'),
        ...pixels(7, 7, 0.04, 0, 0.72, [-0.06, -0.052], 'xy', (i, j) => (markAt('heart')(i, j) ? PINK.deep : null)),
        box([0.3, 0.5, -0.075], [0.38, 0.58, -0.045], '#e2b13c'),
      ]),
    ],
    parts: { door: { pivot: [-0.48, 0, -0.0285], axis: 'y', angle: 100 } },
  };
}

// ——— More of the house as the mock has it. ———

/** A bookcase from floor to ceiling for the study (panel 4): two wide, rows of coloured books, a plant on top. */
function tallBookcase(): Box[] {
  // A frame open at the front: the back, the two sides, the top and the plinth; the books show between.
  const out: Box[] = [
    box([-0.98, 0, 0.24], [0.98, 3.6, 0.32], WOOD.dark),
    ...[-1, 1].map((side) => box([side < 0 ? -0.98 : 0.92, 0, -0.24], [side < 0 ? -0.92 : 0.98, 3.6, 0.32], WOOD.mid)),
    box([-0.98, 3.52, -0.26], [0.98, 3.6, 0.32], WOOD.mid),
    box([-0.98, 0, -0.26], [0.98, 0.1, 0.32], WOOD.mid),
  ];
  const books = ['#ef6f6c', '#5aa6e8', '#f2d14c', '#6fc27a', '#a77de0', '#f5a742', WHITE, '#e86f9c'];
  for (let shelf = 0; shelf < 6; shelf++) {
    const y = 0.1 + shelf * 0.57;
    out.push(box([-0.92, y, -0.24], [0.92, y + 0.05, 0.3], WOOD.light));
    let x = -0.88;
    let k = shelf * 3;
    while (x < 0.84) {
      const w = 0.08 + ((k * 7) % 5) * 0.015;
      const h = 0.34 + ((k * 5) % 4) * 0.04;
      if ((k + shelf) % 11 !== 5) out.push(box([x, y + 0.05, -0.18], [Math.min(0.88, x + w), y + 0.05 + h, 0.2], books[k % books.length] ?? WHITE));
      x += w + 0.012;
      k++;
    }
  }
  return out;
}

/** A little round table for tea (panels 3, 6): a pink cloth with a white hem, a teapot and two cups, one leg. */
function teaTable(): Box[] {
  const out: Box[] = pixels(7, 7, 0.13, 0, 0, [0.5, 0.55], 'xz', (i, j) => (Math.hypot(i - 3, j - 3) <= 3.2 ? (Math.hypot(i - 3, j - 3) > 2.4 ? WHITE : PINK.mid) : null));
  out.push(box([-0.08, 0, -0.08], [0.08, 0.5, 0.08], WOOD.mid), box([-0.25, 0, -0.25], [0.25, 0.05, 0.25], WOOD.mid));
  out.push(box([-0.1, 0.55, -0.1], [0.1, 0.75, 0.1], WHITE), box([0.1, 0.62, -0.03], [0.2, 0.68, 0.03], WHITE), box([-0.04, 0.75, -0.04], [0.04, 0.8, 0.04], PINK.deep));
  for (const [x, z] of [[-0.25, 0.15], [0.22, -0.2]] as const) out.push(box([x - 0.05, 0.55, z - 0.05], [x + 0.05, 0.63, z + 0.05], '#9fd4c9'));
  return out;
}

/** A climbing rose on a wall (panel 1): leafy stems up three blocks, pink and white roses in it, flat on the wall. */
function roseVine(): Box[] {
  const out: Box[] = [];
  const leaf = (x: number, y: number, w: number, h: number, c: string): Box => box([x - w / 2, y, -0.08], [x + w / 2, y + h, 0], c);
  const stems: Array<[number, number]> = [[-0.25, 0], [0.2, 0.1]];
  for (const [sx, lean] of stems) {
    for (let k = 0; k < 9; k++) {
      const y = k * 0.33;
      const x = sx + Math.sin(k * 1.3 + lean * 10) * 0.18;
      out.push(leaf(x, y, 0.3, 0.3, k % 2 === 0 ? '#4f9d4a' : '#5fae5a'));
      if (k % 2 === 1) out.push(box([x - 0.08, y + 0.08, -0.11], [x + 0.08, y + 0.24, -0.08], (k + Math.round(lean * 10)) % 3 === 0 ? WHITE : PINK.deep));
    }
  }
  return out;
}

/** A window box of flowers for the upstairs windows: a red trough two wide, blooms and leaves. */
function flowerBox(): Box[] {
  const out: Box[] = [box([-1, 0, -0.25], [1, 0.3, 0.2], '#c0473c'), box([-0.95, 0.3, -0.2], [0.95, 0.36, 0.15], '#7a4b33')];
  const blooms = ['#e86f9c', '#ffe066', WHITE, '#ef6f6c', '#a77de0', '#ffe066', '#e86f9c'];
  blooms.forEach((c, i) => {
    const x = -0.85 + i * 0.28;
    out.push(box([x - 0.1, 0.36, -0.1], [x + 0.1, 0.55, 0.05], '#5fae5a'));
    out.push(box([x - 0.08, 0.55, -0.12], [x + 0.08, 0.7, 0.03], c));
  });
  return out;
}

/** The kitchen's plate rack on the wall (panel 6): a shelf of upright plates in colours and cups on hooks. */
function plateRack(): Box[] {
  const out: Box[] = [box([-0.9, 0, -0.18], [0.9, 0.06, 0.02], WOOD.mid), box([-0.9, 0.62, -0.18], [0.9, 0.68, 0.02], WOOD.mid), box([-0.9, 0, -0.02], [0.9, 0.68, 0.02], WOOD.light)];
  ['#5aa6e8', WHITE, '#ef6f6c', WHITE, '#f2d14c', WHITE, '#6fc27a'].forEach((c, i) => out.push(box([-0.8 + i * 0.24 - 0.09, 0.06, -0.1], [-0.8 + i * 0.24 + 0.09, 0.5, -0.06], c)));
  for (const [x, c] of [[-0.6, '#e86f9c'], [0, '#5aa6e8'], [0.6, '#f2d14c']] as const) out.push(box([x - 0.08, -0.25, -0.16], [x + 0.08, -0.05, -0.02], c));
  return out;
}

/** A fruit bowl for the table (panel 6): a pale bowl with oranges, apples and a banana. */
function fruitBowl(): Box[] {
  return [
    box([-0.22, 0, -0.22], [0.22, 0.1, 0.22], '#f6efe2'),
    box([-0.26, 0.1, -0.26], [0.26, 0.14, 0.26], '#f6efe2'),
    box([-0.18, 0.12, -0.16], [-0.02, 0.28, 0], '#f5a742'),
    box([0.02, 0.12, -0.14], [0.18, 0.28, 0.02], '#e2584f'),
    box([-0.1, 0.12, 0.04], [0.06, 0.28, 0.2], '#6fc27a'),
    box([-0.08, 0.26, -0.08], [0.1, 0.36, 0.1], '#f5a742'),
    box([0.06, 0.2, 0.06], [0.26, 0.26, 0.14], '#ffe066'),
  ];
}

/** A wall clock (panels 5, 6): a round face of steps, its hands at four o'clock. */
function wallClock(): Box[] {
  const out: Box[] = pixels(9, 9, 0.07, 0, 0.32, [-0.05, 0], 'xy', (i, j) => {
    const r = Math.hypot(i - 4, j - 4);
    return r > 4.4 ? null : r > 3.6 ? WOOD.mid : WHITE;
  });
  out.push(box([-0.02, 0.32, -0.07], [0.02, 0.52, -0.05], INK), box([0, 0.3, -0.07], [0.16, 0.34, -0.05], INK), box([-0.03, 0.29, -0.08], [0.03, 0.35, -0.07], '#d9342b'));
  return out;
}

/** The cat rug of panel 3: a round cream rug, a ginger cat's face woven on it, flat on the floor. */
function catRug(): Box[] {
  const out: Box[] = [];
  const r = (RUG_CELL * 16) / 2;
  for (let k = -5; k <= 5; k++) {
    const z = (k / 5.5) * r;
    const half = Math.sqrt(Math.max(0, r * r - z * z));
    out.push(box([-half, 0, z - r / 11], [half, 0.03, z + r / 11], '#f6dcb4'));
  }
  // The face, its ears toward +z, lying flat (drawn for a rug 2.2 across, grown with the rug).
  const face: Box[] = [];
  face.push(box([-0.55, 0.03, -0.45], [0.55, 0.045, 0.4], '#f0a04b'));
  for (const side of [-1, 1]) {
    face.push(box([side * 0.55 - (side > 0 ? 0.28 : 0), 0.03, 0.4], [side * 0.55 + (side < 0 ? 0.28 : 0), 0.045, 0.68], '#f0a04b'));
    face.push(box([side * 0.42 - 0.09, 0.045, 0.45], [side * 0.42 + 0.09, 0.05, 0.6], PINK.mid));
    face.push(box([side * 0.22 - 0.08, 0.045, 0.02], [side * 0.22 + 0.08, 0.05, 0.16], INK));
    for (const dz of [-0.14, -0.24]) face.push(box([side * 0.3 - (side > 0 ? 0 : 0.35), 0.045, dz], [side * 0.3 + (side > 0 ? 0.35 : 0), 0.05, dz + 0.03], INK));
  }
  face.push(box([-0.07, 0.045, -0.1], [0.07, 0.05, -0.02], PINK.deep));
  const k = r / 1.1;
  for (const b of face) out.push(box([b.from[0] * k, b.from[1], b.from[2] * k], [b.to[0] * k, b.to[1], b.to[2] * k], b.color));
  return out;
}

/** The little dressing table of panel 3: a white top on legs, a pink drawer, a mirror in a gold frame, two bottles. */
function vanity(): Box[] {
  return [
    box([-0.6, 0.7, -0.3], [0.6, 0.78, 0.3], WHITE),
    ...[-0.54, 0.54].flatMap((x) => [-0.24, 0.24].map((z) => box([x - 0.04, 0, z - 0.04], [x + 0.04, 0.7, z + 0.04], WHITE))),
    box([-0.4, 0.56, -0.31], [0.4, 0.7, -0.29], PINK.mid),
    box([-0.42, 0.78, 0.2], [0.42, 1.8, 0.28], '#e2b13c'),
    box([-0.34, 0.86, 0.18], [0.34, 1.72, 0.2], '#cfe8f6'),
    box([-0.4, 0.78, -0.1], [-0.32, 0.95, -0.02], PINK.deep),
    box([-0.26, 0.78, -0.12], [-0.18, 0.9, -0.04], '#9fd4c9'),
  ];
}

/** The cream sofa of panel 5: seat, back and arms, two pink cushions, short dark legs. */
function sofa(): Box[] {
  return [
    box([-1.3, 0.1, -0.45], [1.3, 0.45, 0.45], '#f3e6cf'),
    box([-1.3, 0.45, 0.15], [1.3, 1.0, 0.45], '#efdfc2'),
    box([-1.3, 0.45, -0.45], [-1.06, 0.75, 0.45], '#efdfc2'),
    box([1.06, 0.45, -0.45], [1.3, 0.75, 0.45], '#efdfc2'),
    box([-1.04, 0.45, -0.4], [-0.02, 0.55, 0.15], '#f8eedb'),
    box([0.02, 0.45, -0.4], [1.04, 0.55, 0.15], '#f8eedb'),
    box([-0.95, 0.55, -0.02], [-0.45, 0.95, 0.14], PINK.mid),
    box([0.45, 0.55, -0.02], [0.95, 0.95, 0.14], PINK.mid),
    ...[-1.2, 1.2].flatMap((x) => [-0.35, 0.35].map((z) => box([x - 0.05, 0, z - 0.05], [x + 0.05, 0.1, z + 0.05], WOOD.dark))),
  ];
}

/**
 * The fridge of panel 6: cream, two doors hinged at the left (chrome handles on the right), the children's
 * magnets on its front; inside, shelves with milk, an apple, cheese, a carrot and greens.
 */
function fridge(): BoxProp {
  return {
    boxes: [
      box([-0.5, 0, -0.34], [0.5, 2.1, 0.4], CREAM),
      ...asPart('door-top', [
        box([-0.5, 1.36, -0.4], [0.5, 2.1, -0.34], CREAM),
        box([-0.5, 1.36, -0.42], [0.5, 1.39, -0.4], '#c9bfae'),
        box([0.32, 1.45, -0.46], [0.38, 1.9, -0.42], '#b8bfc9'),
        // Magnets: a cat, a star, an apple.
        box([-0.35, 1.7, -0.43], [-0.15, 1.88, -0.41], '#f0a04b'),
        box([-0.33, 1.88, -0.43], [-0.29, 1.94, -0.41], '#f0a04b'),
        box([-0.21, 1.88, -0.43], [-0.17, 1.94, -0.41], '#f0a04b'),
        box([-0.05, 1.55, -0.43], [0.13, 1.71, -0.41], '#ffd23f'),
        box([-0.38, 1.45, -0.43], [-0.22, 1.6, -0.41], '#d9342b'),
      ]),
      ...asPart('door-bottom', [
        box([-0.5, 0, -0.4], [0.5, 1.34, -0.34], CREAM),
        box([0.32, 0.6, -0.46], [0.38, 1.2, -0.42], '#b8bfc9'),
        // A heart and a little note.
        box([-0.1, 0.95, -0.43], [0.08, 1.1, -0.41], PINK.deep),
        box([-0.4, 0.7, -0.425], [-0.1, 1.05, -0.41], WHITE),
      ]),
      // Inside, hidden by the closed doors.
      box([-0.46, 0.04, -0.346], [0.46, 2.06, -0.34], '#d6e9f2'),
      box([-0.46, 0.68, -0.352], [0.46, 0.71, -0.346], WHITE),
      box([-0.46, 1.62, -0.352], [0.46, 1.65, -0.346], WHITE),
      box([-0.32, 0.71, -0.38], [-0.2, 1.0, -0.346], WHITE),
      box([-0.3, 1.0, -0.372], [-0.22, 1.04, -0.35], '#5fb8ff'),
      box([0.08, 0.71, -0.372], [0.2, 0.83, -0.35], '#d9342b'),
      box([0.1, 1.65, -0.372], [0.3, 1.75, -0.35], '#ffd23f'),
      box([-0.3, 1.65, -0.372], [-0.1, 1.7, -0.35], '#f0a04b'),
      box([-0.2, 0.04, -0.372], [0.25, 0.3, -0.35], '#9bd36b'),
    ],
    parts: { 'door-top': { pivot: [-0.5, 0, -0.37], axis: 'y', angle: 105 }, 'door-bottom': { pivot: [-0.5, 0, -0.37], axis: 'y', angle: 105 } },
  };
}

/** Children's drawings pinned on the wall (panel 4): three sheets with crayon pictures (a sun, a house, a cat). */
function drawings(): Box[] {
  const out: Box[] = [];
  const sheets: Array<[number, number, Box[]]> = [
    [-0.75, 0.15, [box([-0.12, 0.32, -0.04], [0.12, 0.56, -0.03], '#ffd23f'), box([-0.25, 0.1, -0.04], [0.25, 0.14, -0.03], '#5fd068')]],
    [0, 0.05, [box([-0.15, 0.12, -0.04], [0.15, 0.32, -0.03], '#d9342b'), box([-0.2, 0.32, -0.04], [0.2, 0.4, -0.03], '#8a5a32'), box([-0.04, 0.12, -0.045], [0.04, 0.22, -0.04], '#3a8cff')]],
    [0.75, 0.2, [box([-0.14, 0.15, -0.04], [0.14, 0.4, -0.03], '#f0a04b'), box([-0.14, 0.4, -0.04], [-0.06, 0.48, -0.03], '#f0a04b'), box([0.06, 0.4, -0.04], [0.14, 0.48, -0.03], '#f0a04b')]],
  ];
  for (const [cx, cy, art] of sheets) {
    out.push(box([cx - 0.3, cy, -0.03], [cx + 0.3, cy + 0.62, 0], WHITE));
    out.push(box([cx - 0.03, cy + 0.56, -0.05], [cx + 0.03, cy + 0.62, -0.03], '#d9342b'));
    for (const b of art) out.push(box([cx + b.from[0], cy + b.from[1], b.from[2]], [cx + b.to[0], cy + b.to[1], b.to[2]], b.color));
  }
  return out;
}

/**
 * The gallery railing of panel 2, two blocks long: turned balusters under a broad handrail, deep enough
 * (0.36) to fill the cells it stands on, so the child leans on it instead of stepping off the gallery.
 */
function galleryRailing(): Box[] {
  const out: Box[] = [box([-1, 0.98, -0.18], [1, 1.08, 0.18], WOOD.mid), box([-1, 0, -0.12], [1, 0.08, 0.12], WOOD.mid)];
  for (let i = 0; i < 5; i++) {
    const x = -0.8 + i * 0.4;
    out.push(box([x - 0.05, 0.08, -0.05], [x + 0.05, 0.98, 0.05], WOOD.light));
  }
  for (const x of [-0.97, 0.97]) out.push(box([x - 0.05, 0, -0.08], [x + 0.05, 1.15, 0.08], WOOD.dark));
  return out;
}

/**
 * A leaf of the arched front door (panel 1), hung in the arch: 1.5 wide and 4 high, its inner end 5 high under
 * the arch's middle; planks, iron straps and a brass handle on both faces. Its hinge is its origin; the left
 * leaf runs to +x (`side` 1), the right one to -x, and each opens inward (toward +z).
 */
function doorLeaf(side: 1 | -1): BoxProp {
  const at = (x0: number, x1: number): [number, number] => (side > 0 ? [x0, x1] : [-x1, -x0]);
  const b = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string): Box => {
    const [a, c] = at(x0, x1);
    return box([a, y0, z0], [c, y1, z1], color);
  };
  const boxes: Box[] = [b(0, 0, -0.06, 1.5, 4, 0.06, WOOD.mid), b(1, 4, -0.06, 1.5, 4.95, 0.06, WOOD.mid)];
  for (const z of [-1, 1]) {
    const [zIn, zOut] = z < 0 ? [-0.075, -0.06] : [0.06, 0.075];
    for (const x of [0.36, 0.72, 1.08]) boxes.push(b(x, 0.05, zIn, x + 0.03, 3.95, zOut, WOOD.dark));
    boxes.push(b(1.08, 4, zIn, 1.11, 4.9, zOut, WOOD.dark));
    for (const y of [0.6, 3.1]) boxes.push(b(0.05, y, z < 0 ? -0.08 : 0.06, 1.45, y + 0.1, z < 0 ? -0.06 : 0.08, '#3f4248'));
    boxes.push(b(1.28, 1.7, z < 0 ? -0.12 : 0.06, 1.38, 1.85, z < 0 ? -0.06 : 0.12, '#e2b13c'));
  }
  return { boxes: asPart('leaf', boxes), parts: { leaf: { pivot: [0, 0, 0], axis: 'y', angle: side > 0 ? -95 : 95 } } };
}

/**
 * The cat-shaped mailbox of panel 1: a post, a white box with a cat's ears and face, a red flag; its front is a
 * flap with the letter slot, hinged at the bottom, and a letter waits inside.
 */
function catMailbox(): BoxProp {
  return {
    boxes: [
      box([-0.07, 0, -0.07], [0.07, 1.0, 0.07], WOOD.dark),
      box([-0.3, 1.0, -0.36], [0.3, 1.45, 0.36], WHITE),
      ...asPart('flap', [
        box([-0.26, 1.02, -0.385], [0.26, 1.42, -0.36], WHITE),
        box([-0.26, 1.02, -0.395], [0.26, 1.08, -0.385], '#e8e0d2'),
        box([-0.1, 1.15, -0.4], [0.1, 1.2, -0.385], INK),
      ]),
      box([-0.24, 1.04, -0.366], [0.24, 1.4, -0.36], INK),
      box([-0.13, 1.08, -0.372], [0.13, 1.3, -0.366], WHITE),
      box([-0.03, 1.15, -0.375], [0.03, 1.19, -0.372], PINK.deep),
      ...catFace(0, 1.62, 0.5, -0.12, '#f0a04b', 0.12),
      box([0.3, 1.1, 0.0], [0.34, 1.6, 0.06], '#d9342b'),
      box([0.3, 1.45, 0.06], [0.34, 1.6, 0.26], '#d9342b'),
    ],
    parts: { flap: { pivot: [0, 1.02, -0.3725], axis: 'x', angle: -100 } },
  };
}

/** The flag of panel 1 on its pole: pink cloth with a white cat's face on both sides. */
function catFlag(): Box[] {
  return [
    box([-0.06, 0, -0.06], [0.06, 3.5, 0.06], WOOD.dark),
    box([-0.1, 3.5, -0.1], [0.1, 3.66, 0.1], '#e2b13c'),
    box([0.06, 2.5, -0.03], [1.36, 3.4, 0.03], PINK.mid),
    ...catFace(0.71, 2.9, 0.48, -0.05, WHITE, 0.05),
  ];
}

/** The cat's head over the name board (panel 13): ginger, faced on both sides. */
function signCat(): Box[] {
  return catFace(0, 0.34, 0.8, -0.1, '#f0a04b', 0.1);
}

/** A watering can (panel 9): a green body, its spout and rose, a handle over it. */
function wateringCan(): Box[] {
  return [
    box([-0.2, 0, -0.15], [0.2, 0.36, 0.15], '#4caf8a'),
    box([0.2, 0.18, -0.04], [0.52, 0.26, 0.04], '#4caf8a'),
    box([0.5, 0.2, -0.08], [0.58, 0.34, 0.08], '#3a8f70'),
    box([-0.14, 0.36, -0.03], [-0.08, 0.52, 0.03], '#3a8f70'),
    box([0.08, 0.36, -0.03], [0.14, 0.52, 0.03], '#3a8f70'),
    box([-0.14, 0.5, -0.03], [0.14, 0.56, 0.03], '#3a8f70'),
  ];
}

/** Every box prop of the home (content/world/box-props/nha-cua-be.json), by id. */
export function nhaCuaBeProps(): Record<string, BoxProp> {
  return {
    'ncb-timetable-board': { boxes: timetableBoard() },
    'ncb-uniform-calendar': { boxes: uniformCalendar() },
    'ncb-cat-rug': { boxes: catRug() },
    'ncb-vanity': { boxes: vanity() },
    'ncb-sofa': { boxes: sofa() },
    'ncb-fridge': fridge(),
    'ncb-drawings': { boxes: drawings() },
    'ncb-railing': { boxes: galleryRailing() },
    'ncb-door-left': doorLeaf(1),
    'ncb-door-right': doorLeaf(-1),
    'ncb-cat-mailbox': catMailbox(),
    'ncb-cat-flag': { boxes: catFlag() },
    'ncb-sign-cat': { boxes: signCat() },
    'ncb-watering-can': { boxes: wateringCan() },
    'ncb-stair-rail-rise': { boxes: stairRail(true) },
    'ncb-stair-rail-flat': { boxes: stairRail(false) },
    'ncb-newel': { boxes: newelPost() },
    'ncb-runner-rise': { boxes: stairRunner(true) },
    'ncb-runner-flat': { boxes: stairRunner(false) },
    'ncb-under-stair-door': underStairDoor(),
    'ncb-bookcase-tall': { boxes: tallBookcase() },
    'ncb-rose-vine': { boxes: roseVine() },
    'ncb-flower-box': { boxes: flowerBox() },
    'ncb-plate-rack': { boxes: plateRack() },
    'ncb-fruit-bowl': { boxes: fruitBowl() },
    'ncb-wall-clock': { boxes: wallClock() },
    'ncb-tea-table': { boxes: teaTable() },
    'ncb-hedge': { boxes: hedge() },
    ...styles(BEDS, styledBed),
    ...styles(DESKS, ([top, body, knob]) => styledDesk(top, body, knob)),
    ...Object.fromEntries(Object.entries(WARDROBES).map(([id, [body, doors, crown, mark]]) => [id, styledWardrobe(body, doors, crown, mark)])),
    ...styles(RUGS, (make) => make()),
    ...styles(CURTAINS, ([main, deep, pale]) => styledCurtains(main, deep, pale)),
    ...styles(FLOOR_LAMPS, (make) => make()),
    ...styles(PICKETS, ([pale, rail]) => styledPicket(pale, rail)),
    ...styles(GARDEN_LAMPS, (make) => make()),
    ...styles(SIGN_ANIMALS, (animal) => animalFace(animal, 0, 0.34, 0.8, -0.1, 0.1)),
    ...styles(FLAGS, ([cloth, mark, ink]) => styledFlag(cloth, mark, ink)),
  };
}

/** Box props of one family of styles, by id. */
function styles<T>(table: Readonly<Record<string, T>>, make: (style: T) => Box[]): Record<string, BoxProp> {
  return Object.fromEntries(Object.entries(table).map(([id, style]) => [id, { boxes: make(style) }]));
}

async function main(): Promise<void> {
  const props = nhaCuaBeProps();
  BoxPropCatalog.parse({ version: 1, props });
  await writeFile(path.join(REPO_ROOT, 'content/world/box-props/nha-cua-be.json'), catalogJson(props));
  for (const [id, prop] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) console.log(`    "generated/box-props/${id}.glb": { "height": ${propHeight(prop)} },`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
