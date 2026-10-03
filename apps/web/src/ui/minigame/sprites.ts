// Pictures minigames may draw: Fluent Emoji 3D (MIT) files from the asset manifest, by name or by the emoji
// itself (`emoji('🥚')` is `'egg'`). The build ships exactly these files (vite.config.ts), so a game can
// only show what is licensed and listed. Plain data on purpose: vite.config imports it.
// A picture that is missing: add its Fluent Emoji file to tools/assets/sources.json (`minigame/<name>.png`),
// run `pnpm assets:fetch` and `pnpm assets:manifest`, then add a line here (docs/minigames.md).

const FLUENT = 'packs/fluent-emoji/1ffb34c752ec';

/** Files already in the pack for the UI icons and the map props, reused rather than fetched again. */
const REUSED = {
  basket: ['🧺', `${FLUENT}/icons/basket.png`],
  rock: ['🪨', `${FLUENT}/icons/rock.png`],
  star: ['⭐', `${FLUENT}/icons/star.png`],
  'glowing-star': ['🌟', `${FLUENT}/icons/glowing-star.png`],
  coin: ['🪙', `${FLUENT}/icons/coin.png`],
  heart: ['❤️', `${FLUENT}/icons/heart.png`],
  crown: ['👑', `${FLUENT}/icons/crown.png`],
  trophy: ['🏆', `${FLUENT}/icons/trophy.png`],
  fire: ['🔥', `${FLUENT}/icons/fire.png`],
  'red-apple': ['🍎', `${FLUENT}/icons/red-apple.png`],
  mushroom: ['🍄', `${FLUENT}/icons/mushroom.png`],
  gift: ['🎁', `${FLUENT}/icons/gift.png`],
  leaf: ['🍃', `${FLUENT}/icons/leaf.png`],
  'deciduous-tree': ['🌳', `${FLUENT}/icons/tree.png`],
  clover: ['🍀', `${FLUENT}/icons/clover.png`],
  sparkles: ['✨', `${FLUENT}/icons/sparkles.png`],
  gem: ['💎', `${FLUENT}/icons/gem.png`],
  bell: ['🔔', `${FLUENT}/icons/bell.png`],
  'light-bulb': ['💡', `${FLUENT}/icons/light-bulb.png`],
  key: ['🔑', `${FLUENT}/icons/key.png`],
  candy: ['🍬', `${FLUENT}/icons/candy.png`],
  'running-shoe': ['👟', `${FLUENT}/icons/running-shoe.png`],
  parrot: ['🦜', `${FLUENT}/icons/parrot.png`],
  beaver: ['🦫', `${FLUENT}/icons/beaver.png`],
  kangaroo: ['🦘', `${FLUENT}/icons/kangaroo.png`],
  'cat-face': ['🐱', `${FLUENT}/icons/cat-face.png`],
  envelope: ['✉️', `${FLUENT}/icons/envelope.png`],
  package: ['📦', `${FLUENT}/icons/package.png`],
  house: ['🏠', `${FLUENT}/icons/house.png`],
  'soccer-ball': ['⚽', `${FLUENT}/props/soccer-ball.png`],
  basketball: ['🏀', `${FLUENT}/props/basketball.png`],
  volleyball: ['🏐', `${FLUENT}/props/volleyball.png`],
  badminton: ['🏸', `${FLUENT}/props/badminton.png`],
  balloon: ['🎈', `${FLUENT}/props/balloon.png`],
  kite: ['🪁', `${FLUENT}/props/kite.png`],
  cherries: ['🍒', `${FLUENT}/props/cherries.png`],
  'tropical-fish': ['🐠', `${FLUENT}/props/tropical-fish.png`],
  'birthday-cake': ['🎂', `${FLUENT}/props/birthday-cake.png`],
  'teddy-bear': ['🧸', `${FLUENT}/props/teddy-bear.png`],
  sailboat: ['⛵', `${FLUENT}/props/sailboat.png`],
  automobile: ['🚗', `${FLUENT}/props/automobile.png`],
  bus: ['🚌', `${FLUENT}/props/bus.png`],
  airplane: ['✈️', `${FLUENT}/props/airplane.png`],
  'puzzle-piece': ['🧩', `${FLUENT}/props/puzzle-piece.png`],
  seedling: ['🌱', `${FLUENT}/props/seedling.png`],
  herb: ['🌿', `${FLUENT}/props/herb.png`],
  'spiral-shell': ['🐚', `${FLUENT}/props/spiral-shell.png`],
  'paw-prints': ['🐾', `${FLUENT}/props/paw-prints.png`],
  droplet: ['💧', `${FLUENT}/props/droplet.png`],
  feather: ['🪶', `${FLUENT}/props/feather.png`],
  skateboard: ['🛹', `${FLUENT}/props/skateboard.png`],
  'fallen-leaf': ['🍂', `${FLUENT}/props/fallen-leaf.png`],
  lotus: ['🪷', `${FLUENT}/props/lotus.png`],
  '1st-place-medal': ['🥇', `${FLUENT}/props/1st-place-medal.png`],
  toothbrush: ['🪥', `${FLUENT}/props/toothbrush.png`],
  'leafy-green': ['🥬', `${FLUENT}/props/leafy-green.png`],
} as const;

/** Fetched for the minigames (`minigame/<name>.png` in tools/assets/sources.json). */
const FETCHED = {
  egg: '🥚',
  'hatching-chick': '🐣',
  'baby-chick': '🐤',
  chicken: '🐔',
  'goal-net': '🥅',
  gloves: '🧤',
  cat: '🐈',
  rabbit: '🐇',
  fox: '🦊',
  bear: '🐻',
  'dog-face': '🐶',
  panda: '🐼',
  'monkey-face': '🐵',
  frog: '🐸',
  turtle: '🐢',
  duck: '🦆',
  bird: '🐦',
  owl: '🦉',
  penguin: '🐧',
  honeybee: '🐝',
  butterfly: '🦋',
  snail: '🐌',
  fish: '🐟',
  dolphin: '🐬',
  crab: '🦀',
  octopus: '🐙',
  cloud: '☁️',
  sun: '☀️',
  rainbow: '🌈',
  snowflake: '❄️',
  'high-voltage': '⚡',
  collision: '💥',
  wood: '🪵',
  cactus: '🌵',
  'evergreen-tree': '🌲',
  banana: '🍌',
  carrot: '🥕',
  strawberry: '🍓',
  watermelon: '🍉',
  grapes: '🍇',
  lemon: '🍋',
  pineapple: '🍍',
  cookie: '🍪',
  lollipop: '🍭',
  doughnut: '🍩',
  'ice-cream': '🍨',
  bubbles: '🫧',
  bullseye: '🎯',
  rocket: '🚀',
  bicycle: '🚲',
  'musical-note': '🎵',
  drum: '🥁',
  'party-popper': '🎉',
  stopwatch: '⏱️',
  magnet: '🧲',
  'flying-disc': '🥏',
  baseball: '⚾',
  tennis: '🎾',
  sunflower: '🌻',
  tulip: '🌷',
  'maple-leaf': '🍁',
  hole: '🕳️',
  monkey: '🐒',
  'palm-tree': '🌴',
  'fire-engine': '🚒',
  firefighter: '🧑‍🚒',
  chestnut: '🌰',
  coconut: '🥥',
  snowman: '⛄',
  flashlight: '🔦',
  jar: '🫙',
  wastebasket: '🗑️',
  newspaper: '📰',
  'recycling-symbol': '♻️',
  'canned-food': '🥫',
  'beverage-box': '🧃',
  'roll-of-paper': '🧻',
  ghost: '👻',
  sled: '🛷',
  unicorn: '🦄',
  tomato: '🍅',
  'ear-of-corn': '🌽',
  cow: '🐄',
  bucket: '🪣',
  'glass-of-milk': '🥛',
  canoe: '🛶',
  'cooked-rice': '🍚',
  beans: '🫘',
  'cut-of-meat': '🥩',
  'cloud-with-lightning': '🌩️',
  'mouse-face': '🐭',
  'dragon-face': '🐲',
  'red-paper-lantern': '🏮',
  'water-pistol': '🔫',
  'curling-stone': '🥌',
  'bow-and-arrow': '🏹',
  'baguette-bread': '🥖',
  cucumber: '🥒',
  'hot-pepper': '🌶️',
  goat: '🐐',
  'moon-cake': '🥮',
  'full-moon': '🌕',
  farmer: '🧑‍🌾',
  'sheaf-of-rice': '🌾',
  'desert-island': '🏝️',
} as const;

type Reused = keyof typeof REUSED;
type Fetched = keyof typeof FETCHED;
export type SpriteName = Reused | Fetched;
export type SpriteEmoji = (typeof REUSED)[Reused][0] | (typeof FETCHED)[Fetched];
/** A picture by name (`'egg'`) or by its emoji (`'🥚'`). */
export type SpriteRef = SpriteName | SpriteEmoji;

/** Name → manifest path of every minigame picture. */
export const SPRITE_PATHS: Readonly<Record<SpriteName, string>> = {
  ...(Object.fromEntries(Object.entries(REUSED).map(([name, [, path]]) => [name, path])) as Record<Reused, string>),
  ...(Object.fromEntries(Object.keys(FETCHED).map((name) => [name, `${FLUENT}/minigame/${name}.png`])) as Record<Fetched, string>),
};

/** Emoji without its presentation selector, so '☁️' and '☁' name the same picture. */
const bare = (emoji: string): string => emoji.replace(/️/g, '');

const BY_EMOJI: ReadonlyMap<string, SpriteName> = new Map([
  ...Object.entries(REUSED).map(([name, [emoji]]): [string, SpriteName] => [bare(emoji), name as Reused]),
  ...Object.entries(FETCHED).map(([name, emoji]): [string, SpriteName] => [bare(emoji), name as Fetched]),
]);

const isName = (ref: string): ref is SpriteName => ref in SPRITE_PATHS;

/** The picture's name for a name or an emoji; null when no file draws it. */
export function spriteName(ref: string): SpriteName | null {
  return isName(ref) ? ref : (BY_EMOJI.get(bare(ref)) ?? null);
}

/** `emoji('🥚')` → `'egg'`: write the picture you mean; the type only accepts emoji that have a file. */
export function emoji(char: SpriteEmoji): SpriteName {
  const name = spriteName(char);
  if (!name) throw new Error(`no minigame picture for ${char}`);
  return name;
}

/** Every minigame picture, for the build to ship. */
export const MINIGAME_SPRITE_PATHS: readonly string[] = [...new Set(Object.values(SPRITE_PATHS))];

/** Loaded pictures as `draw` sees them (sprite-sheet.ts loads them in the browser). */
export interface Sprites {
  /**
   * Draws a picture centred on (x, y), `size` units across its longer side. Options: rotation in radians,
   * opacity, mirror, and a squash (x stretch, y stretch) for bouncy landings.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    ref: SpriteRef,
    x: number,
    y: number,
    size: number,
    options?: { rotate?: number; alpha?: number; flipX?: boolean; squash?: readonly [number, number] },
  ): void;
}
