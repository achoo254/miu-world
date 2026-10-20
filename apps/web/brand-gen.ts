/**
 * Validates brand.config.json and writes the platform manifests derived from it to apps/web/generated/. Run after
 * editing the brand (the logo PNGs come from `pnpm assets:logo`); brand-icons.test.ts fails while they are stale:
 *
 *   pnpm brand:gen
 */
import { loadBrandConfig, writeBrandFiles } from '@shared-next/brand/build';
import { BRAND_GENERATED_DIR, BRAND_REQUIRE, BRAND_ROOT, brandManifests } from './brand-icons.ts';

const brand = loadBrandConfig(BRAND_ROOT, { require: BRAND_REQUIRE });
const written = await writeBrandFiles({ brand, root: BRAND_ROOT, generatedDir: BRAND_GENERATED_DIR, manifests: brandManifests(brand) });
console.log(`Wrote ${written.join(', ')} to ${BRAND_GENERATED_DIR.pathname}`);
