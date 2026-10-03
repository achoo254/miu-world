// The box props of the child's home, Nhà của bé, after the owner's mock (plan 261003, panels 1–10 and 13): the
// timetable board on the wall over the study desk with its days and periods and the lunch break, the school
// uniform calendar beside the wardrobe, the bed under its pink polka-dot quilt with the bunny pillow, the cat
// rug, the pink curtains, the wardrobe, the little dressing table, the cream sofa with its pink cushions, the
// fridge with its magnets, the children's drawings pinned on the wall, the gallery railing, the open leaves of
// the arched front door, the cat-shaped mailbox, the flag with its cat, the cat's head over the name board,
// the watering can. Boards are lettered with the hub's pixel capitals (trung-tam-props.ts), so the marks of
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

/** The bed of panel 3: a wooden frame, a pink quilt with white dots, a white pillow with a bunny's ears and face. */
function pinkBed(): Box[] {
  const out: Box[] = [
    box([-0.85, 0, -1.25], [0.85, 0.36, 1.25], WOOD.light),
    box([-0.8, 0.36, -1.18], [0.8, 0.6, 1.2], WHITE),
    box([-0.84, 0.55, -1.22], [0.84, 0.7, 0.42], PINK.mid),
    box([-0.84, 0.25, -1.24], [0.84, 0.55, -1.2], PINK.mid),
    // Headboard (+z) with a pink heart, footboard (-z).
    box([-0.92, 0, 1.2], [0.92, 1.45, 1.32], WOOD.mid),
    box([-0.18, 1.0, 1.18], [0.18, 1.24, 1.2], PINK.deep),
    box([-0.92, 0, -1.34], [0.92, 0.82, -1.24], WOOD.mid),
    // The bunny pillow: white, its ears up, a face toward the foot.
    box([-0.48, 0.6, 0.6], [0.48, 0.86, 1.08], WHITE),
    box([-0.3, 0.86, 0.82], [-0.16, 1.26, 0.9], WHITE),
    box([0.16, 0.86, 0.82], [0.3, 1.26, 0.9], WHITE),
    box([-0.27, 0.92, 0.81], [-0.19, 1.2, 0.82], PINK.mid),
    box([0.19, 0.92, 0.81], [0.27, 1.2, 0.82], PINK.mid),
    box([-0.2, 0.72, 0.58], [-0.12, 0.8, 0.6], INK),
    box([0.12, 0.72, 0.58], [0.2, 0.8, 0.6], INK),
    box([-0.04, 0.68, 0.58], [0.04, 0.73, 0.6], PINK.deep),
  ];
  // Polka dots on the quilt.
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const x = -0.6 + i * 0.4 + (j % 2) * 0.2;
    const z = -1.0 + j * 0.32;
    if (x > 0.72) continue;
    out.push(box([x - 0.06, 0.7, z - 0.06], [x + 0.06, 0.715, z + 0.06], WHITE));
  }
  return out;
}

/** The cat rug of panel 3: a round cream rug, a ginger cat's face woven on it, flat on the floor. */
function catRug(): Box[] {
  const out: Box[] = [];
  const r = 1.1;
  for (let k = -5; k <= 5; k++) {
    const z = (k / 5.5) * r;
    const half = Math.sqrt(Math.max(0, r * r - z * z));
    out.push(box([-half, 0, z - r / 11], [half, 0.03, z + r / 11], '#f6dcb4'));
  }
  // The face, its ears toward +z, lying flat.
  out.push(box([-0.55, 0.03, -0.45], [0.55, 0.045, 0.4], '#f0a04b'));
  for (const side of [-1, 1]) {
    out.push(box([side * 0.55 - (side > 0 ? 0.28 : 0), 0.03, 0.4], [side * 0.55 + (side < 0 ? 0.28 : 0), 0.045, 0.68], '#f0a04b'));
    out.push(box([side * 0.42 - 0.09, 0.045, 0.45], [side * 0.42 + 0.09, 0.05, 0.6], PINK.mid));
    out.push(box([side * 0.22 - 0.08, 0.045, 0.02], [side * 0.22 + 0.08, 0.05, 0.16], INK));
    for (const dz of [-0.14, -0.24]) out.push(box([side * 0.3 - (side > 0 ? 0 : 0.35), 0.045, dz], [side * 0.3 + (side > 0 ? 0.35 : 0), 0.05, dz + 0.03], INK));
  }
  out.push(box([-0.07, 0.045, -0.1], [0.07, 0.05, -0.02], PINK.deep));
  return out;
}

/** Pink curtains (panels 2, 3): a rod, two drawn panels tied back, a scalloped valance; it hangs on a wall over a window two wide. */
function pinkCurtains(): Box[] {
  const out: Box[] = [
    box([-1.25, 2.12, -0.06], [1.25, 2.2, 0], WOOD.dark),
    box([-1.2, 1.92, -0.1], [1.2, 2.12, -0.06], PINK.pale),
  ];
  for (const side of [-1, 1]) {
    const [a, b] = side < 0 ? [-1.2, -0.72] : [0.72, 1.2];
    out.push(box([a, 0.15, -0.09], [b, 1.92, -0.03], PINK.mid));
    out.push(box([a - 0.02, 0.95, -0.1], [b + 0.02, 1.05, -0.08], PINK.deep));
  }
  for (let i = 0; i < 6; i++) out.push(box([-1.2 + i * 0.4 + 0.05, 1.86, -0.11], [-1.2 + i * 0.4 + 0.35, 1.92, -0.09], PINK.deep));
  return out;
}

/** The wardrobe of panel 3: two doors with gold knobs, a pink crown and feet. */
function wardrobe(): Box[] {
  return [
    box([-0.8, 0.12, -0.35], [0.8, 2.5, 0.35], WOOD.light),
    box([-0.75, 0.2, -0.37], [-0.03, 2.4, -0.35], WOOD.pale),
    box([0.03, 0.2, -0.37], [0.75, 2.4, -0.35], WOOD.pale),
    box([-0.12, 1.2, -0.4], [-0.06, 1.4, -0.37], '#e2b13c'),
    box([0.06, 1.2, -0.4], [0.12, 1.4, -0.37], '#e2b13c'),
    box([-0.86, 2.5, -0.4], [0.86, 2.62, 0.4], PINK.mid),
    box([-0.3, 2.62, -0.2], [0.3, 2.72, 0.2], PINK.deep),
    ...[-0.7, 0.7].flatMap((x) => [-0.28, 0.28].map((z) => box([x - 0.06, 0, z - 0.06], [x + 0.06, 0.12, z + 0.06], WOOD.dark))),
  ];
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

/** The fridge of panel 6: cream, two doors, chrome handles, the children's magnets on its front. */
function fridge(): Box[] {
  return [
    box([-0.5, 0, -0.4], [0.5, 2.1, 0.4], CREAM),
    box([-0.5, 1.33, -0.42], [0.5, 1.37, -0.4], '#c9bfae'),
    box([0.32, 1.45, -0.46], [0.38, 1.9, -0.42], '#b8bfc9'),
    box([0.32, 0.6, -0.46], [0.38, 1.2, -0.42], '#b8bfc9'),
    // Magnets: a cat, a star, an apple, a heart, a little note.
    box([-0.35, 1.7, -0.43], [-0.15, 1.88, -0.41], '#f0a04b'),
    box([-0.33, 1.88, -0.43], [-0.29, 1.94, -0.41], '#f0a04b'),
    box([-0.21, 1.88, -0.43], [-0.17, 1.94, -0.41], '#f0a04b'),
    box([-0.05, 1.55, -0.43], [0.13, 1.71, -0.41], '#ffd23f'),
    box([-0.38, 1.45, -0.43], [-0.22, 1.6, -0.41], '#d9342b'),
    box([-0.1, 0.95, -0.43], [0.08, 1.1, -0.41], PINK.deep),
    box([-0.4, 0.7, -0.425], [-0.1, 1.05, -0.41], WHITE),
  ];
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

/** A leaf of the arched front door (panel 1), folded back flat on the wall: planks, iron straps, a round top. */
function doorLeaf(): Box[] {
  const out: Box[] = [box([-0.7, 0, -0.06], [0.7, 3.4, 0.06], WOOD.mid)];
  for (let i = 0; i < 4; i++) out.push(box([-0.7 + i * 0.35 + 0.02, 0, -0.08], [-0.7 + i * 0.35 + 0.04, 3.4, -0.06], WOOD.dark));
  out.push(box([-0.5, 3.4, -0.06], [0.5, 3.7, 0.06], WOOD.mid));
  for (const y of [0.6, 2.6]) out.push(box([-0.7, y, -0.09], [0.7, y + 0.1, -0.06], '#3f4248'));
  out.push(box([-0.5, 1.6, -0.12], [-0.4, 1.75, -0.06], '#e2b13c'));
  return out;
}

/** The cat-shaped mailbox of panel 1: a post, a white box with a cat's ears and face, a red flag. */
function catMailbox(): Box[] {
  return [
    box([-0.07, 0, -0.07], [0.07, 1.0, 0.07], WOOD.dark),
    box([-0.3, 1.0, -0.36], [0.3, 1.45, 0.36], WHITE),
    box([-0.26, 1.0, -0.38], [0.26, 1.08, -0.36], '#e8e0d2'),
    box([-0.1, 1.15, -0.39], [0.1, 1.2, -0.36], INK),
    ...catFace(0, 1.62, 0.5, -0.12, '#f0a04b', 0.12),
    box([0.3, 1.1, 0.0], [0.34, 1.6, 0.06], '#d9342b'),
    box([0.3, 1.45, 0.06], [0.34, 1.6, 0.26], '#d9342b'),
  ];
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
    'ncb-bed-pink': { boxes: pinkBed() },
    'ncb-cat-rug': { boxes: catRug() },
    'ncb-curtains-pink': { boxes: pinkCurtains() },
    'ncb-wardrobe': { boxes: wardrobe() },
    'ncb-vanity': { boxes: vanity() },
    'ncb-sofa': { boxes: sofa() },
    'ncb-fridge': { boxes: fridge() },
    'ncb-drawings': { boxes: drawings() },
    'ncb-railing': { boxes: galleryRailing() },
    'ncb-door-leaf': { boxes: doorLeaf() },
    'ncb-cat-mailbox': { boxes: catMailbox() },
    'ncb-cat-flag': { boxes: catFlag() },
    'ncb-sign-cat': { boxes: signCat() },
    'ncb-watering-can': { boxes: wateringCan() },
  };
}

async function main(): Promise<void> {
  const props = nhaCuaBeProps();
  BoxPropCatalog.parse({ version: 1, props });
  await writeFile(path.join(REPO_ROOT, 'content/world/box-props/nha-cua-be.json'), catalogJson(props));
  for (const [id, prop] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) console.log(`    "generated/box-props/${id}.glb": { "height": ${propHeight(prop)} },`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
