// Emoji props modelled in code (prop-voxels.ts): the lotus, fallen leaves, the potted plant, the seedling and
// the spiral shell. Leaves and petals are curved blades; front is +z.
import { blade, direction, leafShape, type PropModel } from './prop-voxels';

/** A lotus standing out of the water on its stalk, over a round pad: two rings of pink petals round a yellow heart. */
export const lotus: PropModel = {
  emoji: 'lotus',
  palette: { pad: '#4caf50', padDark: '#3a8a3e', stem: '#5a9a3a', petal: '#f07aa8', petalLight: '#ffc2da', heart: '#f4c430' },
  tinted: [],
  build(g) {
    g.sym = false;
    g.discY(0, 0, 9, 9, 0, 1, 'pad');
    g.recolor((x, _y, z, c) => (c === 'pad' && (x * x + z * z > 56 || (x > 0 && Math.abs(z) <= x / 4)) ? 'padDark' : null));
    g.box(-1, 1, -1, 2, 8, 2, 'stem');
    const petal = (t: number): string => (t > 0.62 ? 'petalLight' : 'petal');
    for (let k = 0; k < 6; k++) {
      const h = k * 60 + 30;
      blade(g, { base: [Math.sin((h * Math.PI) / 180), 8, Math.cos((h * Math.PI) / 180)], along: direction(46, h), length: 7.5, halfWidth: leafShape(5), color: petal, cup: 1, thick: 2 });
    }
    for (let k = 0; k < 4; k++) {
      blade(g, { base: [0, 9, 0], along: direction(74, k * 90), length: 7.5, halfWidth: leafShape(4.5), color: petal, cup: 0.8, thick: 2 });
    }
    g.discY(0, 0, 1.6, 1.6, 9, 2, 'heart');
  },
};

/** Fallen leaves blown together: a big red leaf leaning up, two orange ones lying in front of it. */
export const fallenLeaf: PropModel = {
  emoji: 'fallen-leaf',
  palette: { red: '#d9532f', redDark: '#a63a1f', orange: '#f29a38', orangeDark: '#c4702a' },
  tinted: [],
  build(g) {
    g.sym = false;
    const vein = (light: string, dark: string) => (t: number, s: number) => (Math.abs(s) < 0.16 && t < 0.92 ? dark : light);
    blade(g, { base: [3, 0, -3], along: direction(66, 186), length: 17, halfWidth: leafShape(8.5), color: vein('red', 'redDark'), cup: 1, thick: 2 });
    blade(g, { base: [-2, 0, 3], along: direction(5, 290), length: 8, halfWidth: leafShape(5.5), color: vein('orange', 'orangeDark'), cup: 1.2, thick: 1 });
    blade(g, { base: [1, 0, 5], along: direction(5, 235), length: 8, halfWidth: leafShape(5), color: vein('orange', 'orangeDark'), cup: 1, thick: 1 });
  },
};

/** A potted plant: terracotta pot with a rim, dark soil, a spray of leaves arching out. */
export const pottedPlant: PropModel = {
  emoji: 'potted-plant',
  palette: { pot: '#d9734a', potDark: '#b45a36', rim: '#e88a5c', soil: '#5a3d2b', leaf: '#5cb85c', leafDark: '#3e8e41', stem: '#4e8a3a' },
  tinted: [],
  build(g) {
    for (let y = 0; y < 7; y++) g.discY(0, 0, 4 + y * 0.25, 4 + y * 0.25, y, 1, y < 1 ? 'potDark' : 'pot');
    g.discY(0, 0, 6, 6, 7, 2, 'rim');
    g.discY(0, 0, 5, 5, 8, 1, 'soil');
    g.cbox(1, 9, -1, 2, 2, 'stem');
    g.sym = false;
    const vein = (t: number, s: number): string => (Math.abs(s) < 0.15 && t < 0.9 ? 'leafDark' : 'leaf');
    for (const [heading, tilt, length] of [[20, 52, 9], [110, 58, 10], [200, 50, 9], [290, 64, 10]] as const) {
      blade(g, { base: [0, 10, 0], along: direction(tilt, heading), length, halfWidth: leafShape(5), color: vein, cup: 1, thick: 2 });
    }
  },
};

/** A seedling: a mound of earth, a short stem, two leaves opening sideways. */
export const seedling: PropModel = {
  emoji: 'seedling',
  palette: { soil: '#7a5236', soilDark: '#5a3d2b', stem: '#6aa83a', leaf: '#7ccf3a', leafDark: '#4f9a28' },
  tinted: [],
  build(g) {
    g.ellipsoid(0, 0, 0, 10, 5.5, 7.5, 'soil', 0, 2);
    g.recolor((x, y, z, c) => (c === 'soil' && (x * 3 + z * 5 + y * 7 + 60) % 7 === 0 ? 'soilDark' : null));
    g.sym = false;
    g.line(0, 5, 0, -1, 10, 0, 'stem', 2).line(-1, 10, 0, 0, 14, 0, 'stem', 2);
    const vein = (t: number, s: number): string => (Math.abs(s) < 0.14 && t < 0.85 ? 'leafDark' : 'leaf');
    blade(g, { base: [1, 15, 1], along: direction(30, 90), length: 10, halfWidth: leafShape(7.5), color: vein, cup: 1.4, thick: 2 });
    blade(g, { base: [0, 15, 1], along: direction(38, 270), length: 9, halfWidth: leafShape(6.5), color: vein, cup: 1.4, thick: 2 });
  },
};

/**
 * A spiral sea shell (a conch) lying on its side: a stepped spire pointing up and to the left, widening into a
 * round body whorl; a band winds round it, the pink mouth opens to the front of the body.
 */
export const spiralShell: PropModel = {
  emoji: 'spiral-shell',
  palette: { shell: '#f3e6d8', band: '#c9a7c8', mouth: '#f2a0b6', mouthDark: '#d97a98' },
  tinted: ['shell', 'band'],
  build(g) {
    g.sym = false;
    const [spire, body, widest] = [12, 10.5, 7.3];
    // The axis from the spire's tip down through the body.
    const tip = [-10, 20] as const;
    const dir = [Math.cos(-0.7), Math.sin(-0.7)] as const;
    const side = [-dir[1], dir[0]] as const;
    /** Radius at `h` along the axis: a cone in whorl steps along the spire, then the round body. */
    const radius = (h: number): number => {
      if (h < spire) return widest * (h / spire) * (0.78 + 0.22 * ((h / 2.6) % 1));
      const k = (h - spire) / body;
      return widest * Math.sqrt(Math.max(0, 1 - k * k));
    };
    for (let x = -13; x <= 15; x++) {
      for (let y = -5; y <= 23; y++) {
        for (let z = -8; z <= 8; z++) {
          const [px, py, pz] = [x + 0.5 - tip[0], y + 0.5 - tip[1], z + 0.5];
          const h = px * dir[0] + py * dir[1];
          if (h < 0 || h > spire + body) continue;
          const a = px * side[0] + py * side[1];
          if (Math.hypot(a, pz) > radius(h)) continue;
          const turn = (((Math.atan2(pz, a) + h) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          g.box(x, y, z, 1, 1, 1, turn < 0.9 ? 'band' : 'shell');
        }
      }
    }
    // The mouth: hollowed into the front of the body whorl, below its middle.
    const [cx, cy] = [tip[0] + dir[0] * (spire + body * 0.35), tip[1] + dir[1] * (spire + body * 0.35)];
    g.ellipsoid(cx, cy - 1.6, 5.2, 3.6, 3.2, 2.4, 'mouth', -Infinity, 2);
    g.ellipsoid(cx, cy - 1.6, 6.2, 2.9, 2.4, 1.8, 'mouthDark', -Infinity, 2);
    g.ellipsoid(cx, cy - 1.6, 7.2, 2.9, 2.4, 1.8, null, -Infinity, 2);
  },
};

export const NATURE_PROPS: readonly PropModel[] = [lotus, fallenLeaf, pottedPlant, seedling, spiralShell];
