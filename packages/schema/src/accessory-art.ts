// Where the wearable items' pictures live (`pnpm assets:accessories`). Plain data with no imports on
// purpose: apps/web/vite.config.ts reaches it (through ui-art.ts) before any bundling.

/** Folder (manifest path prefix) of the item pictures. */
export const ACCESSORY_ART_DIR = 'generated/accessories/';

/** Manifest path of an item's picture on its Character Creator tile, rendered from its voxel JSON. */
export const accessoryArtPath = (itemId: string): string => `${ACCESSORY_ART_DIR}${itemId}.png`;
