// The preview pictures links show when shared (Open Graph / Twitter cards): one for the whole game and one per lesson
// page, drawn by `pnpm assets:cards` (tools/assets/render-share-cards.ts) into this folder of the asset manifest.
// Plain data, shared by the generator, the build that points each page at its picture and the web app.

/** Folder of the pictures, relative to `assets/`. */
export const SHARE_CARD_DIR = 'generated/share-cards';
/** The size every link-preview service takes without cropping oddly (1.91:1). */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;
/** The card for the home page and the pages that have none of their own. */
export const GENERAL_SHARE_CARD = `${SHARE_CARD_DIR}/miu-world.png`;
/** The card of a lesson page, named by its slug (`lesson-pages.ts`). */
export const lessonShareCard = (slug: string): string => `${SHARE_CARD_DIR}/${slug}.png`;
