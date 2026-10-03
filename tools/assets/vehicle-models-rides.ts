// Life-size rides shaped like animals and fairy-tale things, and the tricycle (build-vehicles.ts).
import { type Grid, type VehicleModel, wheel } from './vehicle-voxel-grid';
import { headlight, steeringWheel } from './vehicle-models-cars';

/** Cuts wheel arches into a body and puts the wheels in (x: inner face of the tyre, mirrored). */
function archWheels(g: Grid, zs: number[], o: { x: number; w: number; r: number; tyre?: string; rim?: string; hub?: string; cap?: string; lite?: boolean; liner?: string }): void {
  for (const cz of zs) {
    g.discX(o.x - 1, o.w + 3, o.r, cz, o.r + 1.4, null);
    if (o.liner) g.discX(o.x - 2, 1, o.r, cz, o.r + 1.4, o.liner);
    g.box(o.x - 1, -4, cz - o.r - 3, o.w + 3, 4 + Math.floor(o.r * 0.6), 2 * o.r + 6, null);
  }
  for (const cz of zs) wheel(g, { ...o, cy: o.r, cz });
}

export const duckCar: VehicleModel = {
  id: 'vehicle-duck-car-yellow',
  ride: { height: 0.5625, pose: 'sit' },
  palette: {
    body: '#ffd23f',
    shade: '#f0b429',
    beak: '#f28a3c',
    eye: '#3b3446',
    white: '#ffffff',
    blush: '#ff9eb5',
    wheel: '#3b3446',
    hub: '#f28a3c',
    rim: '#ffffff',
    seat: '#5fb0ff',
  },
  derived: { beakDark: ['beak', 0.8], seatDark: ['seat', 0.8] },
  variantExtra: { mint: { seat: '#ff9eb5' } },
  build(g) {
    const top = 9;
    // Round duck body, flat underneath, hollowed into a cosy seat.
    g.ellipsoid(0, 10, -4, 15.5, 8.5, 21, 'body', 3, 4);
    g.ellipsoid(0, 15, -3, 11, 9, 13, null, 7, 6);
    g.cbox(11, 6, -14, 1, 20, 'shade');
    g.cbox(9, top - 2, -12, 2, 15, 'seat');
    g.cbox(8, top - 1, 2, 1, 1, 'seatDark');
    g.cbox(9, top - 2, -15, 9, 3, 'seat');
    // Belly band and a darker underside.
    g.recolor((_x, y, _z, c) => (c === 'body' && y <= 4 ? 'shade' : null));
    // Wings folded on the sides, feathers in rows.
    g.ellipsoid(13.5, 12, -6, 3, 5, 11, 'shade');
    for (const [y, z] of [[10, 3], [12, 2], [14, 0]] as const) g.box(15, y, z - 12, 2, 1, 4, 'body');
    // Perky tail at the back.
    g.ellipsoid(0, 16, -24, 7, 5, 4.5, 'body');
    g.ellipsoid(0, 21, -26, 4, 3.5, 3, 'body');
    g.cbox(2, 24, -28, 2, 2, 'shade');
    // Neck and round head ahead of her, beak, eyes, blush, a tuft.
    g.ellipsoid(0, 15, 14, 6.5, 6, 6, 'body');
    g.ellipsoid(0, 21, 17, 7.5, 7, 7, 'body');
    g.cbox(4, 18, 23, 3, 5, 'beak');
    g.cbox(4, 17, 23, 1, 4, 'beakDark');
    g.cbox(3, 19, 28, 1, 1, 'beakDark');
    g.box(3, 21, 21, 3, 3, 2, 'white').box(4, 22, 22, 2, 2, 1, 'eye');
    g.box(4, 21, 23, 1, 1, 1, 'white');
    g.box(6, 18, 20, 2, 2, 1, 'blush');
    g.box(0, 28, 15, 1, 2, 2, 'body').box(0, 29, 13, 1, 2, 2, 'body');
    // Bow tie in the seat colour on her chest side.
    g.cbox(3, 14, 19, 2, 2, 'seat');
    g.cbox(1, 14, 21, 2, 1, 'seatDark');
    // Four wheels in arches; the flanks taper ahead of the front pair.
    g.box(11, 0, 19, 6, 9, 12, null);
    archWheels(g, [14, -17], { x: 12, w: 4, r: 5, lite: true, liner: 'shade' });
  },
};

export const swan: VehicleModel = {
  id: 'vehicle-swan-white',
  ride: { height: 0.625, pose: 'sit' },
  palette: {
    body: '#ffffff',
    shade: '#dfe3ea',
    beak: '#f28a3c',
    eye: '#3b3446',
    wheel: '#3b3446',
    hub: '#ffd23f',
    rim: '#ffffff',
    seat: '#ff9eb5',
  },
  derived: { seatDark: ['seat', 0.82], hubDark: ['hub', 0.8] },
  build(g) {
    const top = 10;
    // Boat body, hollowed, a gold rail round the cockpit.
    g.ellipsoid(0, 11, -3, 14.5, 8.5, 21.5, 'body', 3, 4);
    g.ellipsoid(0, 16, -3, 10.5, 9, 12.5, null, 8, 6);
    g.recolor((_x, y, _z, c) => (c === 'body' && y <= 5 ? 'shade' : null));
    g.cbox(10, top - 2, -13, 2, 16, 'seat');
    g.cbox(9, top - 1, 2, 1, 1, 'seatDark');
    g.cbox(9, top - 2, -16, 9, 3, 'seat');
    g.recolor((x, y, z, c) => (c === 'body' && y === 17 && Math.abs(z + 3) < 15 && Math.abs(x + 0.5) > 7 ? 'hub' : null));
    // Raised wings along her sides, feather tips curling up at the back.
    g.ellipsoid(12.5, 17, -7, 3, 6, 13, 'body');
    g.ellipsoid(13, 23, -16, 2.5, 4, 5, 'body');
    for (const [y, z] of [[14, 2], [16, 0], [18, -3], [20, -6]] as const) g.box(14, y, z - 10, 2, 1, 5, 'shade');
    g.box(12, 26, -19, 2, 2, 3, 'shade');
    // Tail.
    g.ellipsoid(0, 16, -24, 6, 4, 4, 'body');
    g.cbox(2, 19, -28, 3, 3, 'shade');
    // S-curved neck rising ahead of her, head, orange beak with its black knob, eyes, a little gold crown.
    g.ellipsoid(0, 15, 17, 4.5, 4.5, 4.5, 'body');
    g.ellipsoid(0, 19, 20, 3.5, 3.5, 3.5, 'body');
    g.ellipsoid(0, 23, 21, 3, 3, 3, 'body');
    g.ellipsoid(0, 27, 20, 3, 3, 3, 'body');
    g.ellipsoid(0, 30, 21, 3.5, 3, 4.5, 'body');
    g.cbox(1, 29, 25, 2, 4, 'beak');
    g.cbox(1, 28, 26, 1, 2, 'beak');
    g.cbox(1, 30, 24, 2, 1, 'eye');
    g.box(2, 31, 22, 2, 1, 1, 'eye');
    g.cbox(2, 33, 19, 1, 3, 'hub');
    g.box(0, 34, 19, 2, 1, 1, 'hub').box(1, 34, 21, 1, 1, 1, 'hub');
    // Wheels under the hull.
    archWheels(g, [12, -17], { x: 10, w: 4, r: 4.5, lite: true, cap: 'hub', liner: 'shade' });
  },
};

export const ladybug: VehicleModel = {
  id: 'vehicle-ladybug-red',
  ride: { height: 0.5625, pose: 'drive' },
  palette: {
    shell: '#e05a4f',
    spot: '#3b3446',
    head: '#3b3446',
    eye: '#ffffff',
    floor: '#3b3446',
    wheel: '#3b3446',
    hub: '#e05a4f',
    rim: '#c0c7d2',
    steer: '#2a2533',
    trim: '#ffffff',
    light: '#fff6c0',
    seat: '#fff3c0',
  },
  derived: { shellDark: ['shell', 0.8], seatDark: ['seat', 0.85] },
  build(g) {
    const top = 9;
    // Dome shell: open low tub ahead of z −12 where she sits, the full dome behind her back.
    g.ellipsoid(0, 6, -6, 17, 16, 21, 'shell', 3, 3.6);
    g.box(-20, 16, -12, 40, 20, 30, null);
    g.ellipsoid(0, 14, -2, 12, 10, 12.5, null, 7);
    g.cbox(12, 6, -8, 1, 18, 'floor');
    g.recolor((_x, y, _z, c) => (c === 'shell' && y <= 5 ? 'shellDark' : null));
    // Black seam down the middle of the dome and round spots.
    g.recolor((x, y, z, c) => (c === 'shell' && z < -12 && (x === 0 || x === -1) && y > 12 ? 'spot' : null));
    const spots: [number, number, number, number][] = [
      [8, 18, -18, 3.2],
      [12, 12, -6, 2.8],
      [5, 20, -26, 2.4],
      [14, 10, -20, 2.6],
      [9, 9, 8, 2.4],
    ];
    g.recolor((x, y, z, c) => {
      if (c !== 'shell') return null;
      const ax = Math.abs(x + 0.5);
      return spots.some(([sx, sy, sz, r]) => Math.hypot(ax - sx, y - sy, z - sz) < r) ? 'spot' : null;
    });
    // Seat and steering wheel.
    g.cbox(9, top - 2, -12, 2, 14, 'seat');
    g.cbox(8, top - 1, 1, 1, 1, 'seatDark');
    g.cbox(10, top - 2, -14, 12, 2, 'seat');
    steeringWheel(g, top, 8, 11);
    // Round black head ahead of her: big eyes with shine, a smile, antennae with red tips.
    g.ellipsoid(0, 10, 17, 10.5, 8.5, 7.5, 'head', 3);
    g.box(2, 11, 22, 5, 5, 3, 'eye').box(3, 12, 24, 3, 3, 1, 'head');
    g.box(4, 14, 24, 1, 1, 1, 'eye');
    g.cbox(3, 7, 24, 1, 1, 'trim');
    g.box(3, 8, 23, 1, 1, 1, 'trim');
    g.line(3, 17, 16, 5, 24, 20, 'head');
    g.line(5, 24, 20, 7, 27, 18, 'head');
    g.ellipsoid(7.5, 28, 18, 1.6, 1.6, 1.6, 'shell');
    // Headlights on the cheeks, tail lights at the back.
    headlight(g, 7, 5, 22, 2, 2, 'head');
    g.box(6, 8, -28, 3, 2, 1, 'shell');
    // Six little legs as wheel arms, four wheels.
    archWheels(g, [12, -18], { x: 12, w: 4, r: 5, lite: true, liner: 'floor' });
    for (const z of [-6, 2]) g.box(15, 4, z, 3, 2, 2, 'head').box(17, 2, z, 2, 2, 2, 'head');
  },
};

export const pumpkin: VehicleModel = {
  id: 'vehicle-pumpkin-carriage',
  ride: { height: 0.75, pose: 'sit' },
  palette: {
    pumpkin: '#f28a3c',
    rib: '#d9661f',
    stem: '#4caf50',
    gold: '#ffd23f',
    seat: '#8a2a8a',
    light: '#fff6c0',
    wheel: '#ffd23f',
    hub: '#c99a1e',
  },
  derived: { seatDark: ['seat', 0.8], stemDark: ['stem', 0.75], goldDark: ['gold', 0.8] },
  build(g) {
    const top = 12;
    // Ribbed pumpkin, open at the top in front of the backrest, hollowed round her.
    g.ellipsoid(0, 15, -2, 16, 12, 16.5, 'pumpkin', 4, 4.5);
    g.recolor((x, _y, z, c) => {
      if (c !== 'pumpkin') return null;
      const a = Math.atan2(x + 0.5, z + 2);
      return Math.abs(Math.sin(a * 4)) < 0.16 ? 'rib' : null;
    });
    g.box(-20, 22, -9, 40, 12, 30, null);
    g.ellipsoid(0, 17, -2, 13, 10, 13.5, null, 10, 6);
    g.cbox(10, top - 2, -12, 2, 15, 'seat');
    g.cbox(9, top - 1, 2, 1, 1, 'seatDark');
    g.cbox(10, top - 2, -14, 13, 3, 'seat');
    g.cbox(9, top + 9, -14, 2, 3, 'seatDark');
    // Gold rim round the opening, round windows with gold frames on the sides.
    g.recolor((_x, y, z, c) => (y === 21 && z > -9 && (c === 'pumpkin' || c === 'rib') ? 'gold' : null));
    g.ringX(15, 2, 16, -2, 4.4, 3.2, 'gold');
    g.discX(15, 1, 16, -2, 3.2, 'light');
    g.box(15, 13, -2, 2, 7, 1, 'goldDark');
    // Curly stem and leaves on top of the back.
    g.cbox(2, 26, -10, 4, 3, 'stem');
    g.line(0, 30, -9, 3, 32, -6, 'stem');
    g.cbox(1, 32, -12, 1, 3, 'stemDark');
    g.box(3, 26, -12, 5, 1, 4, 'stem').box(5, 27, -11, 2, 1, 2, 'stemDark');
    // Gold undercarriage with curls, big spoked wheels, lanterns at the front corners.
    g.cbox(4, 3, -22, 2, 42, 'gold');
    g.cbox(10, 5, 11, 1, 2, 'gold').cbox(10, 5, -16, 1, 2, 'gold');
    g.box(2, 2, 19, 2, 3, 2, 'goldDark').box(2, 2, -24, 2, 3, 2, 'goldDark');
    for (const cz of [11, -15]) wheel(g, { x: 15, w: 3, cy: 8, cz, r: 8, tyre: 'wheel', rim: 'gold', hub: 'hub', bg: 'seatDark', spokes: true });
    g.box(10, 7, 10, 5, 2, 2, 'gold').box(10, 7, -16, 5, 2, 2, 'gold');
    g.box(11, 18, 13, 1, 9, 1, 'gold');
    g.box(10, 26, 12, 3, 4, 3, 'gold').box(10, 27, 15, 3, 2, 1, 'light').box(10, 27, 11, 3, 2, 1, 'light');
    g.box(11, 30, 13, 1, 1, 1, 'gold');
    // Footman's step at the back.
    g.cbox(6, 6, -24, 1, 4, 'gold');
  },
};

export const dragon: VehicleModel = {
  id: 'vehicle-dragon-gold',
  ride: { height: 1, pose: 'sit' },
  palette: {
    scale: '#e0a520',
    belly: '#fff3c0',
    spike: '#e05a4f',
    eye: '#ffffff',
    pupil: '#3b3446',
    horn: '#fff6c0',
    nostril: '#8a5a20',
    wheel: '#3b3446',
    hub: '#e05a4f',
  },
  derived: { scaleDark: ['scale', 0.8], hubDark: ['hub', 0.78] },
  build(g) {
    const top = 16;
    // Big body and pale belly; a saddle dip on the back where she sits.
    g.ellipsoid(0, 10, -6, 13, 9, 21, 'scale', 2, 3.8);
    g.recolor((_x, y, _z, c) => (c === 'scale' && y <= 6 ? 'belly' : null));
    g.box(-14, top, -10, 28, 12, 20, null);
    // Saddle: cushion, pommel, cantle, girth strap and stirrups.
    g.cbox(9, top - 2, -10, 2, 16, 'hub');
    g.cbox(8, top - 1, 5, 1, 2, 'hubDark');
    g.cbox(9, top, -12, 4, 2, 'hub');
    g.cbox(8, top + 3, -12, 1, 2, 'hubDark');
    g.box(12, 3, -3, 2, 12, 2, 'wheel');
    g.box(13, 3, -4, 2, 3, 4, 'wheel');
    // Spikes down the back behind the saddle.
    for (let z = -15; z >= -27; z -= 4) g.cbox(1, 18 - Math.floor((-15 - z) / 5), z, 3, 2, 'spike');
    // Neck curving up to the head ahead of her, a pale throat.
    g.ellipsoid(0, 14, 14, 7, 7, 7, 'scale', -Infinity, 4);
    g.ellipsoid(0, 19, 17, 6, 6, 6, 'scale', -Infinity, 4);
    g.ellipsoid(0, 23, 19, 5.5, 5.5, 5.5, 'scale', -Infinity, 4);
    g.recolor((x, y, z, c) => (c === 'scale' && z > 12 && y < 20 && Math.abs(x + 0.5) < 3 ? 'belly' : null));
    g.cbox(1, 22, 13, 2, 2, 'spike').cbox(1, 26, 15, 2, 2, 'spike');
    // Head: skull, snout with nostrils and teeth, eyes with brows, cheek frills, horns.
    g.cbox(6, 24, 18, 10, 10, 'scale');
    g.cbox(5, 24, 28, 6, 5, 'scale');
    g.cbox(5, 23, 28, 1, 5, 'belly');
    g.cbox(4, 24, 33, 4, 1, 'scale');
    g.box(1, 28, 32, 2, 1, 2, 'nostril');
    g.cbox(5, 25, 31, 1, 1, 'nostril');
    g.box(3, 24, 32, 1, 1, 1, 'horn').box(1, 24, 33, 1, 1, 1, 'horn');
    g.box(6, 28, 21, 1, 4, 4, 'eye').box(6, 28, 23, 1, 3, 2, 'pupil').box(6, 30, 23, 1, 1, 1, 'eye');
    g.cbox(6, 32, 21, 1, 4, 'scaleDark');
    g.box(6, 24, 18, 2, 4, 3, 'spike').box(7, 27, 18, 1, 4, 2, 'spike');
    g.box(3, 34, 18, 2, 2, 3, 'horn').box(4, 36, 15, 2, 2, 3, 'horn').box(5, 38, 13, 1, 1, 2, 'horn');
    // Tail tapering behind, a spade tip.
    g.ellipsoid(0, 9, -28, 7, 5.5, 7, 'scale');
    g.ellipsoid(0, 10, -35, 5, 4, 5, 'scale');
    g.box(-3, 10, -43, 6, 5, 7, 'scale');
    g.cbox(5, 12, -47, 2, 4, 'spike');
    g.cbox(3, 14, -46, 1, 2, 'spike');
    g.cbox(1, 14, -35, 2, 2, 'spike').cbox(1, 15, -40, 1, 2, 'spike');
    // Four strong legs with claws.
    g.box(7, 0, 4, 6, 10, 6, 'scale');
    g.box(7, 4, -21, 7, 9, 7, 'scale');
    g.box(7, 0, -21, 6, 5, 7, 'scale');
    for (const z of [10, -14]) g.box(7, 0, z, 6, 1, 1, 'horn').box(8, 1, z, 1, 1, 1, 'horn').box(11, 1, z, 1, 1, 1, 'horn');
    // Wings spread from the shoulders: bones and a pale membrane.
    for (let i = 0; i < 14; i += 2) {
      const len = 16 - i;
      g.box(12 + i, top + i, -2 - len, 2, 1, len, i === 4 || i === 10 ? 'scaleDark' : 'belly');
      g.box(12 + i, top + i, -2, 2, 2, 2, 'scale');
    }
    g.box(25, top + 13, -4, 2, 3, 2, 'scale');
  },
};

export const tricycle: VehicleModel = {
  id: 'vehicle-tricycle-red',
  ride: { height: 0.625, pose: 'drive' },
  palette: {
    body: '#e05a4f',
    trim: '#ffffff',
    seat: '#3b3446',
    wheel: '#3b3446',
    hub: '#ffd23f',
    light: '#fff6c0',
    rim: '#e8ecf2',
    metal: '#c0c7d2',
    basket: '#c9925e',
    tassel: '#ff7eb6',
  },
  derived: { bodyDark: ['body', 0.8], basketDark: ['basket', 0.78] },
  build(g) {
    const top = 10;
    // Big front wheel with pedals, a mudguard and a fork.
    g.ringX(0, 2, 8, 16, 9.8, 8.6, 'body');
    g.box(0, -2, 4, 2, 10, 24, null);
    wheel(g, { x: 0, w: 2, cy: 8, cz: 16, r: 8, rim: 'rim', hub: 'hub', spokes: true });
    g.box(2, 8, 15, 1, 9, 2, 'body');
    g.box(2, 7, 15, 3, 2, 2, 'metal');
    g.box(4, 3, 14, 1, 5, 2, 'metal');
    g.box(4, 2, 12, 3, 2, 5, 'seat');
    // Head tube, stem back to the handlebar, grips with tassels, a bell and a headlamp.
    g.cbox(1, 17, 14, 7, 2, 'body');
    g.cbox(1, 23, 9, 1, 7, 'body');
    g.cbox(1, top + 11, 8, 2, 2, 'body');
    g.box(0, top + 10, 8, 10, 2, 1, 'body');
    g.box(6, top + 10, 8, 4, 2, 2, 'seat');
    g.box(9, top + 7, 8, 1, 3, 1, 'tassel').box(10, top + 8, 9, 1, 2, 1, 'tassel');
    g.box(3, top + 12, 8, 2, 1, 2, 'hub');
    g.cbox(2, 18, 16, 4, 1, 'trim');
    g.cbox(1, 19, 17, 2, 1, 'light');
    // Low frame from the head tube back to the rear axle (under her legs).
    g.cbox(1, 5, -14, 2, 22, 'body');
    g.cbox(1, 7, 7, 2, 2, 'body').cbox(1, 9, 9, 3, 2, 'body').cbox(1, 12, 11, 4, 2, 'body');
    g.cbox(1, 14, 13, 3, 1, 'body');
    // Saddle with a backrest on a post.
    g.cbox(1, 6, -3, 2, 3, 'metal');
    g.cbox(6, top - 2, -6, 2, 9, 'seat');
    g.cbox(5, top - 1, 2, 1, 1, 'seat');
    g.cbox(6, top, -8, 7, 2, 'seat');
    g.cbox(4, top + 6, -8, 1, 2, 'bodyDark');
    // Rear axle, two spoked wheels, a step plate and a woven basket.
    g.cbox(12, 5, -15, 2, 3, 'metal');
    wheel(g, { x: 10, w: 3, cy: 6, cz: -14, r: 6, rim: 'rim', hub: 'hub', spokes: true });
    g.cbox(9, 7, -20, 1, 12, 'trim');
    g.cbox(8, 8, -21, 8, 9, 'basket');
    g.cbox(6, 9, -19, 7, 5, null);
    for (let y = 9; y < 16; y += 2) g.recolor((_x, yy, z, c) => (c === 'basket' && yy === y && z < -10 ? 'basketDark' : null));
    g.cbox(8, 16, -21, 1, 9, 'basketDark');
    g.box(10, 7, -21, 2, 2, 1, 'body');
    g.box(11, 8, -22, 1, 1, 1, 'light');
  },
};
