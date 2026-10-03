// Emoji props modelled in code (prop-voxels.ts): balloons, the kite, the teddy bear, the balls, gift boxes,
// parcels and the birthday cake. Front is +z; a colour variant repaints only the `tinted` keys.
import { paintedBall, type PropModel } from './prop-voxels';

/** A round balloon on its knot, a shine on its upper left, its string down to the ground. */
export const balloon: PropModel = {
  emoji: 'balloon',
  palette: { body: '#e8414f', shine: '#ff9fa8', knot: '#c22f3d', string: '#9aa3ae' },
  tinted: ['body', 'shine', 'knot'],
  build(g) {
    g.ellipsoid(0, 15.5, 0, 8.5, 10, 8.5, 'body', -Infinity, 2);
    g.ellipsoid(0, 6.5, 0, 2, 1.6, 2, 'body', -Infinity, 2);
    g.cbox(1, 4, -1, 2, 2, 'knot');
    g.recolor((x, y, z, c) => (c === 'body' && (x + 4) ** 2 + (y - 19.5) ** 2 + (z - 5) ** 2 < 10 ? 'shine' : null));
    g.sym = false;
    g.line(0, 3, 0, 1, 2, 1, 'string').line(1, 2, 1, 0, 0, 0, 'string');
  },
};

/** A diamond kite in four colours, bowed back, its cross spars behind and a tail of bows. */
export const kite: PropModel = {
  emoji: 'kite',
  palette: { a: '#f4c430', b: '#3d8fe0', c: '#4caf50', d: '#e2483f', spar: '#8a5a33', tail: '#5a5560', bow: '#e2483f', bow2: '#3d8fe0' },
  tinted: [],
  build(g) {
    g.sym = false;
    const [cy, hh, hw] = [21, 11, 11];
    for (let x = -hw; x < hw; x++) {
      for (let y = cy - hh; y < cy + hh; y++) {
        const [dx, dy] = [(x + 0.5) / hw, (y + 0.5 - cy) / hh];
        if (Math.abs(dx) + Math.abs(dy) > 1) continue;
        const color = dy >= 0 ? (dx < 0 ? 'a' : 'b') : dx < 0 ? 'c' : 'd';
        g.box(x, y, -Math.round(Math.abs(dx) * 2), 1, 1, 1, color);
      }
    }
    g.box(-1, cy - hh, -1, 1, 2 * hh, 1, 'spar').box(-hw + 1, cy, -3, 2 * hw - 2, 1, 1, 'spar');
    // Tail: a cord curling down and right from the bottom tip, three bows on it.
    const tail: Array<[number, number]> = [[0, 9], [2, 7], [5, 6], [7, 4], [10, 3], [12, 1], [15, 0]];
    tail.reduce((from, to) => {
      g.line(from[0], from[1], 0, to[0], to[1], 0, 'tail');
      return to;
    });
    for (const [x, y, bow] of [[5, 6, 'bow'], [10, 3, 'bow2']] as const) {
      g.box(x - 2, y, -1, 5, 2, 3, bow);
      g.box(x, y - 1, -1, 1, 4, 3, bow);
    }
  },
};

/** A teddy bear sitting with its legs out: round head and ears, muzzle and nose, arms at its sides. */
export const teddyBear: PropModel = {
  emoji: 'teddy-bear',
  palette: { fur: '#c8834a', light: '#f0c48f', pad: '#e9a978', dark: '#3b2a24' },
  tinted: ['fur'],
  build(g) {
    g.ellipsoid(3.5, 3, 3, 2.7, 2.7, 5, 'fur', -Infinity, 2);
    g.discZ(3.5, 3, 1.7, 1.7, 7, 1, 'pad');
    g.ellipsoid(0, 9, 0, 6, 7, 5.5, 'fur', -Infinity, 2);
    g.ellipsoid(0, 8.5, 2.5, 4, 4.5, 3.5, 'light', -Infinity, 2);
    g.ellipsoid(7, 10, 1.5, 2.3, 4.5, 2.3, 'fur', -Infinity, 2);
    g.ellipsoid(0, 18, 0, 6.5, 5.8, 5.5, 'fur', -Infinity, 2);
    g.ellipsoid(5, 23, -1, 2.3, 2.3, 1.6, 'fur', -Infinity, 2);
    g.discZ(5, 23, 1.2, 1.2, 0, 1, 'light');
    g.ellipsoid(0, 16.5, 4.6, 2.8, 2, 2, 'light', -Infinity, 2);
    g.cbox(1, 17, 6, 1, 1, 'dark');
    g.paintFront(2, 20, 'dark').paintFront(2, 19, 'dark');
  },
};

/** A ball painted from its picture all round (soccer ball, basketball, volleyball). */
const ball = (emoji: string, fallback: string): PropModel => ({
  emoji,
  palette: {},
  tinted: [],
  pictureColors: 5,
  build(g, picture) {
    paintedBall(g, picture, [0, 7.5, 0], 7.5, fallback);
  },
});

/** A gift box: box and lid, a white ribbon round it both ways, a bow on top. */
export const wrappedGift: PropModel = {
  emoji: 'wrapped-gift',
  palette: { box: '#f4c430', lid: '#f7d35a', ribbon: '#fbf7ee', ribbonDark: '#e3dccd' },
  tinted: ['box', 'lid'],
  build(g) {
    g.cbox(12, 0, -12, 18, 24, 'box');
    g.cbox(13, 18, -13, 5, 26, 'lid');
    // Ribbon down the middle of every side and across the lid, both ways.
    g.cbox(2, 0, 11, 18, 1, 'ribbon').cbox(2, 0, -12, 18, 1, 'ribbon');
    g.cbox(2, 18, 12, 5, 1, 'ribbon').cbox(2, 18, -13, 5, 1, 'ribbon');
    g.box(11, 0, -2, 1, 18, 4, 'ribbon').box(12, 18, -2, 1, 5, 4, 'ribbon');
    g.cbox(2, 22, -13, 1, 26, 'ribbon').box(0, 22, -2, 13, 1, 4, 'ribbon');
    // Bow: two loops and the knot.
    g.ellipsoid(4.5, 26, 0, 4, 3, 2.5, 'ribbon', 23, 2);
    g.ellipsoid(4.5, 26, 0.5, 2, 1.5, 2.5, 'ribbonDark', 23, 2);
    g.cbox(2, 23, -2, 3, 4, 'ribbonDark');
  },
};

/** A parcel: a box taped along its top and down its ends, a label on its front. */
export const parcel: PropModel = {
  emoji: 'package',
  palette: { box: '#c8925a', boxDark: '#a8743f', tape: '#e8d3a8', label: '#fbf8f0', ink: '#9aa3ae' },
  tinted: ['box', 'boxDark'],
  build(g) {
    g.cbox(12, 0, -12, 26, 24, 'box');
    g.recolor((x, _y, z, c) => (c === 'box' && (x === 11 || x === -12) && (z === 11 || z === -12) ? 'boxDark' : null));
    g.cbox(12, 25, -1, 1, 2, 'boxDark'); // the seam between the flaps
    g.cbox(2, 25, -12, 1, 24, 'tape');
    g.cbox(2, 19, 11, 7, 1, 'tape').cbox(2, 19, -12, 7, 1, 'tape');
    g.sym = false;
    g.box(-10, 4, 11, 8, 6, 1, 'label');
    g.box(-9, 7, 12, 6, 1, 1, 'ink').box(-9, 5, 12, 4, 1, 1, 'ink');
  },
};

/** A two-tier birthday cake on a plate: cream between the tiers, sprinkles, three lit candles. */
export const birthdayCake: PropModel = {
  emoji: 'birthday-cake',
  palette: { plate: '#e8ecf2', cake: '#f6d7a7', cake2: '#f9b8c8', cream: '#fdfaf3', candle: '#7cc7f0', flame: '#ffb52e', berry: '#e2483f', sprinkle: '#4caf50' },
  tinted: [],
  build(g) {
    g.discY(0, 0, 15.5, 15.5, 0, 1, 'plate');
    g.discY(0, 0, 13, 13, 1, 9, 'cake');
    g.discY(0, 0, 13, 13, 10, 1, 'cream');
    // Cream running down the bottom tier in drips.
    g.recolor((x, y, z, c) => (c === 'cake' && y >= 7 && (x * 7 + z * 3 + 40) % 6 < 2 && x * x + z * z > 130 ? 'cream' : null));
    g.discY(0, 0, 9.5, 9.5, 11, 7, 'cake2');
    g.discY(0, 0, 9.5, 9.5, 18, 1, 'cream');
    g.recolor((x, y, z, c) => (c === 'cake2' && y === 14 && (x + z + 30) % 3 === 0 ? 'sprinkle' : null));
    for (const [x, z] of [[4, 0], [-5, 0], [0, -4]] as const) {
      g.sym = false;
      g.box(x, 19, z, 1, 7, 1, 'candle').box(x, 26, z, 1, 2, 1, 'flame');
    }
    g.sym = false;
    for (const [x, z] of [[6, 6], [-7, 5], [0, 8], [7, -5], [-6, -6]] as const) g.box(x, 19, z, 1, 1, 1, 'berry');
  },
};

export const TOY_PROPS: readonly PropModel[] = [
  balloon,
  kite,
  teddyBear,
  ball('soccer-ball', '#f5f5f5'),
  ball('basketball', '#e8873a'),
  ball('volleyball', '#f5f2ea'),
  wrappedGift,
  parcel,
  birthdayCake,
];
