// Emoji props modelled in code (prop-voxels.ts): the parked car, the bus, the railway carriage, the sailboat
// and the playground slide. Seen side-on like their pictures: the car, bus and carriage are built nose to +z
// and turned to face −x, the way the pictures face.
import { type PropModel } from './prop-voxels';
import { wheel } from './vehicle-voxel-grid';

const WHEEL = { wheel: '#33303a', rim: '#dfe4ea', hub: '#9aa3ae' };

/** A small parked car, the kind the life-size ride cars are drawn in: body, cabin with glass all round, four wheels. */
export const automobile: PropModel = {
  emoji: 'automobile',
  palette: { body: '#e2483f', bodyDark: '#b5352e', glass: '#a6dcf7', light: '#fff3b0', rear: '#ff5a4a', bumper: '#c5ccd6', grill: '#4a4f5c', rack: '#5a5560', ...WHEEL },
  tinted: ['body', 'bodyDark'],
  turn: 1,
  build(g) {
    // Lower body y 3–11 with rounded corners, the cabin above it, the roof and a roof rack.
    g.cbox(8, 3, -15, 8, 30, 'body');
    g.box(7, 3, 14, 1, 8, 1, null).box(7, 3, -15, 1, 8, 1, null);
    g.cbox(8, 10, 9, 1, 6, 'bodyDark'); // bonnet line
    g.cbox(7, 11, -12, 8, 18, 'body');
    g.cbox(7, 19, -11, 1, 15, 'body');
    g.box(5, 20, -9, 1, 1, 11, 'rack');
    // Glass: windscreen, back window, two side windows a side with a pillar between.
    g.cbox(6, 12, 5, 6, 1, 'glass');
    g.cbox(6, 12, -12, 6, 1, 'glass');
    g.box(6, 12, -10, 1, 6, 6, 'glass').box(6, 12, -2, 1, 6, 6, 'glass');
    // Side: door seam and handle, sill.
    g.box(7, 4, -3, 1, 7, 1, 'bodyDark').box(7, 9, 0, 1, 1, 2, 'bumper');
    g.box(7, 3, -6, 1, 1, 12, 'bodyDark');
    // Wheel arches and wheels.
    for (const cz of [9, -9]) {
      g.discX(5, 4, 4.5, cz, 5.4, null);
      wheel(g, { x: 5, w: 3, cy: 4.5, cz, r: 4.5, lite: true });
    }
    // Front: headlights, grille, bumper. Back: lights, bumper.
    g.box(4, 7, 14, 3, 2, 1, 'light');
    g.cbox(3, 5, 14, 3, 1, 'grill');
    g.cbox(8, 2, 15, 3, 1, 'bumper');
    g.box(5, 7, -15, 2, 3, 1, 'rear');
    g.cbox(8, 2, -16, 3, 1, 'bumper');
  },
};

/** A big bus: long body, a row of windows each side, a stripe, the door and the wheels. */
export const bus: PropModel = {
  emoji: 'bus',
  palette: { body: '#f4c430', bodyDark: '#c99a1c', roof: '#f7f3e8', glass: '#a6dcf7', stripe: '#3b3446', light: '#fff3b0', rear: '#ff5a4a', bumper: '#5a5560', sign: '#3b3446', ...WHEEL },
  tinted: ['body', 'bodyDark'],
  turn: 1,
  build(g) {
    g.cbox(9, 4, -20, 25, 40, 'body');
    g.box(8, 4, 19, 1, 25, 1, null).box(8, 4, -20, 1, 25, 1, null);
    g.cbox(8, 29, -19, 2, 38, 'roof');
    g.cbox(4, 31, -10, 1, 8, 'roof'); // roof hatch
    // Windows along both sides, pillars between; the windscreen and the sign above it.
    for (let z = -17; z < 14; z += 6) g.box(8, 17, z, 1, 8, 5, 'glass');
    g.box(8, 13, -20, 1, 2, 40, 'stripe');
    g.box(8, 5, 13, 1, 20, 5, 'glass'); // door
    g.box(8, 5, 15, 1, 20, 1, 'bodyDark');
    g.cbox(8, 14, 19, 12, 1, 'glass');
    g.cbox(6, 27, 19, 2, 1, 'sign');
    g.cbox(8, 4, -20, 1, 40, 'bodyDark');
    // Wheels.
    for (const cz of [12, -12]) {
      g.discX(6, 4, 5.5, cz, 6.4, null);
      wheel(g, { x: 6, w: 3, cy: 5.5, cz, r: 5.5, lite: true });
    }
    // Front and back.
    g.box(5, 7, 19, 3, 3, 1, 'light');
    g.cbox(9, 3, 20, 3, 1, 'bumper');
    g.box(6, 8, -20, 2, 4, 1, 'rear');
    g.cbox(9, 3, -21, 3, 1, 'bumper');
  },
};

/** A railway carriage (a tram): body with a pale band of windows, doors, a roof with a pantograph, two bogies. */
export const railwayCar: PropModel = {
  emoji: 'railway-car',
  palette: { body: '#3fb6a8', bodyDark: '#2b8a7f', trim: '#f5f2ea', roof: '#d8dde4', glass: '#a6dcf7', dark: '#3b3446', light: '#fff3b0', ...WHEEL },
  tinted: ['body', 'bodyDark'],
  turn: 1,
  build(g) {
    g.cbox(8, 6, -18, 22, 36, 'body');
    g.box(7, 6, 17, 1, 22, 1, null).box(7, 6, -18, 1, 22, 1, null);
    g.cbox(8, 13, -18, 12, 36, 'trim');
    g.box(7, 13, 17, 1, 12, 1, null).box(7, 13, -18, 1, 12, 1, null);
    for (let z = -15; z < 14; z += 6) g.box(7, 16, z, 1, 7, 4, 'glass');
    g.box(7, 7, -2, 1, 17, 4, 'bodyDark'); // door
    g.box(7, 16, -1, 1, 6, 2, 'glass');
    g.cbox(6, 15, 17, 9, 1, 'glass');
    g.cbox(6, 15, -18, 9, 1, 'glass');
    g.cbox(7, 28, -17, 2, 34, 'roof');
    // Pantograph: two arms up to a bar.
    g.line(0, 30, -5, 0, 35, 0, 'dark').line(0, 30, 5, 0, 35, 0, 'dark');
    g.cbox(5, 36, -1, 1, 2, 'dark');
    // Bogies with two wheels each, lights front and back.
    g.cbox(6, 3, -16, 3, 32, 'dark');
    for (const cz of [13, 7, -7, -13]) wheel(g, { x: 5, w: 2, cy: 3, cz, r: 3, lite: true });
    g.box(4, 9, 17, 2, 2, 1, 'light').box(4, 9, -18, 2, 2, 1, 'light');
  },
};

/** A sailboat side-on: a round-bellied hull with a deck, the mast, a mainsail and a jib, a flag on top. */
export const sailboat: PropModel = {
  emoji: 'sailboat',
  palette: { hull: '#e2483f', hullDark: '#b5352e', deck: '#c8925a', mast: '#8a5a33', sail: '#fbf8f0', sailShade: '#e8e2d4', flag: '#f4c430', band: '#fbf8f0' },
  tinted: ['hull', 'hullDark'],
  build(g) {
    g.sym = false;
    // Hull: layers widening upward, bow to −x, a white band, the deck on top.
    for (let y = 0; y < 8; y++) g.discY(0, 0, 9 + y * 1.1, 2.6 + y * 0.55, y, 1, y < 3 ? 'hullDark' : 'hull');
    g.recolor((_x, y, _z, c) => (c === 'hull' && y === 6 ? 'band' : null));
    g.discY(0, 0, 15.5, 5.5, 8, 1, 'deck');
    // Mast and sails (two blocks thick), the mainsail behind the mast, the jib before it.
    g.box(0, 9, -1, 1, 24, 2, 'mast');
    for (let y = 11; y < 31; y++) {
      const reach = Math.round((31 - y) * 0.6);
      g.box(1, y, -1, reach, 1, 2, y % 5 === 0 ? 'sailShade' : 'sail');
      const jib = Math.round((y - 10) * 0.45);
      if (y < 27 && jib > 0) g.box(-jib, y, -1, jib, 1, 2, 'sail');
    }
    g.box(1, 30, 0, 4, 2, 1, 'flag');
  },
};

/** A playground slide side-on: a ladder up to a railed platform, the chute down with low sides. */
export const playgroundSlide: PropModel = {
  emoji: 'playground-slide',
  palette: { frame: '#3d8fe0', rung: '#f4c430', deck: '#f4c430', slide: '#e2483f', slideDark: '#b5352e' },
  tinted: ['slide', 'slideDark'],
  build(g) {
    g.sym = false;
    // Ladder: two rails each side, rungs between them.
    for (const z of [-5, 4]) {
      g.box(-16, 0, z, 1, 29, 1, 'frame');
      g.box(-11, 0, z, 1, 29, 1, 'frame');
      g.box(-16, 28, z, 6, 1, 1, 'frame');
    }
    for (let y = 3; y < 21; y += 4) g.box(-16, y, -4, 1, 1, 8, 'rung');
    g.box(-16, 21, -5, 6, 1, 10, 'deck');
    g.box(-16, 25, -5, 6, 1, 1, 'frame').box(-16, 25, 4, 6, 1, 1, 'frame');
    // The chute from the platform to the ground, sides one block high.
    for (let i = 0; i < 27; i++) {
      const y = Math.max(0, Math.round(21 - i * 0.82));
      g.box(-10 + i, y, -4, 1, 1, 8, 'slide');
      g.box(-10 + i, y, -5, 1, 2, 1, 'slideDark').box(-10 + i, y, 4, 1, 2, 1, 'slideDark');
    }
    g.box(4, 0, -1, 1, 9, 2, 'frame'); // support under the chute
  },
};

export const VEHICLE_PROPS: readonly PropModel[] = [automobile, bus, railwayCar, sailboat, playgroundSlide];
