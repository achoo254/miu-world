// Boards she stands on, sized for her feet, and the flying things she sits on (build-vehicles.ts).
import { type VehicleModel, wheel } from './vehicle-voxel-grid';

export const skateboard: VehicleModel = {
  id: 'vehicle-skateboard-red',
  ride: { height: 0.3125, pose: 'stand' },
  palette: {
    deck: '#e05a4f',
    stripe: '#ffffff',
    stripe2: '#ffd23f',
    truck: '#c0c7d2',
    wheel: '#ffe9a8',
    grip: '#3b3446',
    bolt: '#8a93a3',
  },
  derived: { deckDark: ['deck', 0.75], wheelDark: ['wheel', 0.82] },
  build(g) {
    // Two-ply deck with rounded ends and kicked-up nose and tail.
    g.discY(0, 13, 7, 5, 3, 2, 'deck');
    g.discY(0, -13, 7, 5, 3, 2, 'deck');
    g.cbox(7, 3, -13, 2, 26, 'deck');
    g.box(-8, 3, 15, 16, 2, 6, null).box(-8, 3, -21, 16, 2, 6, null);
    g.discY(0, 15, 6, 3.5, 4, 2, 'deck').cbox(5, 5, 17, 1, 2, 'deck').cbox(4, 6, 19, 1, 1, 'deck');
    g.discY(0, -16, 6, 3.5, 4, 2, 'deck').cbox(5, 5, -19, 1, 2, 'deck').cbox(4, 6, -20, 1, 1, 'deck');
    g.recolor((_x, y, _z, c) => (c === 'deck' && y === 3 ? 'deckDark' : null));
    // Grip tape where her feet go, a racing stripe between, flame stripes on the ends.
    g.cbox(6, 4, -11, 1, 7, 'grip').cbox(6, 4, 4, 1, 7, 'grip');
    g.cbox(2, 4, -4, 1, 8, 'stripe2');
    g.cbox(6, 4, -4, 1, 1, 'stripe').cbox(6, 4, 3, 1, 1, 'stripe');
    g.box(3, 4, 12, 3, 1, 1, 'stripe').box(1, 4, 13, 2, 1, 2, 'stripe2');
    g.box(3, 4, -13, 3, 1, 1, 'stripe').box(1, 4, -15, 2, 1, 2, 'stripe2');
    for (const z of [10, -11]) g.box(2, 4, z, 1, 1, 1, 'bolt').box(4, 4, z, 1, 1, 1, 'bolt').box(2, 4, z + 2, 1, 1, 1, 'bolt').box(4, 4, z + 2, 1, 1, 1, 'bolt');
    // Trucks: riser pad, baseplate, hanger and axle; urethane wheels with bearings.
    for (const z of [10, -12]) {
      g.cbox(3, 2, z, 1, 3, 'grip');
      g.cbox(2, 1, z + 1, 1, 2, 'truck');
      g.cbox(5, 1, z + 1, 1, 1, 'truck');
      g.box(5, 0, z, 3, 3, 3, 'wheel');
      g.box(5, 0, z, 1, 3, 3, 'wheelDark');
      g.box(8, 1, z + 1, 1, 1, 1, 'truck');
    }
  },
};

export const scooter: VehicleModel = {
  id: 'vehicle-scooter-pink',
  ride: { height: 0.3125, pose: 'stand' },
  palette: {
    body: '#ff7eb6',
    deck: '#3b3446',
    metal: '#c0c7d2',
    grip: '#ffffff',
    wheel: '#3b3446',
    hub: '#ffd23f',
    light: '#fff6c0',
    rim: '#ffffff',
  },
  derived: { bodyDark: ['body', 0.8] },
  build(g) {
    // Deck with grip tape and coloured side rails, a kicked tail and a neck to the stem.
    g.cbox(5, 3, -14, 2, 27, 'body');
    g.cbox(4, 4, -12, 1, 23, 'deck');
    g.cbox(2, 4, -10, 1, 1, 'body').cbox(2, 4, 8, 1, 1, 'body');
    g.cbox(4, 2, -12, 1, 23, 'bodyDark');
    g.cbox(3, 5, 11, 2, 4, 'body');
    g.cbox(2, 7, 13, 2, 3, 'body');
    // Rear wheel under a brake fender; front wheel in a fork.
    wheel(g, { x: 0, w: 2, cy: 3.5, cz: -17, r: 3.5, lite: true, cap: 'hub', rim: 'rim' });
    g.cbox(3, 7, -21, 1, 7, 'body');
    g.cbox(2, 6, -22, 1, 2, 'body');
    g.cbox(4, 3, -15, 2, 2, 'bodyDark');
    wheel(g, { x: 0, w: 2, cy: 3.5, cz: 19, r: 3.5, lite: true, cap: 'hub', rim: 'rim' });
    g.box(2, 3, 18, 1, 7, 2, 'body');
    g.cbox(3, 8, 17, 2, 4, 'body');
    // Stem with a clamp, T-bar with soft grips, a bell and a headlight.
    g.cbox(1, 10, 18, 13, 2, 'metal');
    g.cbox(2, 15, 17, 3, 4, 'body');
    g.cbox(10, 23, 18, 1, 2, 'metal');
    g.cbox(2, 22, 18, 2, 2, 'body');
    g.box(7, 22, 17, 5, 3, 3, 'grip');
    g.box(11, 23, 18, 1, 1, 1, 'body');
    g.box(2, 24, 18, 2, 1, 2, 'hub');
    g.cbox(2, 18, 20, 3, 1, 'metal');
    g.cbox(1, 19, 21, 1, 1, 'light');
    // Kickstand folded under the deck.
    g.box(5, 1, -6, 1, 2, 6, 'metal');
  },
};

export const hoverboard: VehicleModel = {
  id: 'vehicle-hoverboard-blue',
  ride: { height: 0.375, pose: 'stand', float: true },
  palette: {
    board: '#3f7ac0',
    rim: '#ffffff',
    glow: '#5fe0ff',
    dark: '#3b3446',
    metal: '#c0c7d2',
  },
  derived: { boardDark: ['board', 0.75], boardLight: ['board', 1.3] },
  build(g) {
    // Stadium-shaped board: white rim, glowing seam, dark belly.
    g.discY(0, 0, 10, 19, 3, 3, 'board');
    g.recolor((x, y, z, c) => {
      if (c !== 'board') return null;
      const r = ((x + 0.5) / 10) ** 2 + ((z + 0.5) / 19) ** 2;
      if (y === 3) return r > 0.78 ? 'glow' : 'dark';
      return r > 0.8 ? 'rim' : null;
    });
    // Foot pads where she stands, arrows ahead, a lit band across the nose and tail.
    g.discY(0, 0, 6, 9, 5, 1, 'boardDark');
    g.cbox(5, 5, -2, 1, 4, 'board');
    g.cbox(1, 5, 11, 1, 3, 'glow').cbox(2, 5, 12, 1, 1, 'glow');
    g.cbox(1, 5, -14, 1, 3, 'boardLight');
    g.cbox(3, 5, 15, 1, 1, 'rim').cbox(3, 5, -16, 1, 1, 'rim');
    // Two thruster pods underneath, glowing rings.
    for (const z of [10, -10]) {
      g.discY(-0.0, z, 5, 5, 1, 2, 'metal');
      g.discY(-0.0, z, 4, 4, 1, 1, 'dark');
      g.discY(-0.0, z, 2.5, 2.5, 1, 1, 'glow');
    }
    // Little tail fins.
    g.box(6, 6, -16, 1, 2, 3, 'rim');
    g.box(6, 8, -17, 1, 1, 2, 'board');
  },
};

export const rocketBoard: VehicleModel = {
  id: 'vehicle-rocket-board-red',
  ride: { height: 0.4375, pose: 'stand', float: true },
  palette: {
    body: '#e05a4f',
    white: '#ffffff',
    window: '#5fe0ff',
    metal: '#8a93a3',
    flame: '#f28a3c',
    flame2: '#ffd23f',
  },
  derived: { bodyDark: ['body', 0.78] },
  build(g) {
    // Rocket hull lying flat, its top flattened into her deck.
    g.discZ(0, 4.5, 7.5, 3, -16, 34, 'body');
    // Nose cone tapering to a point.
    for (let i = 0; i < 9; i++) g.discZ(0, 4.5 - i * 0.1, 7.5 * (1 - i / 10), 3 * (1 - i / 12), 18 + i, 1, i < 6 ? 'white' : 'body');
    g.cbox(1, 4, 27, 1, 1, 'body');
    // White bands, portholes on the sides, rivets, a grip plate on top.
    for (const z of [9, -9]) g.discZ(0, 4.5, 7.8, 3.2, z, 2, 'white');
    for (const z of [3, -3]) g.box(7, 3, z - 1, 1, 3, 3, 'metal').box(7, 4, z, 1, 1, 1, 'window');
    g.cbox(4, 6, -7, 1, 15, 'metal');
    g.cbox(3, 6, -6, 1, 13, 'bodyDark');
    for (let z = -13; z < 16; z += 4) g.paintTop(5, z, 'white');
    // Four fins at the back.
    for (let i = 0; i < 5; i++) g.box(7, 3, -16 + i, 1 + Math.floor((5 - i) * 0.8), 2, 1, 'body');
    g.box(7, 3, -16, 4, 1, 3, 'white');
    for (let i = 0; i < 4; i++) g.cbox(1, 7, -16 + i, 4 - i, 1, 'body');
    g.cbox(1, 0, -16, 2, 4, 'body');
    // Nozzle and a two-tone flame.
    g.discZ(0, 4.5, 5, 2.5, -19, 3, 'metal');
    g.discZ(0, 4.5, 3.5, 1.8, -20, 1, 'bodyDark');
    for (let i = 0; i < 7; i++) g.discZ(0, 4.5, 4.4 * (1 - i / 8), 2.2 * (1 - i / 9), -21 - i, 1, 'flame');
    for (let i = 0; i < 5; i++) g.discZ(0, 4.5, 2.4 * (1 - i / 6), 1.2, -21 - i, 1, 'flame2');
  },
};

export const carpet: VehicleModel = {
  id: 'vehicle-carpet-red',
  ride: { height: 0.3125, pose: 'sit', float: true },
  palette: {
    carpet: '#c0392b',
    border: '#ffd23f',
    pattern: '#3f7ac0',
    tassel: '#ffd23f',
  },
  derived: { carpetDark: ['carpet', 0.78], patternLight: ['pattern', 1.35] },
  build(g) {
    // Woven field with a gold border and a dark edge, two thick.
    g.cbox(15, 3, -22, 2, 41, 'carpet');
    g.recolor((x, y, z, c) => {
      if (c !== 'carpet') return null;
      const ex = 15 - Math.abs(x + 0.5);
      const ez = Math.min(z + 22, 18 - z);
      const e = Math.min(ex, ez);
      if (y === 3) return 'carpetDark';
      if (e < 1) return 'carpetDark';
      if (e >= 2 && e < 4) return 'border';
      if (e >= 5 && e < 6) return 'pattern';
      // Diamond medallions ahead of and behind her, corner flowers.
      const dx = Math.abs(x + 0.5);
      if (dx + Math.abs(z - 12) < 5.5) return dx + Math.abs(z - 12) < 2.5 ? 'border' : 'pattern';
      if (dx + Math.abs(z + 14) < 5.5) return dx + Math.abs(z + 14) < 2.5 ? 'border' : 'pattern';
      if (Math.hypot(dx - 9, Math.abs(z - (z > 0 ? 15 : -17))) < 1.6) return 'patternLight';
      return null;
    });
    // Front edge rolled up into a curl, joined to the carpet underneath.
    g.ringX(-15, 30, 6.5, 19.5, 3.4, 1.9, 'carpet');
    for (let y = 0; y < 7; y++) for (let z = 15; z < 20; z++) if (y + 0.5 < 6.5 && z + 0.5 < 19.5) g.box(-16, y, z, 32, 1, 1, null);
    g.cbox(15, 3, 18, 2, 4, 'carpet');
    g.recolor((_x, y, z, c) => (c === 'carpet' && (z >= 22 || y >= 9) ? 'border' : null));
    // Tassels along the back edge and at the curl ends.
    for (let x = 0; x < 15; x += 2) g.box(x, 3, -24, 1, 1, 2, 'tassel').box(x, 2, -25, 1, 1, 1, 'tassel');
    g.box(15, 8, 22, 1, 2, 2, 'tassel');
    // A round cushion to lean on, with gold corners.
    g.cbox(8, 5, -12, 5, 4, 'pattern');
    g.cbox(7, 10, -11, 1, 2, 'pattern');
    g.box(7, 5, -12, 2, 2, 1, 'tassel').box(7, 8, -12, 2, 2, 1, 'tassel');
    g.cbox(6, 7, -9, 1, 1, 'patternLight');
  },
};

export const cloud: VehicleModel = {
  id: 'vehicle-cloud-white',
  ride: { height: 0.5, pose: 'sit', float: true },
  palette: {
    cloud: '#ffffff',
    shade: '#dfe8f5',
    p1: '#ffffff',
    p2: '#ffffff',
    p3: '#ffffff',
    eye: '#3b3446',
    blush: '#ff9eb5',
  },
  build(g) {
    // Flat base with a soft shaded belly.
    g.ellipsoid(0, 5.5, -1, 17, 4.5, 20, 'cloud', 1);
    // Puffs: a high one behind her back, one each side, smaller ones round the rim.
    g.ellipsoid(0, 12, -14, 10, 7, 6.5, 'p2');
    g.sym = false;
    g.ellipsoid(13.5, 9.5, -3, 6.5, 6, 7.5, 'p1');
    g.ellipsoid(-14.5, 9.5, -3, 6.5, 6, 7.5, 'p3');
    g.ellipsoid(9, 15, -11, 4, 3.5, 4, 'p1');
    g.ellipsoid(-10, 15, -11, 4, 3.5, 4, 'p3');
    g.sym = true;
    g.ellipsoid(9, 7.5, 12, 6, 4.5, 6, 'cloud');
    g.ellipsoid(0, 8, 17, 6.5, 5, 5.5, 'cloud');
    g.ellipsoid(14, 6.5, -16, 5, 4, 5, 'cloud');
    // A dip to sit in, open in front for her legs.
    g.box(-8, 8, -8, 16, 12, 16, null);
    g.recolor((_x, y, _z, c) => (y <= 2 ? 'shade' : c === 'cloud' && y === 3 ? 'shade' : null));
    // A happy face on the front puff.
    for (const [x, y, c] of [
      [2, 9, 'eye'],
      [3, 9, 'eye'],
      [2, 10, 'eye'],
      [3, 10, 'eye'],
      [5, 7, 'blush'],
      [6, 7, 'blush'],
      [0, 6, 'eye'],
      [1, 7, 'eye'],
    ] as const) {
      g.paintFront(x, y, c);
      g.paintFront(-x - 1, y, c);
    }
    // Little puffs trailing behind.
    g.ellipsoid(0, 4, -25, 4, 2.5, 3, 'cloud');
    g.ellipsoid(0, 3, -30, 2.5, 1.6, 2, 'cloud');
  },
};

export const starship: VehicleModel = {
  id: 'vehicle-starship',
  ride: { height: 0.5, pose: 'sit', float: true },
  palette: {
    hull: '#ffd23f',
    edge: '#fff6c0',
    gem: '#5fe0ff',
    glow: '#b0f0ff',
    metal: '#8a93a3',
    seat: '#3b3446',
  },
  derived: { hullDark: ['hull', 0.78] },
  build(g) {
    // Saucer: wide rim, sloped top, lower bowl and a glowing belly.
    g.discY(0, 0, 20, 20, 4, 2, 'hull');
    g.discY(0, 0, 17, 17, 6, 1, 'hull');
    g.discY(0, 0, 14, 14, 7, 1, 'hullDark');
    g.discY(0, 0, 16, 16, 3, 1, 'edge');
    g.discY(0, 0, 12, 12, 2, 1, 'metal');
    g.discY(0, 0, 7, 7, 1, 1, 'glow');
    // Rim lights round the edge.
    g.recolor((x, y, z, c) => {
      if (c !== 'hull' || y !== 4) return null;
      const r = Math.hypot(x + 0.5, z + 0.5);
      const a = Math.atan2(x + 0.5, z + 0.5);
      return r > 18.6 && Math.abs(Math.sin(a * 6)) < 0.3 ? 'gem' : null;
    });
    // Open cockpit: a raised coaming ring, a curved glass shield ahead of her.
    g.recolor((x, _y, z, c) => (c === 'hullDark' && Math.hypot(x + 0.5, z + 0.5) < 10 ? 'edge' : null));
    g.discY(0, 0, 12.5, 12.5, 8, 2, 'edge');
    g.discY(0, 0, 11, 11, 8, 2, null);
    for (let y = 10; y < 14; y++) {
      for (let x = -9; x < 9; x++)
        for (let z = 0; z < 14; z++) {
          const r = Math.hypot(x + 0.5, z + 0.5);
          if (r > 11 && r <= 12.4 && z > 6 - (y - 10)) g.box(x, y, z, 1, 1, 1, 'glow');
        }
    }
    // Seat back and side rests, a control stick, an antenna and tail fins.
    g.cbox(7, 8, -11, 8, 2, 'seat');
    g.cbox(5, 16, -11, 2, 2, 'seat');
    g.box(6, 8, -9, 3, 4, 8, 'seat');
    g.cbox(1, 8, 8, 4, 1, 'metal');
    g.cbox(1, 12, 8, 1, 1, 'gem');
    g.cbox(1, 7, -17, 12, 2, 'metal');
    g.ellipsoid(0, 20, -16, 1.6, 1.6, 1.6, 'gem');
    for (let i = 0; i < 5; i++) g.box(9, 7, -19 + i, 1, 6 - i, 1, 'hull');
    g.box(9, 13, -19, 1, 1, 2, 'gem');
    // Thrusters on the belly.
    for (const z of [10, -10]) g.box(9, 2, z, 3, 1, 3, 'glow');
  },
};
