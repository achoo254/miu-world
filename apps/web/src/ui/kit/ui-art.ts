// Every repo asset the React UI shows, as manifest paths. The build copies exactly these (plus the
// runtime set) into dist/, so a path that leaves the manifest fails the build instead of a 404.
// Plain data on purpose: vite.config imports it.

const FLUENT = 'packs/fluent-emoji/1ffb34c752ec/icons';

/** Fluent Emoji 3D (MIT), the icon set chosen in docs/design-guidelines.md. */
export const UI_ICONS = {
  antennaBars: `${FLUENT}/antenna-bars.png`,
  backpack: `${FLUENT}/backpack.png`,
  beaver: `${FLUENT}/beaver.png`,
  catFace: `${FLUENT}/cat-face.png`,
  checkMark: `${FLUENT}/check-mark.png`,
  coin: `${FLUENT}/coin.png`,
  gear: `${FLUENT}/gear.png`,
  gift: `${FLUENT}/gift.png`,
  glowingStar: `${FLUENT}/glowing-star.png`,
  heart: `${FLUENT}/heart.png`,
  house: `${FLUENT}/house.png`,
  key: `${FLUENT}/key.png`,
  locked: `${FLUENT}/locked.png`,
  map: `${FLUENT}/map.png`,
  parrot: `${FLUENT}/parrot.png`,
  package: `${FLUENT}/package.png`,
  pause: `${FLUENT}/pause.png`,
  redApple: `${FLUENT}/red-apple.png`,
  rock: `${FLUENT}/rock.png`,
  basket: `${FLUENT}/basket.png`,
  scroll: `${FLUENT}/scroll.png`,
  sparkles: `${FLUENT}/sparkles.png`,
  speaker: `${FLUENT}/speaker.png`,
  speakerMuted: `${FLUENT}/speaker-muted.png`,
  tree: `${FLUENT}/tree.png`,
} as const;

/**
 * Miu renders from the review generator. They sit on a flat light-blue background (not transparent),
 * so the UI always shows them filling a tile of that colour, or blended with `multiply` over a tint.
 */
export const MIU_ART = {
  wave: 'generated/review/character/miu-cat-anim-wave.png',
  cheer: 'generated/review/character/miu-cat-anim-cheer.png',
  idle: 'generated/review/character/miu-cat-anim-idle.png',
} as const;

/** Home background: the chapter map rendered as a floating island (`pnpm assets:home`). */
export const HOME_ISLAND = 'generated/home/island.png';

export type UiIcon = keyof typeof UI_ICONS;
export type MiuPose = keyof typeof MIU_ART;

export const UI_ART_PATHS: readonly string[] = [...Object.values(UI_ICONS), ...Object.values(MIU_ART), HOME_ISLAND];

export const assetUrl = (manifestPath: string): string => `/game-assets/${manifestPath}`;
