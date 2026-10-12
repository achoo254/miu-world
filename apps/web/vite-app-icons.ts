// The Miu logo (assets/generated/brand/, `pnpm assets:logo`) as the pages' favicon and the home-screen icon of the
// installed web app: links every page to the favicon and the iPhone icon, and gives the game page a web app manifest
// (served in dev, emitted into the build). Icon URLs carry their manifest hash so a new logo is fetched past
// Cloudflare's cache; the files themselves ship through repoAssets like any other runtime asset.
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Connect, HtmlTagDescriptor, Plugin } from 'vite';
import { versioned } from './src/asset-versions.ts';
import { assetUrlResolver } from './vite-asset-url.ts';

const BRAND_DIR = 'generated/brand';
const FAVICON = `${BRAND_DIR}/miu-logo-32.png`;
const APPLE_TOUCH_ICON = `${BRAND_DIR}/miu-logo-180.png`;
/** The logo the static pages show beside the game's name. */
export const APP_LOGO = `${BRAND_DIR}/miu-logo-192.png`;
const MANIFEST_ICONS = [
  { file: APP_LOGO, sizes: '192x192', purpose: 'any' },
  { file: `${BRAND_DIR}/miu-logo-512.png`, sizes: '512x512', purpose: 'any' },
  { file: `${BRAND_DIR}/miu-logo-maskable-512.png`, sizes: '512x512', purpose: 'maskable' },
];
/** Repo asset paths the pages load: shipped into the build next to the UI art. */
export const APP_ICON_PATHS = [FAVICON, APPLE_TOUCH_ICON, ...MANIFEST_ICONS.map((icon) => icon.file)];

const WEB_MANIFEST = 'manifest.webmanifest';
const APP_NAME = 'Miu World';
/** --color-sky-top and --color-sky-mid of src/ui/tokens.css: the logo's sky behind the browser bar and splash. */
const THEME_COLOR = '#8fd0ff';
const BACKGROUND_COLOR = '#cdebff';

/** The favicon and iPhone icon links every page carries (the static lesson pages too); `url` resolves a manifest path. */
export function iconLinkTags(url: (file: string) => string): HtmlTagDescriptor[] {
  return [
    { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: url(FAVICON) }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: url(APPLE_TOUCH_ICON) }, injectTo: 'head' },
  ];
}

export function appIcons(assetsDir: string): Plugin {
  const url = assetUrlResolver(assetsDir);
  const webManifest = `${JSON.stringify(
    {
      name: APP_NAME,
      short_name: APP_NAME,
      description: 'Thế giới 3D vừa chơi vừa học Toán và Tiếng Việt, chơi cùng bạn bè.',
      lang: 'vi',
      start_url: '/',
      scope: '/',
      display: 'fullscreen',
      orientation: 'any',
      theme_color: THEME_COLOR,
      background_color: BACKGROUND_COLOR,
      icons: MANIFEST_ICONS.map((icon) => ({ src: url(icon.file), sizes: icon.sizes, type: 'image/png', purpose: icon.purpose })),
    },
    null,
    2,
  )}\n`;
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
          { tag: 'meta', attrs: { name: 'theme-color', content: THEME_COLOR }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: APP_NAME }, injectTo: 'head' },
        );
      }
      return tags;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: WEB_MANIFEST, source: webManifest });
    },
  };
}
