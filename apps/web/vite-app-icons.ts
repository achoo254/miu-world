// The logo (assets/generated/brand/, `pnpm assets:logo`) as the pages' favicon and the home-screen icon of the installed
// web app: links every page to the favicon and the iPhone icon, and gives the game page a web app manifest (served in
// dev, emitted into the build). Name, colours, icons and the manifest come from brand.config.json (@miu/brand), which
// the build validates here. Icon URLs carry their manifest hash so a new logo is fetched past Cloudflare's cache; the
// files themselves ship through repoAssets like any other runtime asset.
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Connect, HtmlTagDescriptor, Plugin } from 'vite';
import { brand } from '@miu/brand/brand';
import { parseBrandConfig } from '@miu/brand/config';
import { generateManifests, manifestText } from '@miu/brand/generate';
import { iconFor, rasterIcons } from '@miu/brand/icons';
import { versioned } from './src/asset-versions.ts';
import { assetUrlResolver } from './vite-asset-url.ts';

function smallestManifestLogo(): string {
  const [logo] = rasterIcons(brand).filter((icon) => icon.purpose === 'any');
  if (!logo) throw new Error('brand: no manifest logo');
  return logo.file;
}

/** The logo the static pages show beside the game's name (the 192 px manifest icon). */
export const APP_LOGO = smallestManifestLogo();
/** Repo asset paths the pages load: shipped into the build next to the UI art. */
export const APP_ICON_PATHS = rasterIcons(brand).map((icon) => icon.file);

const WEB_MANIFEST = 'manifest.webmanifest';

/** The favicon and iPhone icon links every page carries (the static lesson pages too); `url` resolves a manifest path. */
export function iconLinkTags(url: (file: string) => string): HtmlTagDescriptor[] {
  const favicon = iconFor(brand, 'favicon');
  return [
    { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: `${favicon.size}x${favicon.size}`, href: url(favicon.file) }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: url(iconFor(brand, 'apple-touch').file) }, injectTo: 'head' },
  ];
}

export function appIcons(assetsDir: string): Plugin {
  const url = assetUrlResolver(assetsDir);
  // Fails the build (and the dev server) on a brand.config.json its schema rejects.
  parseBrandConfig(brand);
  const webManifest = manifestText(generateManifests(brand, url)['web.webmanifest.json']);
  const manifestUrl = versioned(`/${WEB_MANIFEST}`, createHash('sha256').update(webManifest).digest('hex').slice(0, 12));
  const serveManifest: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] !== `/${WEB_MANIFEST}`) return next();
    res.setHeader('Content-Type', 'application/manifest+json');
    res.end(webManifest);
  };

  return {
    name: 'miu-app-icons',
    configureServer(server) {
      server.middlewares.use(serveManifest);
    },
    transformIndexHtml(_html, ctx) {
      const tags = iconLinkTags(url);
      // Only the game is installable: the review and tool pages keep the favicon alone.
      if (path.basename(ctx.filename) === 'index.html') {
        tags.push(
          { tag: 'link', attrs: { rel: 'manifest', href: manifestUrl }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'theme-color', content: brand.colors.theme }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: brand.shortName }, injectTo: 'head' },
        );
      }
      return tags;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: WEB_MANIFEST, source: webManifest });
    },
  };
}
