// The brand (name, colours, icons, hosts) of brand.config.json at the repository root, bundled into whatever imports
// it: the UI, and the Vite plugins that write the head tags and the web manifest. The full schema check needs Ajv, which
// the web CSP blocks, so it runs at build time instead (vite-app-icons.ts, `pnpm brand:gen`, brand-icons.test.ts).
import config from '../../../brand.config.json' with { type: 'json' };
import { defineBrand } from '@shared-next/brand';

export const brand = defineBrand(config);
