// Where the pets' pictures live (`pnpm assets:pets`). Plain data with no imports on purpose:
// apps/web/vite.config.ts reaches it (through ui-art.ts) before any bundling.

/** Manifest path of a pet's picture on its Character Creator tile, rendered from its model. */
export const petArtPath = (petId: string): string => `generated/pets/${petId}.png`;
