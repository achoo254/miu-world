// Life-size vehicles she drives seated at a wheel: cars, bus, trucks, tractor, train (build-vehicles.ts).
import { type Grid, type VehicleModel, wheel } from './vehicle-voxel-grid';

/** Driver's seat with a headrest; cushion top at `top` (her seat), centred, back at z = back. */
export function seat(g: Grid, top: number, back: number, front: number, hw = 9, color = 'seat', dark = 'seatDark'): void {
  g.cbox(hw, top - 2, back + 2, 2, front - back - 2, color);
  g.cbox(hw - 1, top - 1, front - 1, 1, 1, dark); // front roll of the cushion
  g.cbox(hw + 1, top - 2, back, 13, 2, color); // backrest
  g.box(hw, top - 2, back, 1, 11, 4, dark); // side bolsters
  g.cbox(5, top + 11, back, 4, 2, color); // headrest
  g.cbox(4, top + 11, back - 1, 3, 1, dark);
}

/** A round steering wheel in front of her at z (hands at x ±6…9, y top+8…13), on a column into the dash. */
export function steeringWheel(g: Grid, top: number, z: number, dashZ: number, color = 'steer'): void {
  const cy = top + 11;
  for (let x = 0; x < 9; x++)
    for (let y = cy - 4; y < cy + 4; y++) {
      const dx = (x + 0.5) / 8.6;
      const dy = (y + 0.5 - cy) / 4.4;
      const d = dx * dx + dy * dy;
      if (d <= 1 && d > 0.55) g.box(x, y, z, 1, 1, 1, color);
    }
  g.box(0, cy - 1, z, 7, 1, 1, color); // spoke
  g.cbox(2, cy - 2, z, 3, 1, 'trim'); // horn pad
  if (dashZ > z + 1) g.cbox(1, cy - 1, z + 1, 2, dashZ - z - 1, color); // column
}

/** Headlight with a chrome bezel on the front face at z (pointing +z), lower-left corner x, y (mirrored). */
export function headlight(g: Grid, x: number, y: number, z: number, w = 4, h = 3, bezel = 'chrome'): void {
  g.box(x - 1, y - 1, z, w + 2, h + 2, 1, bezel);
  g.box(x, y, z, w, h, 1, 'light');
  g.box(x + 1, y + 1, z + 1, Math.max(1, w - 2), Math.max(1, h - 2), 1, 'light');
}

/** Windscreen leaning back from (z0, y0): `rows` steps of `step` rows each, chrome frame and pillars. */
export function windscreen(g: Grid, hw: number, y0: number, z0: number, rows: number, step: number, frame = 'chrome'): number {
  for (let i = 0; i < rows; i++) g.cbox(hw, y0 + i * step, z0 - i, step, 1, 'glass');
  const topY = y0 + rows * step;
  g.box(hw - 1, y0 - 1, z0 - rows + 1, 1, topY - y0 + 2, rows, frame);
  g.cbox(hw, topY, z0 - rows, 1, 2, frame);
  g.cbox(hw, y0 - 1, z0, 1, 1, frame);
  return topY;
}

/** Side mirror on a stalk off the windscreen pillar at (x, y, z), glass facing back. */
export function mirror(g: Grid, x: number, y: number, z: number, color = 'body'): void {
  g.box(x, y, z, 2, 1, 1, 'chrome');
  g.box(x + 2, y, z - 1, 2, 3, 2, color);
  g.box(x + 2, y + 1, z - 2, 2, 1, 1, 'glass');
}

const CAR_PALETTE = {
  rim: '#e8ecf2',
  chrome: '#d6dce6',
  signal: '#ffad3b',
  plate: '#fff9e8',
  steer: '#2a2533',
  dash: '#4a4357',
};

export const toyCar: VehicleModel = {
  id: 'vehicle-toy-car-red',
  ride: { height: 0.5625, pose: 'drive' },
  palette: {
    body: '#e05a4f',
    trim: '#ffffff',
    glass: '#bfe8ff',
    light: '#fff6c0',
    rear: '#ff4040',
    grill: '#5c6270',
    seat: '#3b3446',
    wheel: '#3b3446',
    hub: '#c0c7d2',
    ...CAR_PALETTE,
  },
  derived: { bodyDark: ['body', 0.78], bodyLight: ['body', 1.25], seatDark: ['seat', 0.8] },
  build(g) {
    const top = 9; // seat top (ride.height 9/16)
    const hw = 16; // half width of the body
    const front = 27; // front face z (exclusive end)
    const back = -24;
    // Body tub: floor at 3, belt line at 16, rounded front and back corners.
    g.cbox(hw, 3, back, 13, front - back, 'body');
    g.cbox(hw - 1, 16, back + 1, 1, front - back - 2, 'body');
    g.box(hw - 1, 3, front - 1, 1, 13, 1, null).box(hw - 1, 3, back, 1, 13, 1, null);
    g.box(hw - 2, 14, front - 2, 2, 3, 2, null);
    // Hood lower than the belt, sloping to the nose, with a crease.
    g.cbox(hw, 15, 13, 2, front - 13, null);
    g.cbox(hw - 1, 14, 22, 1, front - 22, null);
    g.cbox(hw - 2, 15, 13, 1, 9, 'body');
    g.cbox(1, 15, 14, 1, 11, 'bodyDark');
    // Cockpit: open tub around her, floor mat at y 5.
    g.cbox(12, 6, -13, 11, 23, null);
    g.cbox(12, 5, -13, 1, 23, 'dash');
    // Rear deck behind the seat with a trunk seam.
    g.cbox(hw - 1, 16, -23, 1, 10, 'bodyDark');
    g.cbox(hw - 2, 16, -22, 1, 8, 'body');
    g.cbox(8, 17, -21, 1, 5, 'bodyLight');
    // Wheel arches round the four wheels, then tyres, rims and caps.
    for (const cz of [18, -15]) {
      g.discX(11, 6, 6.5, cz, 8.2, null);
      g.ringX(11, 5, 6.5, cz, 9.2, 8.2, 'bodyDark');
      g.discX(10, 1, 6.5, cz, 8.2, 'dash');
      g.box(11, -3, cz - 10, 5, 6, 20, null);
      wheel(g, { x: 12, w: 5, cy: 6.5, cz, r: 6.5 });
    }
    // Side: sill, door seams, handle, a stripe.
    g.box(hw - 1, 3, -6, 2, 2, 14, 'bodyDark');
    g.box(hw, 6, 10, 1, 10, 1, 'bodyDark').box(hw, 6, -8, 1, 10, 1, 'bodyDark');
    g.box(hw, 14, -6, 1, 1, 3, 'chrome');
    g.box(hw, 10, -7, 1, 1, 17, 'trim');
    // Windscreen up to her chin, mirrors off its pillars.
    windscreen(g, 14, 17, 13, 4, 2);
    mirror(g, 14, 17, 11);
    // Dashboard with dials, steering wheel on a column, seat.
    g.cbox(12, 13, 10, 4, 3, 'dash');
    g.box(3, 15, 9, 3, 2, 1, 'light').box(-1, 15, 9, 1, 1, 1, 'signal');
    steeringWheel(g, top, 8, 10);
    seat(g, top, -13, 3);
    // Front: grille with slats, headlights, indicators, bumper, plate, badge.
    g.cbox(7, 6, front, 6, 1, 'grill');
    for (let y = 7; y < 12; y += 2) g.cbox(6, y, front, 1, 1, 'chrome');
    headlight(g, 9, 10, front - 1);
    g.box(10, 7, front, 3, 1, 1, 'signal');
    g.cbox(hw, 2, front, 3, 2, 'chrome');
    g.cbox(hw - 1, 3, front + 2, 1, 1, 'chrome');
    g.cbox(4, 3, front + 2, 2, 1, 'plate');
    g.cbox(1, 13, front - 1, 1, 1, 'chrome');
    // Back: tail lights, bumper, plate, twin exhausts.
    g.box(9, 11, back - 1, 5, 3, 1, 'rear');
    g.box(10, 12, back - 2, 3, 1, 1, 'rear');
    g.box(6, 11, back - 1, 2, 2, 1, 'signal');
    g.cbox(hw, 2, back - 2, 3, 2, 'chrome');
    g.cbox(4, 3, back - 3, 2, 1, 'plate');
    g.box(7, 2, back - 3, 2, 1, 2, 'grill');
  },
};

export const bus: VehicleModel = {
  id: 'vehicle-bus-yellow',
  ride: { height: 0.5625, pose: 'drive' },
  palette: {
    body: '#ffd23f',
    stripe: '#3b3446',
    glass: '#bfe8ff',
    light: '#fff6c0',
    rear: '#ff4040',
    seat: '#e05a4f',
    trim: '#ffffff',
    grill: '#5c6270',
    wheel: '#3b3446',
    hub: '#c0c7d2',
    ...CAR_PALETTE,
  },
  derived: { bodyDark: ['body', 0.82], seatDark: ['seat', 0.8] },
  build(g) {
    const top = 9;
    const hw = 18;
    const front = 25;
    const back = -46;
    // Lower body the whole length, belt at 21; the hood ahead of her lower.
    g.cbox(hw, 3, back, 18, front - back, 'body');
    g.cbox(hw, 16, 14, 5, front - 14, null);
    g.cbox(hw - 2, 15, 15, 1, front - 16, 'bodyDark');
    g.box(hw - 1, 3, front - 1, 1, 13, 1, null);
    // Driver's well: open around her, floor mat.
    g.cbox(14, 6, -12, 15, 24, null);
    g.cbox(14, 5, -12, 1, 24, 'dash');
    // Passenger saloon behind her: tall box with a white rounded roof.
    g.cbox(hw, 21, back, 14, 33, 'body');
    g.cbox(hw, 35, back, 1, 33, 'trim');
    g.cbox(hw - 1, 36, back + 1, 1, 31, 'trim');
    g.box(hw - 1, 34, back, 1, 2, 1, null).box(hw - 1, 34, -14, 1, 2, 1, null);
    // Side windows with pillars, black school-bus rub rails.
    for (let z = back + 3; z < -16; z += 7) g.box(hw - 1, 24, z, 1, 9, 5, 'glass').box(hw, 24, z + 5, 1, 9, 2, 'body');
    g.box(hw, 23, back, 1, 1, 33, 'bodyDark').box(hw, 33, back, 1, 1, 33, 'bodyDark');
    g.box(hw, 18, back, 1, 1, front - back - 1, 'stripe');
    g.box(hw, 12, back, 1, 1, front - back - 1, 'stripe');
    // Saloon front above her head: wide window and a lit destination sign.
    g.cbox(15, 24, -13, 8, 1, 'glass');
    g.cbox(1, 24, -13, 8, 1, 'body');
    g.cbox(12, 32, -13, 3, 1, 'stripe');
    g.cbox(10, 33, -13, 1, 1, 'light');
    g.box(13, 36, -13, 2, 1, 1, 'signal').box(5, 36, -13, 2, 1, 1, 'signal');
    // Wheels: front under the hood, double rear axle.
    for (const cz of [17, -30, -38]) {
      g.discX(13, 6, 7, cz, 8.4, null);
      g.discX(12, 1, 7, cz, 8.4, 'grill');
      g.box(13, -3, cz - 10, 6, 6, 20, null);
    }
    for (const cz of [17, -30, -38]) wheel(g, { x: 14, w: 5, cy: 7, cz, r: 7, lite: cz < 0 });
    g.ringX(18, 1, 7, 17, 9.4, 8.4, 'bodyDark');
    g.ringX(18, 1, 7, -34, 9.4, 8.4, 'bodyDark');
    // Windscreen, mirrors on long arms, dash and wheel, seat.
    windscreen(g, 15, 16, 13, 4, 2);
    g.box(16, 20, 12, 4, 1, 1, 'chrome');
    g.box(20, 17, 11, 2, 6, 2, 'stripe');
    g.box(20, 18, 10, 2, 4, 1, 'glass');
    g.cbox(14, 12, 10, 4, 3, 'dash');
    g.box(3, 14, 9, 3, 2, 1, 'light');
    steeringWheel(g, top, 8, 10);
    seat(g, top, -12, 3);
    // Front: grille, lights, black bumper, stop flashers.
    g.cbox(8, 5, front, 9, 1, 'grill');
    for (let y = 6; y < 14; y += 2) g.cbox(7, y, front, 1, 1, 'chrome');
    headlight(g, 10, 10, front - 1);
    g.box(11, 6, front, 3, 2, 1, 'signal');
    g.cbox(hw, 2, front, 4, 2, 'stripe');
    g.cbox(4, 3, front + 2, 2, 1, 'plate');
    // Back: emergency door, tail lights, bumper.
    g.cbox(6, 6, back - 1, 29, 1, 'bodyDark');
    g.cbox(5, 7, back - 1, 27, 1, 'body');
    g.cbox(4, 24, back - 1, 9, 1, 'glass');
    g.box(1, 15, back - 2, 3, 1, 1, 'chrome');
    g.box(12, 10, back - 1, 4, 6, 1, 'rear');
    g.box(13, 11, back - 2, 2, 4, 1, 'light');
    g.cbox(hw, 2, back - 2, 4, 2, 'stripe');
    g.box(12, 34, back - 1, 3, 2, 1, 'rear');
  },
};

export const fireTruck: VehicleModel = {
  id: 'vehicle-fire-truck',
  ride: { height: 0.5625, pose: 'drive' },
  palette: {
    body: '#e05a4f',
    trim: '#ffffff',
    glass: '#bfe8ff',
    light: '#fff6c0',
    rear: '#ff4040',
    grill: '#5c6270',
    seat: '#3b3446',
    wheel: '#3b3446',
    hub: '#c0c7d2',
    metal: '#c0c7d2',
    siren: '#5fb0ff',
    siren2: '#ff4040',
    ...CAR_PALETTE,
  },
  derived: { bodyDark: ['body', 0.78], seatDark: ['seat', 0.8], metalDark: ['metal', 0.8] },
  build(g) {
    const top = 9;
    const hw = 18;
    const front = 24;
    const back = -46;
    // Cab-over front: flat nose, belt at 20; she sits in the open cab.
    g.cbox(hw, 3, back, 18, front - back, 'body');
    g.cbox(14, 6, -12, 15, 22, null);
    g.cbox(14, 5, -12, 1, 22, 'dash');
    g.box(hw - 1, 3, front - 1, 1, 18, 1, null);
    g.cbox(hw, 20, back + 1, 1, front - back - 2, 'body');
    // Equipment body behind her: lockers with roll-up shutters, white band, ladder on the roof.
    g.cbox(hw, 21, back, 9, 33, 'body');
    for (let z = back + 2; z < -15; z += 10) {
      g.box(hw - 1, 6, z, 1, 22, 8, 'metal');
      for (let y = 9; y < 28; y += 5) g.box(hw - 1, y, z, 1, 1, 8, 'metalDark');
      g.box(hw, 15, z + 3, 1, 1, 2, 'grill');
    }
    g.box(hw, 28, back, 1, 2, 33, 'trim');
    for (const x of [7, 13]) g.box(x, 30, back - 2, 2, 1, 38, 'metal');
    for (let z = back + 1; z < -9; z += 5) g.box(8, 30, z, 5, 1, 1, 'metal');
    g.box(8, 31, -12, 6, 2, 3, 'metalDark');
    // Hose reel at the back, a water cannon on the roof.
    g.discZ(-0.5, 13, 5, 5, back - 2, 2, 'metal');
    g.discZ(-0.5, 13, 4, 4, back - 3, 1, 'trim');
    g.discZ(-0.5, 13, 1.5, 1.5, back - 4, 1, 'grill');
    g.cbox(2, 30, back + 6, 3, 4, 'metalDark');
    g.cbox(1, 33, back + 7, 1, 8, 'metal');
    // Wheels: front, tandem rear.
    for (const cz of [15, -30, -38]) {
      g.discX(13, 6, 7, cz, 8.4, null);
      g.discX(12, 1, 7, cz, 8.4, 'grill');
      g.box(13, -3, cz - 10, 6, 6, 20, null);
    }
    for (const cz of [15, -30, -38]) wheel(g, { x: 14, w: 5, cy: 7, cz, r: 7, lite: cz < 0 });
    g.archX(18, 1, 7, 15, 9.4, 8.4, 'trim');
    // Windscreen with a light bar of sirens across its top, mirrors.
    const y = windscreen(g, 15, 21, 14, 3, 2);
    g.cbox(13, y + 1, 10, 1, 3, 'grill');
    g.box(1, y + 2, 10, 5, 2, 3, 'siren2').box(6, y + 2, 10, 5, 2, 3, 'siren');
    g.box(11, y + 2, 10, 2, 2, 3, 'siren2');
    g.box(16, 22, 12, 4, 1, 1, 'chrome');
    g.box(20, 19, 11, 2, 6, 2, 'grill');
    g.box(20, 20, 10, 2, 4, 1, 'glass');
    g.cbox(14, 16, 10, 4, 4, 'dash');
    g.box(3, 18, 9, 3, 2, 1, 'light');
    steeringWheel(g, top, 8, 10);
    seat(g, top, -12, 3);
    // Front: grille, headlights, white band, bumper, beacons, plate.
    g.cbox(9, 6, front, 9, 1, 'grill');
    for (let yy = 7; yy < 15; yy += 2) g.cbox(8, yy, front, 1, 1, 'chrome');
    headlight(g, 11, 11, front - 1);
    g.box(11, 6, front, 4, 2, 1, 'signal');
    g.cbox(hw, 16, front - 1, 2, 1, 'trim');
    g.cbox(hw, 2, front, 4, 3, 'chrome');
    g.cbox(4, 3, front + 3, 2, 1, 'plate');
    g.box(16, 18, front, 2, 2, 1, 'siren2');
    // Back: lights, bumper step.
    g.box(13, 8, back - 1, 4, 6, 1, 'rear');
    g.box(14, 9, back - 2, 2, 2, 1, 'light');
    g.cbox(hw, 2, back - 2, 4, 2, 'metal');
    g.cbox(10, 5, back - 3, 1, 3, 'metalDark');
  },
};

export const iceCream: VehicleModel = {
  id: 'vehicle-ice-cream-strawberry',
  ride: { height: 0.5625, pose: 'drive' },
  palette: {
    body: '#ff9eb5',
    stripe: '#ffffff',
    cone: '#e0a560',
    scoop: '#ff7eb6',
    cherry: '#e05a4f',
    metal: '#c0c7d2',
    deck: '#5c6270',
    wheel: '#3b3446',
    hub: '#ffd23f',
    seat: '#ffffff',
    glass: '#bfe8ff',
    light: '#fff6c0',
    sprinkle: '#5fe0ff',
    sprinkle2: '#ffd23f',
    trim: '#ffffff',
    ...CAR_PALETTE,
  },
  derived: { bodyDark: ['body', 0.82], coneDark: ['cone', 0.8], scoopLight: ['scoop', 1.3], seatDark: ['seat', 0.85] },
  build(g) {
    const top = 9;
    const hw = 17;
    const front = 25;
    const back = -42;
    // Van: low nose and open driver's seat, tall shop behind her.
    g.cbox(hw, 3, back, 13, front - back, 'body');
    g.box(hw - 1, 3, front - 1, 1, 13, 1, null);
    g.cbox(hw - 1, 16, 14, 1, 10, 'body');
    g.cbox(13, 6, -12, 11, 23, null);
    g.cbox(13, 5, -12, 1, 23, 'deck');
    g.cbox(hw, 16, back, 15, 30, 'body');
    g.cbox(hw, 31, back, 1, 30, 'stripe');
    g.cbox(hw - 1, 32, back + 1, 1, 28, 'stripe');
    // Scalloped awning and a serving hatch with a counter on each side.
    for (let z = back; z < -12; z += 2) g.box(hw, 27, z, 1, 3, 1, 'stripe').box(hw, 26, z, 1, 1, 1, 'stripe');
    g.box(hw - 1, 18, back + 6, 1, 8, 16, 'deck');
    g.box(hw - 2, 19, back + 7, 1, 6, 14, 'scoop');
    g.box(hw, 17, back + 5, 2, 1, 18, 'metal');
    // Cone sign on the side.
    g.box(hw, 7, back + 9, 1, 2, 2, 'cone').box(hw, 9, back + 8, 1, 2, 4, 'cone');
    g.box(hw, 11, back + 7, 1, 3, 6, 'scoop');
    // The giant cone on the roof: waffle cone, two scoops, sprinkles, a cherry.
    g.discY(0, -28, 2.5, 2.5, 33, 2, 'cone');
    g.discY(0, -28, 4, 4, 35, 3, 'cone');
    g.discY(0, -28, 4, 4, 36, 1, 'coneDark');
    g.ellipsoid(0, 40, -28, 5.5, 3.5, 5.5, 'scoop');
    g.ellipsoid(0, 44, -28, 4.2, 2.8, 4.2, 'scoopLight');
    g.box(2, 41, -23, 1, 1, 1, 'sprinkle').box(4, 42, -26, 1, 1, 1, 'sprinkle2').box(1, 44, -25, 1, 1, 1, 'sprinkle');
    g.cbox(1, 46, -29, 2, 2, 'cherry');
    g.box(0, 48, -29, 1, 2, 1, 'deck');
    // Wheels.
    for (const cz of [17, -32]) {
      g.discX(12, 6, 6.5, cz, 8.2, null);
      g.discX(11, 1, 6.5, cz, 8.2, 'deck');
      g.box(12, -3, cz - 10, 6, 6, 20, null);
      g.archX(16, 1, 6.5, cz, 9.2, 8.2, 'stripe');
      wheel(g, { x: 13, w: 5, cy: 6.5, cz, r: 6.5 });
    }
    // Windscreen, mirrors, dash, wheel, seat.
    windscreen(g, 15, 17, 13, 4, 2);
    mirror(g, 15, 17, 11);
    g.cbox(13, 13, 10, 4, 3, 'deck');
    g.box(3, 15, 9, 3, 2, 1, 'light');
    steeringWheel(g, top, 8, 10);
    seat(g, top, -12, 3);
    // Front: bumper, lights, a smile of a grille, plate. Back: lights, bumper, a menu board.
    g.cbox(6, 7, front, 2, 1, 'deck');
    g.cbox(4, 6, front, 1, 1, 'deck');
    headlight(g, 9, 10, front - 1);
    g.cbox(hw, 2, front, 3, 2, 'metal');
    g.cbox(4, 3, front + 2, 2, 1, 'plate');
    g.box(10, 8, back - 1, 4, 4, 1, 'cherry');
    g.cbox(hw, 2, back - 2, 3, 2, 'metal');
    g.cbox(7, 15, back - 1, 12, 1, 'stripe');
    for (let yy = 17; yy < 26; yy += 3) g.cbox(5, yy, back - 1, 1, 1, 'deck');
  },
};

export const tractor: VehicleModel = {
  id: 'vehicle-tractor-red',
  ride: { height: 0.875, pose: 'drive' },
  palette: {
    body: '#e05a4f',
    dark: '#3b3446',
    metal: '#c0c7d2',
    light: '#fff6c0',
    seat: '#5c6270',
    wheel: '#3b3446',
    hub: '#ffd23f',
    rim: '#ffd23f',
    chrome: '#d6dce6',
    steer: '#2a2533',
    trim: '#ffffff',
  },
  derived: { bodyDark: ['body', 0.78], seatDark: ['seat', 0.8], hubDark: ['hub', 0.8] },
  build(g) {
    const top = 14;
    // Chassis rail from the hitch to the front weights.
    g.cbox(5, 5, -22, 4, 50, 'dark');
    // Engine hood ahead of her, narrow, with louvres, a grille and headlights.
    g.cbox(8, 9, 9, 11, 19, 'body');
    g.cbox(7, 20, 10, 1, 17, 'body');
    g.box(8, 11, 12, 1, 6, 12, 'bodyDark');
    for (let z = 13; z < 23; z += 2) g.box(8, 12, z, 1, 4, 1, 'dark');
    g.cbox(6, 10, 28, 9, 1, 'dark');
    for (let y = 11; y < 19; y += 2) g.cbox(5, y, 28, 1, 1, 'metal');
    headlight(g, 6, 15, 27, 3, 3, 'dark');
    g.cbox(7, 4, 28, 5, 3, 'dark'); // front weights
    for (let y = 4; y < 9; y += 2) g.cbox(7, y, 31, 1, 1, 'bodyDark');
    // Exhaust stack and air intake on the hood (one side each).
    g.sym = false;
    g.box(4, 21, 20, 2, 10, 2, 'dark').box(3, 30, 19, 4, 2, 4, 'dark');
    g.box(-6, 21, 22, 2, 5, 2, 'metal').box(-7, 25, 21, 4, 2, 4, 'metal');
    g.sym = true;
    // Big rear wheels with lugged treads under arched fenders; small front wheels.
    g.ringX(12, 8, 10.5, -10, 12.8, 11.3, 'body');
    g.box(12, -3, -24, 8, 14, 28, null);
    g.box(13, 11, -10, 6, 1, 1, 'light');
    wheel(g, { x: 13, w: 6, cy: 10.5, cz: -10, r: 10.5 });
    for (let a = 0; a < 20; a++) {
      const t = (a / 20) * Math.PI * 2;
      g.box(13, Math.round(10 + Math.sin(t) * 10.4), Math.round(-10.5 + Math.cos(t) * 10.4), 6, 1, 1, a % 2 ? 'wheel' : 'dark');
    }
    g.box(9, 6, -11, 4, 3, 3, 'dark'); // rear axle
    g.ringX(9, 4, 5.5, 21, 7.4, 6.5, 'body');
    g.box(9, -3, 13, 4, 9, 16, null);
    wheel(g, { x: 9, w: 4, cy: 5.5, cz: 21, r: 5.5 });
    g.box(7, 5, 20, 2, 2, 2, 'dark');
    // Platform, seat on a post, steering wheel on a column out of the hood.
    g.cbox(12, 9, -22, 2, 14, 'dark');
    g.cbox(11, 11, -22, 1, 14, 'metal');
    g.cbox(2, 8, -6, top - 10, 4, 'dark');
    seat(g, top, -10, 3, 8);
    steeringWheel(g, top, 8, 10);
    g.cbox(1, top + 9, 9, 2, 2, 'steer');
    // Hitch and a tool box at the back.
    g.cbox(2, 6, -26, 2, 4, 'metal');
    g.box(0, 6, -28, 1, 2, 2, 'dark');
    g.cbox(6, 12, -21, 5, 6, 'body');
    g.cbox(6, 16, -21, 1, 6, 'bodyDark');
    g.box(8, 14, -12, 3, 2, 1, 'trim');
  },
};

export const train: VehicleModel = {
  id: 'vehicle-train-red',
  ride: { height: 0.625, pose: 'drive' },
  palette: {
    body: '#e05a4f',
    boiler: '#3b3446',
    trim: '#ffd23f',
    glass: '#bfe8ff',
    light: '#fff6c0',
    wheel: '#3b3446',
    hub: '#e05a4f',
    rim: '#c0c7d2',
    metal: '#c0c7d2',
    steer: '#2a2533',
    seat: '#8a5a20',
    smoke: '#f2f4f8',
  },
  derived: { bodyDark: ['body', 0.78], seatDark: ['seat', 0.8], boilerLight: ['boiler', 1.35] },
  build(g) {
    const top = 10;
    // Frame between the wheels, running board over them with a red valance.
    g.cbox(10, 3, -20, 6, 56, 'boiler');
    g.cbox(16, 11, -20, 1, 56, 'boiler');
    g.box(15, 10, -20, 1, 1, 56, 'body');
    // Cab round her: sides with window openings, low front wall, no roof (the camera looks in).
    g.cbox(14, 12, -20, 13, 30, 'body');
    g.cbox(11, 8, -18, 18, 27, null);
    g.cbox(11, 7, -18, 1, 27, 'seatDark');
    g.box(11, 16, -14, 4, 8, 14, null);
    g.box(13, 16, -15, 1, 9, 1, 'trim').box(13, 16, 0, 1, 9, 1, 'trim');
    g.box(13, 24, -15, 1, 1, 16, 'trim');
    g.cbox(14, 25, -20, 1, 30, 'trim');
    g.cbox(11, 25, -18, 1, 27, null);
    g.box(14, 13, -19, 1, 2, 28, 'bodyDark');
    g.cbox(6, 15, -21, 9, 1, 'bodyDark');
    g.box(9, 13, -21, 3, 2, 1, 'light');
    // Boiler ahead of her: a black drum with gold bands, a dome, a smokestack with a puff.
    g.discZ(0, 18, 8, 8, 10, 19, 'boiler');
    for (const z of [12, 19, 26]) g.discZ(0, 18, 8.4, 8.4, z, 1, 'trim');
    g.discZ(0, 18, 6.5, 6.5, 29, 1, 'boilerLight');
    g.discZ(0, 18, 3.4, 3.4, 29, 2, 'trim');
    g.discZ(0, 18, 2.4, 2.4, 30, 1, 'light');
    g.discY(0, 17.5, 3, 3, 25, 4, 'trim');
    g.discY(0, 17.5, 2, 2, 29, 1, 'trim');
    g.discY(0, 24.5, 2.4, 2.4, 25, 6, 'boiler');
    g.discY(0, 24.5, 3.6, 3.6, 31, 3, 'boiler');
    g.discY(0, 24.5, 4, 4, 33, 1, 'trim');
    g.ellipsoid(0, 38, 23, 4, 2.5, 4, 'smoke');
    g.ellipsoid(-1, 42, 20, 3, 2, 3, 'smoke');
    // Buffer beam with buffers, cowcatcher slats.
    g.cbox(14, 7, 28, 4, 2, 'body');
    g.box(9, 8, 30, 3, 2, 1, 'metal');
    for (let i = 0; i < 4; i++) g.cbox(12 - i * 2, 6 - i * 2, 30 + i, 2, 1, 'trim');
    for (let x = 0; x < 12; x += 3) g.box(x, 0, 30, 1, 7, 1, 'metal');
    // Driving wheels joined by a side rod; a small leading wheel.
    for (const cz of [-10, 2, 14]) wheel(g, { x: 11, w: 4, cy: 5.5, cz, r: 5.5 });
    g.box(15, 5, -10, 1, 1, 25, 'metal');
    wheel(g, { x: 9, w: 3, cy: 3.5, cz: 24, r: 3.5 });
    // Throttle wheel, a bench seat, a bell on the boiler and a coal bunker behind.
    g.cbox(11, 8, 8, 9, 2, 'boiler');
    steeringWheel(g, top, 8, 10, 'steer');
    seat(g, top, -16, 3, 9);
    g.cbox(1, 27, 12, 2, 1, 'trim');
    g.cbox(2, 26, 11, 1, 3, 'trim');
    g.cbox(9, 25, -20, 2, 4, 'boiler');
  },
};
