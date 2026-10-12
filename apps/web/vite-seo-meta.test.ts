import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import enLocale from './src/ui/i18n/locales/en.json';
import viLocale from './src/ui/i18n/locales/vi.json';
import { SITE_ORIGIN, escapeHtml, renderHeadTag, seoMeta, shellCard, shellHash, socialTags } from './vite-seo-meta';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(APP_DIR, '../../assets');
const INDEX_HTML = path.join(APP_DIR, 'index.html');
const indexHtml = readFileSync(INDEX_HTML, 'utf8');

const shellTags = (filename: string): string[] => {
  const hook = seoMeta(ASSETS_DIR).transformIndexHtml;
  const handler = typeof hook === 'function' ? hook : hook?.handler;
  const tags = handler?.call({} as never, '', { filename, path: '/x', server: undefined, bundle: undefined, chunk: undefined } as never) as Array<{ tag: string; attrs?: Record<string, string> }> | undefined;
  return (tags ?? []).map((tag) => renderHeadTag(tag as Parameters<typeof renderHeadTag>[0]));
};

describe('the app shell tags', () => {
  const tags = shellTags(INDEX_HTML);

  it('describe the game and point the preview at the absolute, versioned general card', () => {
    expect(tags).toContain(`<meta name="description" content="${escapeHtml(viLocale['seo.description'])}">`);
    expect(tags).toContain(`<meta property="og:title" content="${escapeHtml(viLocale['seo.title'])}">`);
    expect(tags.find((tag) => tag.includes('property="og:image"'))).toMatch(/content="https:\/\/miu\.hoandat\.com\/game-assets\/generated\/share-cards\/miu-world\.png\?v=[0-9a-f]{12}"/);
    expect(tags).toContain('<meta property="og:image:width" content="1200">');
    expect(tags).toContain('<meta property="og:image:height" content="630">');
    expect(tags).toContain('<meta property="og:locale" content="vi_VN">');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('name no address of their own: the shell serves every route of the app', () => {
    expect(tags.join('')).not.toContain('canonical');
    expect(tags.join('')).not.toContain('og:url');
  });

  it('are left off the review and tool pages', () => {
    expect(shellTags(path.join(APP_DIR, 'review.html'))).toEqual([]);
    expect(shellTags(path.join(APP_DIR, 'preview.html'))).toEqual([]);
  });
});

describe('socialTags', () => {
  it('adds the page address as og:url when it has one', () => {
    const card = { ...shellCard(), url: `${SITE_ORIGIN}/bai/toan-2/` };
    expect(socialTags(card, 'https://x.example/a.png').map(renderHeadTag)).toContain('<meta property="og:url" content="https://miu.hoandat.com/bai/toan-2/">');
  });

  it('escapes what it prints', () => {
    expect(renderHeadTag({ tag: 'meta', attrs: { content: `a "b" <c> & 'd'` } })).toBe('<meta content="a &quot;b&quot; &lt;c&gt; &amp; &#39;d&#39;">');
  });
});

describe('index.html', () => {
  const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('has the title of the preview and, in #root, the landing screen\'s words for a crawler that runs no script', () => {
    expect(indexHtml).toContain(`<title>${viLocale['seo.title']}</title>`);
    const root = /<div id="root">([\s\S]*?)<\/div>\s*<script/.exec(indexHtml)?.[1] ?? '';
    expect(root).toContain(`<h1>${viLocale['landing.title']}</h1>`);
    for (const key of ['landing.lead', 'landing.benefitBooks', 'landing.benefitFriends', 'landing.benefitNotebook', 'landing.benefitFree', 'landing.play'] as const) {
      expect(text(root), key).toContain(viLocale[key]);
    }
    expect(root).toContain('<a href="/login">');
    expect(root).toContain('<a href="/bai/toan-2/">Các bài Toán 2</a>');
    expect(root).toContain('<a href="/bai/tieng-viet-2/">Các bài Tiếng Việt 2</a>');
  });

  it('has an English twin for every new line', () => {
    for (const key of Object.keys(viLocale).filter((k) => /^(seo|landing|subjectPage|lessonPage|shareCard)\./.test(k))) expect(enLocale, key).toHaveProperty([key]);
  });

  it('sets no script of its own besides the app\'s', () => {
    expect([...indexHtml.matchAll(/<script\b[^>]*>/g)].map((m) => m[0])).toEqual(['<script type="module" src="/src/main.tsx">']);
  });
});

describe('shellHash', () => {
  it('is stable for the same shell', () => {
    expect(shellHash(INDEX_HTML)).toBe(shellHash(INDEX_HTML));
    expect(shellHash(INDEX_HTML)).toMatch(/^[0-9a-f]{12}$/);
  });
});
