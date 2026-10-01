// Every repo asset the React UI shows, as manifest paths. The build copies exactly these (plus the
// runtime set) into dist/, so a path that leaves the manifest fails the build instead of a 404.
// Plain data on purpose: vite.config imports it.
import characters from '../../../../../content/characters.json';
import pets from '../../../../../content/pets.json';
import regions from '../../../../../content/world/regions.json';
import { petArtPath } from '../../../../../packages/schema/src/pet-art';
import { REGION_CHEST_ICON, regionBackdropPath } from '../../../../../packages/schema/src/region-art';

const FLUENT = 'packs/fluent-emoji/1ffb34c752ec/icons';

/** Fluent Emoji 3D (MIT), the icon set chosen in docs/design-guidelines.md. */
export const UI_ICONS = {
  antennaBars: `${FLUENT}/antenna-bars.png`,
  backpack: `${FLUENT}/backpack.png`,
  beaver: `${FLUENT}/beaver.png`,
  books: `${FLUENT}/books.png`,
  candy: `${FLUENT}/candy.png`,
  catFace: `${FLUENT}/cat-face.png`,
  checkMark: `${FLUENT}/check-mark.png`,
  clover: `${FLUENT}/clover.png`,
  coin: `${FLUENT}/coin.png`,
  gear: `${FLUENT}/gear.png`,
  gift: `${FLUENT}/gift.png`,
  glowingStar: `${FLUENT}/glowing-star.png`,
  heart: `${FLUENT}/heart.png`,
  kangaroo: `${FLUENT}/kangaroo.png`,
  house: `${FLUENT}/house.png`,
  key: `${FLUENT}/key.png`,
  leaf: `${FLUENT}/leaf.png`,
  locked: `${FLUENT}/locked.png`,
  map: `${FLUENT}/map.png`,
  parrot: `${FLUENT}/parrot.png`,
  package: `${FLUENT}/package.png`,
  pause: `${FLUENT}/pause.png`,
  redApple: `${FLUENT}/red-apple.png`,
  rock: `${FLUENT}/rock.png`,
  ringBuoy: `${FLUENT}/ring-buoy.png`,
  runningShoe: `${FLUENT}/running-shoe.png`,
  basket: `${FLUENT}/basket.png`,
  scroll: `${FLUENT}/scroll.png`,
  sparkles: `${FLUENT}/sparkles.png`,
  speaker: `${FLUENT}/speaker.png`,
  speakerMuted: `${FLUENT}/speaker-muted.png`,
  star: `${FLUENT}/star.png`,
  tree: `${FLUENT}/tree.png`,
  unlocked: `${FLUENT}/unlocked.png`,
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

/** Portraits of each species' character, for every character built from a recipe. */
export const SPECIES_ART: Readonly<Record<string, Readonly<Record<MiuPose, string>>>> = Object.fromEntries(
  Object.entries(characters as Record<string, { recipe?: { species: string } }>).flatMap(([id, spec]) => (spec.recipe ? [[spec.recipe.species, artFor(id)]] : [])),
);

/** Home and world-map background: the world overview, one floating island per region (`pnpm assets:home`). */
export const HOME_ISLAND = 'generated/home/world.png';

/** Region screen art (`pnpm assets:regions`): each region's backdrop, rendered from its map, and the chest. */
// The catalogue itself is validated by `pnpm content:check`; here only ids and the backdrop flag matter.
export const REGION_BACKDROPS: Readonly<Record<string, string>> = Object.fromEntries(
  (regions as { regions: Array<{ id: string; backdrop?: unknown }> }).regions.filter((r) => r.backdrop).map((r) => [r.id, regionBackdropPath(r.id)]),
);
export const REGION_CHEST = REGION_CHEST_ICON;

/** Pets (content/pets.json, validated by `pnpm content:check`): the model the game and the creator load, and its tile picture. */
export const PETS: ReadonlyArray<{ id: string; name: string; model: string; scale: number; art: string }> = (
  pets as { pets: Array<{ id: string; name: string; model: string; scale: number }> }
).pets.map((p) => ({ ...p, art: petArtPath(p.id) }));

export type UiIcon = keyof typeof UI_ICONS;

export const UI_ART_PATHS: readonly string[] = [
  ...Object.values(UI_ICONS),
  ...new Set([...Object.values(MIU_ART), ...Object.values(SPECIES_ART).flatMap((art) => Object.values(art))]),
  HOME_ISLAND,
  ...Object.values(REGION_BACKDROPS),
  REGION_CHEST,
  ...PETS.flatMap((p) => [p.model, p.art]),
];

export const assetUrl = (manifestPath: string): string => `/game-assets/${manifestPath}`;
