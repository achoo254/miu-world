// Where the region screen's generated art lives (`pnpm assets:regions`). Plain data with no imports on
// purpose: apps/web/vite.config.ts reaches it (through ui-art.ts) before any bundling.

/** Manifest path of a region's backdrop image, rendered from its map with the region's `backdrop` camera. */
export const regionBackdropPath = (regionId: string): string => `generated/regions/${regionId}.png`;
/** The treasure chest on the region screen's progress card, rendered from the quest chest model. */
export const REGION_CHEST_ICON = 'generated/regions/chest.png';
export const REGION_CHEST_MODEL = 'packs/kenney-survival-kit/2.0/chest.glb';
