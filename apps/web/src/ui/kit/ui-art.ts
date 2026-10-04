// Every repo asset the React UI shows, as manifest paths. The build copies exactly these (plus the
// runtime set) into dist/, so a path that leaves the manifest fails the build instead of a 404.
// Plain data on purpose: vite.config imports it.
import characters from '../../../../../content/characters.json';
import pets from '../../../../../content/pets.json';
import regions from '../../../../../content/world/regions.json';
import type { Pet } from '../../../../../packages/schema/src/pet';
import { petArtPath } from '../../../../../packages/schema/src/pet-art';
import { REGION_CHEST_ICON, regionBackdropPath } from '../../../../../packages/schema/src/region-art';
import { UI_ASSET_VERSIONS, versioned } from '../../asset-versions';

const FLUENT = 'packs/fluent-emoji/1ffb34c752ec/icons';
const FLUENT_MINI = 'packs/fluent-emoji/1ffb34c752ec/minigame';
const FLUENT_PROPS = 'packs/fluent-emoji/1ffb34c752ec/props';

/** Fluent Emoji 3D (MIT), the icon set chosen in docs/design-guidelines.md. */
export const UI_ICONS = {
  antennaBars: `${FLUENT}/antenna-bars.png`,
  /** The HUD's ride toggle: from the emoji props (the same Fluent set). */
  automobile: `${FLUENT_PROPS}/automobile.png`,
  backpack: `${FLUENT}/backpack.png`,
  balloon: `${FLUENT_PROPS}/balloon.png`,
  banana: `${FLUENT_MINI}/banana.png`,
  bat: `${FLUENT_MINI}/bat.png`,
  bear: `${FLUENT_MINI}/bear.png`,
  beaver: `${FLUENT}/beaver.png`,
  bird: `${FLUENT_MINI}/bird.png`,
  books: `${FLUENT}/books.png`,
  bowlWithSpoon: `${FLUENT_MINI}/bowl-with-spoon.png`,
  candy: `${FLUENT}/candy.png`,
  carrot: `${FLUENT_MINI}/carrot.png`,
  catFace: `${FLUENT}/cat-face.png`,
  checkMark: `${FLUENT}/check-mark.png`,
  chestnut: `${FLUENT_MINI}/chestnut.png`,
  chicken: `${FLUENT_MINI}/chicken.png`,
  clover: `${FLUENT}/clover.png`,
  coconut: `${FLUENT_MINI}/coconut.png`,
  coin: `${FLUENT}/coin.png`,
  cookie: `${FLUENT_MINI}/cookie.png`,
  cow: `${FLUENT_MINI}/cow.png`,
  crab: `${FLUENT_MINI}/crab.png`,
  crayon: `${FLUENT_PROPS}/crayon.png`,
  crown: `${FLUENT}/crown.png`,
  dog: `${FLUENT_MINI}/dog.png`,
  doughnut: `${FLUENT_MINI}/doughnut.png`,
  drum: `${FLUENT_MINI}/drum.png`,
  earOfCorn: `${FLUENT_MINI}/ear-of-corn.png`,
  egg: `${FLUENT_MINI}/egg.png`,
  fan: `${FLUENT_PROPS}/folding-hand-fan.png`,
  farmer: `${FLUENT_MINI}/farmer.png`,
  firstMedal: `${FLUENT_PROPS}/1st-place-medal.png`,
  flute: `${FLUENT_PROPS}/flute.png`,
  fountainPen: `${FLUENT_PROPS}/fountain-pen.png`,
  fox: `${FLUENT_MINI}/fox.png`,
  framedPicture: `${FLUENT_PROPS}/framed-picture.png`,
  gear: `${FLUENT}/gear.png`,
  gemStone: `${FLUENT_PROPS}/gem-stone.png`,
  gift: `${FLUENT}/gift.png`,
  glassOfMilk: `${FLUENT_MINI}/glass-of-milk.png`,
  glowingStar: `${FLUENT}/glowing-star.png`,
  grapes: `${FLUENT_MINI}/grapes.png`,
  heart: `${FLUENT}/heart.png`,
  honeybee: `${FLUENT_MINI}/honeybee.png`,
  kangaroo: `${FLUENT}/kangaroo.png`,
  house: `${FLUENT}/house.png`,
  iceCream: `${FLUENT_MINI}/ice-cream.png`,
  key: `${FLUENT}/key.png`,
  kite: `${FLUENT_PROPS}/kite.png`,
  lantern: `${FLUENT_MINI}/red-paper-lantern.png`,
  leaf: `${FLUENT}/leaf.png`,
  locked: `${FLUENT}/locked.png`,
  lotus: `${FLUENT_PROPS}/lotus.png`,
  magnifyingGlass: `${FLUENT_PROPS}/magnifying-glass-tilted-left.png`,
  map: `${FLUENT}/map.png`,
  mapleLeaf: `${FLUENT_MINI}/maple-leaf.png`,
  monkey: `${FLUENT_MINI}/monkey.png`,
  nestingDolls: `${FLUENT_PROPS}/nesting-dolls.png`,
  oldKey: `${FLUENT_PROPS}/old-key.png`,
  palette: `${FLUENT_PROPS}/artist-palette.png`,
  panda: `${FLUENT_MINI}/panda.png`,
  parrot: `${FLUENT}/parrot.png`,
  package: `${FLUENT}/package.png`,
  pause: `${FLUENT}/pause.png`,
  penguin: `${FLUENT_MINI}/penguin.png`,
  pig: `${FLUENT_MINI}/pig.png`,
  pottedPlant: `${FLUENT_PROPS}/potted-plant.png`,
  rabbit: `${FLUENT_MINI}/rabbit.png`,
  redApple: `${FLUENT}/red-apple.png`,
  ribbon: `${FLUENT_PROPS}/ribbon.png`,
  robot: `${FLUENT_MINI}/robot.png`,
  rock: `${FLUENT}/rock.png`,
  ringBuoy: `${FLUENT}/ring-buoy.png`,
  runningShoe: `${FLUENT}/running-shoe.png`,
  basket: `${FLUENT}/basket.png`,
  scroll: `${FLUENT}/scroll.png`,
  seal: `${FLUENT_MINI}/seal.png`,
  sheafOfRice: `${FLUENT_MINI}/sheaf-of-rice.png`,
  snail: `${FLUENT_MINI}/snail.png`,
  snowflake: `${FLUENT_MINI}/snowflake.png`,
  snowman: `${FLUENT_MINI}/snowman.png`,
  sparkles: `${FLUENT}/sparkles.png`,
  speaker: `${FLUENT}/speaker.png`,
  speakerMuted: `${FLUENT}/speaker-muted.png`,
  spiralShell: `${FLUENT_PROPS}/spiral-shell.png`,
  star: `${FLUENT}/star.png`,
  straightRuler: `${FLUENT_PROPS}/straight-ruler.png`,
  strawberry: `${FLUENT_MINI}/strawberry.png`,
  sunflower: `${FLUENT_MINI}/sunflower.png`,
  teddyBear: `${FLUENT_PROPS}/teddy-bear.png`,
  tree: `${FLUENT}/tree.png`,
  trophy: `${FLUENT}/trophy.png`,
  unlocked: `${FLUENT}/unlocked.png`,
  watermelon: `${FLUENT_MINI}/watermelon.png`,
  windChime: `${FLUENT_PROPS}/wind-chime.png`,
  // Collectibles' pictures (content/items, the sets in content/collectibles.json).
  abacus: `${FLUENT_PROPS}/abacus.png`,
  admissionTickets: `${FLUENT_PROPS}/admission-tickets.png`,
  airplane: `${FLUENT_PROPS}/airplane.png`,
  baguetteBread: `${FLUENT_MINI}/baguette-bread.png`,
  basketball: `${FLUENT_PROPS}/basketball.png`,
  bell: `${FLUENT}/bell.png`,
  bicycle: `${FLUENT_MINI}/bicycle.png`,
  bookmarkTabs: `${FLUENT_PROPS}/bookmark-tabs.png`,
  bucket: `${FLUENT_MINI}/bucket.png`,
  bus: `${FLUENT_PROPS}/bus.png`,
  butterfly: `${FLUENT_MINI}/butterfly.png`,
  candle: `${FLUENT_MINI}/candle.png`,
  cardIndex: `${FLUENT_PROPS}/card-index.png`,
  dragonFace: `${FLUENT_MINI}/dragon-face.png`,
  envelope: `${FLUENT}/envelope.png`,
  evergreenTree: `${FLUENT_MINI}/evergreen-tree.png`,
  feather: `${FLUENT_PROPS}/feather.png`,
  fish: `${FLUENT_MINI}/fish.png`,
  frog: `${FLUENT_MINI}/frog.png`,
  glasses: `${FLUENT_PROPS}/glasses.png`,
  gloves: `${FLUENT_MINI}/gloves.png`,
  herb: `${FLUENT_PROPS}/herb.png`,
  jar: `${FLUENT_MINI}/jar.png`,
  jellyfish: `${FLUENT_MINI}/jellyfish.png`,
  knot: `${FLUENT_PROPS}/knot.png`,
  lightBulb: `${FLUENT}/light-bulb.png`,
  lollipop: `${FLUENT_MINI}/lollipop.png`,
  mantelpieceClock: `${FLUENT_PROPS}/mantelpiece-clock.png`,
  mirror: `${FLUENT_PROPS}/mirror.png`,
  moonCake: `${FLUENT_MINI}/moon-cake.png`,
  mushroom: `${FLUENT}/mushroom.png`,
  oyster: `${FLUENT_PROPS}/oyster.png`,
  paintbrush: `${FLUENT_PROPS}/paintbrush.png`,
  pawPrints: `${FLUENT_PROPS}/paw-prints.png`,
  pencil: `${FLUENT_PROPS}/pencil.png`,
  sailboat: `${FLUENT_PROPS}/sailboat.png`,
  scarf: `${FLUENT_PROPS}/scarf.png`,
  sled: `${FLUENT_MINI}/sled.png`,
  tulip: `${FLUENT_MINI}/tulip.png`,
  turtle: `${FLUENT_MINI}/turtle.png`,
  unicorn: `${FLUENT_MINI}/unicorn.png`,
  waterBuffalo: `${FLUENT_MINI}/water-buffalo.png`,
  wood: `${FLUENT_MINI}/wood.png`,
} as const;


/** Poses rendered for every character (tools/assets/render-preview.ts `UI_CLIPS`). */
const POSES = ['wave', 'cheer', 'idle'] as const;
export type MiuPose = (typeof POSES)[number];

/**
 * Character renders from the review generator. They sit on a flat light-blue background (not
 * transparent), so the UI always shows them filling a tile of that colour, or blended with
 * `multiply` over a tint.
 */
const artFor = (characterId: string): Readonly<Record<MiuPose, string>> =>
  Object.fromEntries(POSES.map((pose) => [pose, `generated/review/character/${characterId}-anim-${pose}.png`])) as Record<MiuPose, string>;

/** Miu, the game's mascot (brand column, loading screens). */
export const MIU_ART = artFor('miu-cat');

/** Portraits of each species' character, for every playable character built from a recipe (not quest NPCs). */
export const SPECIES_ART: Readonly<Record<string, Readonly<Record<MiuPose, string>>>> = Object.fromEntries(
  Object.entries(characters as Record<string, { role?: string; recipe?: { species: string } }>).flatMap(([id, spec]) =>
    spec.recipe && spec.role !== 'npc' ? [[spec.recipe.species, artFor(id)]] : [],
  ),
);

/** Home and world-map background: the world overview, one floating island per region (`pnpm assets:home`). */
export const HOME_ISLAND = 'generated/home/world.png';

/** Region screen art (`pnpm assets:regions`): each region's backdrop, rendered from its map, and the chest. */
// The catalogue itself is validated by `pnpm content:check`; here only ids and the backdrop flag matter.
export const REGION_BACKDROPS: Readonly<Record<string, string>> = Object.fromEntries(
  (regions as { regions: Array<{ id: string; backdrop?: unknown }> }).regions.filter((r) => r.backdrop).map((r) => [r.id, regionBackdropPath(r.id)]),
);
export const REGION_CHEST = REGION_CHEST_ICON;

/**
 * Pets (content/pets.json, validated by `pnpm content:check`): the model the game and the creator load, its
 * colour variant, the level that opens it, and its tile picture.
 */
export const PETS: ReadonlyArray<Pet & { art: string }> = (pets as { pets: Pet[] }).pets.map((p) => ({ ...p, art: petArtPath(p.id) }));

export type UiIcon = keyof typeof UI_ICONS;

export const UI_ART_PATHS: readonly string[] = [
  ...Object.values(UI_ICONS),
  ...new Set([...Object.values(MIU_ART), ...Object.values(SPECIES_ART).flatMap((art) => Object.values(art))]),
  HOME_ISLAND,
  ...Object.values(REGION_BACKDROPS),
  REGION_CHEST,
  ...PETS.flatMap((p) => [p.model, p.art]),
];

/** URL of a file the UI shows, with its content version (asset-versions.ts) so a new release shows the new file. */
export const assetUrl = (manifestPath: string): string => versioned(`/game-assets/${manifestPath}`, UI_ASSET_VERSIONS[manifestPath]);
