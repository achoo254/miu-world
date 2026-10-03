// Emoji props modelled in code (prop-voxels.ts): the basket, books, the open book, framed pictures, the alarm
// clock, the desk globe and the balance scale. Front is +z; a colour variant repaints only the `tinted` keys.
import { paintedBall, type PropModel } from './prop-voxels';

/** A woven basket: an oval bowl widening upward in bands of two browns, a rim, a handle arching over. */
export const basket: PropModel = {
  emoji: 'basket',
  palette: { weave: '#d39a5b', weaveDark: '#b47c41', rim: '#9a6532', inside: '#8a5a33' },
  tinted: [],
  build(g) {
    const top = 9;
    for (let y = 0; y < top; y++) {
      // Widening in steps that fall where the bands change: each band's wall is one flat face a side.
      const band = Math.floor(y / 3);
      const [rx, rz] = [6 + band * 0.75, 4.5 + band * 0.6];
      g.discY(0, 0, rx, rz, y, 1, band % 2 === 0 ? 'weave' : 'weaveDark');
      // Hollow only near the rim: what lies deeper is never seen, and solid it costs no faces.
      if (y >= top - 3) g.discY(0, 0, rx - 1.2, rz - 1.2, y, 1, y === top - 3 ? 'inside' : null);
    }
    g.discY(0, 0, 8.4, 6.4, top, 1, 'rim');
    g.discY(0, 0, 7.2, 5.2, top, 1, null);
    // Handle: a half-ring over the bowl, from rim to rim along x.
    g.sym = false;
    for (let a = 0; a <= 180; a += 6) {
      const t = (a * Math.PI) / 180;
      g.box(Math.round(Math.cos(t) * 7.2) - 1, top + Math.round(Math.sin(t) * 8.5), -1, 2, 1, 2, 'rim');
    }
  },
};

/** Three books standing side by side, spines to the front: covers, pages at the top and back, bands on the spines. */
export const books: PropModel = {
  emoji: 'books',
  palette: { green: '#5cb85c', red: '#e25a6a', blue: '#3d8fe0', page: '#fbf8f0', band: '#f4c430', label: '#fbf8f0' },
  tinted: [],
  build(g) {
    g.sym = false;
    const depth = 18;
    let x = -13;
    for (const [w, h, color] of [[9, 28, 'green'], [8, 24, 'red'], [9, 26, 'blue']] as const) {
      g.box(x, 0, -depth / 2, w, h, depth, color);
      g.box(x + 1, h - 1, -depth / 2, w - 2, 1, depth - 1, 'page');
      g.box(x + 1, 1, -depth / 2, w - 2, h - 2, 1, 'page');
      for (const y of [3, h - 5]) g.box(x, y, depth / 2 - 1, w, 1, 1, 'band');
      g.box(x + 2, Math.round(h / 2) - 2, depth / 2 - 1, w - 4, 4, 1, 'label');
      x += w;
    }
  },
};

/** An open book standing on its lower edge, its two halves spread toward the viewer: blue covers, lined pages. */
export const openBook: PropModel = {
  emoji: 'open-book',
  palette: { cover: '#3d8fe0', page: '#fbf8f0', pageShade: '#e8e2d4', line: '#b9c6d8' },
  tinted: ['cover'],
  build(g) {
    const [height, width, angle] = [26, 15, (24 * Math.PI) / 180];
    for (let t = 0; t <= width; t++) {
      const x = Math.round(t * Math.cos(angle));
      const z = Math.round(t * Math.sin(angle));
      g.box(x, 0, z, 1, height, 1, 'cover');
      if (t >= width) continue;
      g.box(x, 1, z + 1, 1, height - 2, 2, t < 2 ? 'pageShade' : 'page');
      if (t >= 3 && t <= width - 3) for (let y = 6; y < height - 4; y += 3) g.box(x, y, z + 2, 1, 1, 1, 'line');
    }
  },
};

/** A picture in a wooden frame with depth, hung flat on the wall: its canvas is the picture inside the emoji's frame. */
export const framedPicture: PropModel = {
  emoji: 'framed-picture',
  palette: { frame: '#b47c41', frameDark: '#8a5a33', back: '#d8c8a8' },
  tinted: ['frame', 'frameDark'],
  anchor: 'wall',
  build(g, picture) {
    g.cbox(16, 0, 0, 32, 3, 'frame');
    g.cbox(13, 3, 1, 26, 2, null);
    g.cbox(13, 3, 1, 26, 1, 'frameDark');
    g.cbox(12, 4, 1, 24, 2, null);
    g.sym = false;
    for (let x = -12; x < 12; x++) {
      for (let y = 4; y < 28; y++) {
        const color = picture(0.15 + ((x + 12.5) / 24) * 0.7, 0.15 + ((27.5 - y) / 24) * 0.7) ?? 'back';
        g.box(x, y, 0, 1, 1, 1, color);
      }
    }
  },
};

/** A twin-bell alarm clock: round red body on two feet, white face with hands, bells and hammer on top. */
export const alarmClock: PropModel = {
  emoji: 'alarm-clock',
  palette: { body: '#e8414f', bodyDark: '#c22f3d', face: '#fdfaf3', dark: '#3b3446', bell: '#f2c94c', metal: '#9aa3ae', dot: '#e8414f' },
  tinted: ['body', 'bodyDark'],
  build(g) {
    g.box(6, 0, -1, 2, 4, 3, 'metal');
    g.discZ(0, 15, 12, 12, -4, 8, 'body');
    g.discZ(0, 15, 12, 12, -5, 1, 'bodyDark');
    g.discZ(0, 15, 9.5, 9.5, 4, 1, 'face');
    // Hour marks at 12, 3, 6 and 9.
    g.cbox(1, 22, 5, 2, 1, 'dark').cbox(1, 6, 5, 2, 1, 'dark').box(7, 14, 5, 1, 2, 1, 'dark');
    // Bells, the hammer between them and a knob.
    g.ellipsoid(7.5, 27, 0, 4.5, 4, 4.5, 'bell', 26, 2);
    g.box(5, 25, -1, 2, 2, 2, 'metal');
    g.cbox(1, 26, -1, 4, 2, 'metal');
    g.sym = false;
    // Hands (ten past ten) and the centre pin.
    g.box(-1, 15, 5, 1, 6, 1, 'dark');
    g.box(-6, 16, 5, 5, 1, 1, 'dark').box(-7, 17, 5, 2, 1, 1, 'dark');
    g.box(-1, 14, 5, 2, 2, 1, 'dot');
  },
};

/** A desk globe: the Earth painted from the picture, on a half-ring meridian and a round stand. */
export const globe: PropModel = {
  emoji: 'globe-showing-asia-australia',
  palette: { stand: '#8a5a33', brass: '#e2b24a' },
  tinted: [],
  pictureColors: 4,
  build(g, picture) {
    g.discY(0, 0, 5.5, 4.5, 0, 2, 'stand');
    g.cbox(1, 2, -1, 4, 2, 'brass');
    paintedBall(g, picture, [0, 13, 0], 7, '#3d8fe0');
    g.sym = false;
    for (let a = -100; a <= 100; a += 3) {
      const t = (a * Math.PI) / 180;
      g.box(Math.round(Math.cos(t) * 8.5), 13 + Math.round(Math.sin(t) * 8.5), -1, 1, 1, 2, 'brass');
    }
    g.box(-1, 21, -1, 2, 2, 2, 'brass');
  },
};

/** A balance scale: a stepped base, the pillar, the beam and two pans hanging on cords. */
export const balanceScale: PropModel = {
  emoji: 'balance-scale',
  palette: { gold: '#e9b949', goldDark: '#c08a2c', pan: '#f2cd6a', cord: '#c08a2c' },
  tinted: [],
  build(g) {
    g.cbox(7, 0, -5, 2, 10, 'goldDark');
    g.cbox(5, 2, -4, 1, 8, 'gold');
    g.cbox(1, 3, -1, 23, 2, 'gold');
    g.ellipsoid(0, 28, 0, 2.2, 2.2, 2.2, 'gold', -Infinity, 2);
    g.cbox(15, 25, -1, 1, 2, 'gold');
    g.box(14, 24, -1, 1, 1, 2, 'goldDark');
    g.line(13, 24, 0, 10, 12, 0, 'cord').line(13, 24, 0, 16, 12, 0, 'cord');
    g.discY(13, 0, 4.6, 4.6, 10, 1, 'pan');
    g.discY(13, 0, 3.6, 3.6, 11, 1, 'pan');
    g.discY(13, 0, 2.6, 2.6, 11, 1, null);
  },
};

export const HOME_PROPS: readonly PropModel[] = [basket, books, openBook, framedPicture, alarmClock, globe, balanceScale];
