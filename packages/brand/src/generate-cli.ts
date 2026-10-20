// Copied from chat-next/packages/brand @a5be0b4; keep in sync until shared package exists.
/**
 * Writes the platform manifests derived from brand.config.json to packages/brand/generated/. Run after editing the
 * brand (the logo PNGs come from `pnpm assets:logo`):
 *
 *   pnpm brand:gen
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { GENERATED_DIR, loadBrandConfig } from './config.ts';
import { generateManifests, manifestText } from './generate.ts';

const brand = loadBrandConfig();
mkdirSync(GENERATED_DIR, { recursive: true });
const manifests = generateManifests(brand);
for (const [name, content] of Object.entries(manifests)) {
  writeFileSync(new URL(name, GENERATED_DIR), manifestText(content));
}
console.log(`Wrote ${Object.keys(manifests).length} manifests to ${GENERATED_DIR.pathname}`);
