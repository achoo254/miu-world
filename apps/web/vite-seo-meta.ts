// What search engines and chat apps read from a page: the description, the Open Graph and Twitter tags that make a
// pasted link show a title, a text and a picture, and the app shell's own set for `index.html`. The shell is shared by
// every route of the single-page app, so it carries no canonical address: only the static lesson pages and subject pages
// (vite-lesson-pages.ts) name theirs. The words come from the Vietnamese locale (`seo.*`), the picture from the
// share cards (`pnpm assets:cards`); both addresses are absolute, as link-preview services need.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { GENERAL_SHARE_CARD, SHARE_CARD_SIZE } from '../../packages/schema/src/share-cards.ts';
import { pairOf } from './src/ui/i18n/i18n.ts';
import viLocale from './src/ui/i18n/locales/vi.json';
import { assetUrlResolver } from './vite-asset-url.ts';

/** Where the game is served: the base of every absolute address in a page or the sitemap. */
export const SITE_ORIGIN = 'https://miu.hoandat.com';
export const SITE_NAME = 'Miu World';

export const absoluteUrl = (urlPath: string): string => `${SITE_ORIGIN}${urlPath}`;

export interface SocialCard {
  title: string;
  description: string;
  /** The page's own address when it has one worth naming (`og:url`); the app shell has none. */
  url?: string;
  /** Path of the picture in the asset manifest (the share cards). */
  image: string;
  imageAlt: string;
}

/** The description, Open Graph and Twitter tags of a page. `imageUrl` is the picture's absolute, versioned address. */
export function socialTags(card: SocialCard, imageUrl: string): HtmlTagDescriptor[] {
  const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' });
  return [
    meta({ name: 'description', content: card.description }),
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:site_name', content: SITE_NAME }),
    meta({ property: 'og:locale', content: 'vi_VN' }),
    meta({ property: 'og:title', content: card.title }),
    meta({ property: 'og:description', content: card.description }),
    ...(card.url ? [meta({ property: 'og:url', content: card.url })] : []),
    meta({ property: 'og:image', content: imageUrl }),
    meta({ property: 'og:image:type', content: 'image/png' }),
    meta({ property: 'og:image:width', content: String(SHARE_CARD_SIZE.width) }),
    meta({ property: 'og:image:height', content: String(SHARE_CARD_SIZE.height) }),
    meta({ property: 'og:image:alt', content: card.imageAlt }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:title', content: card.title }),
    meta({ name: 'twitter:description', content: card.description }),
    meta({ name: 'twitter:image', content: imageUrl }),
    meta({ name: 'twitter:image:alt', content: card.imageAlt }),
  ];
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);

/** One head tag as HTML (for the pages the build writes itself; Vite writes the shell's). */
export function renderHeadTag(tag: HtmlTagDescriptor): string {
  const attrs = Object.entries(tag.attrs ?? {})
    .map(([name, value]) => ` ${name}="${escapeHtml(String(value))}"`)
    .join('');
  return `<${tag.tag}${attrs}>`;
}

/** The app shell's own words, from the locale: the page title and the description everyone sees before signing in. */
export const shellCard = (): SocialCard => ({
  title: pairOf('seo.title').vi,
  description: pairOf('seo.description').vi,
  image: GENERAL_SHARE_CARD,
  imageAlt: pairOf('seo.imageAlt').vi,
});

/** Description and preview tags for `index.html` (the shell), absolute and versioned. */
export function seoMeta(assetsDir: string): Plugin {
  const url = assetUrlResolver(assetsDir);
  return {
    name: 'miu-seo-meta',
    transformIndexHtml(_html, ctx) {
      // The game's page only: the review and tool pages are not meant to be found or shared.
      if (path.basename(ctx.filename) !== 'index.html') return [];
      const card = shellCard();
      return socialTags(card, absoluteUrl(url(card.image)));
    },
  };
}

/**
 * Changes when what the home page says changes: the shell's HTML (`indexHtml`, with its static block) and the words of the
 * landing screen and the preview tags. The sitemap's `lastmod` for `/` follows it.
 */
export function shellHash(indexHtml: string): string {
  const words = Object.entries(viLocale).filter(([key]) => key.startsWith('seo.') || key.startsWith('landing.'));
  return createHash('sha256').update(readFileSync(indexHtml)).update(JSON.stringify(words)).digest('hex').slice(0, 12);
}
