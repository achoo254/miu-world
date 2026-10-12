// The public pages of the build that are plain HTML, so a search engine or a chat app reads them without running the
// game: a page per subject (`/bai/toan-2/`) and a page per textbook lesson that has a quest (`/bai/<slug>/`). Each one
// says what the game offers for that lesson and leads to it ("Chơi bài này"). What they say comes from
// lesson-page-data.ts (the books' tables of contents and the allowlisted quest fields), the words from the locale,
// the preview picture from the share cards.
//
// A page is complete HTML with its own CSP meta, the shared icon links, a canonical address, preview tags, a
// LearningResource JSON-LD block (the only inline script, data not code) and one same-origin module script: the
// separate `lesson-page` entry of the bundle (src/seo/lesson-page-entry.ts), whose hashed file name is read from the
// bundle when the pages are written.
import { createHash } from 'node:crypto';
import type { Plugin, Rollup } from 'vite';
import { LESSON_SUBJECTS, lessonPagePath, splitLessonTitle, subjectPagePath, type LessonSubject } from '../../packages/schema/src/lesson-pages.ts';
import { GENERAL_SHARE_CARD, lessonShareCard } from '../../packages/schema/src/share-cards.ts';
import { pairOf } from './src/ui/i18n/i18n.ts';
import { readLessonPageData, type LessonPageData } from './lesson-page-data.ts';
import { assetUrlResolver } from './vite-asset-url.ts';
import { APP_LOGO, iconLinkTags } from './vite-app-icons.ts';
import { SITE_NAME, absoluteUrl, escapeHtml, renderHeadTag, shellHash, socialTags } from './vite-seo-meta.ts';
import type { SitemapPage } from './vite-sitemap.ts';

/** Name of the bundle entry the pages' script is built from (the key in `build.rollupOptions.input`). */
export const LESSON_PAGE_ENTRY = 'lesson-page';

/** What the bundle gives a page: its script, the scripts that one imports, and its styles (paths from the site root). */
export interface PageAssets {
  script: string;
  imports: readonly string[];
  styles: readonly string[];
}

export interface SitePage {
  /** The page's address, ending in a slash (`/bai/toan-2/`). */
  path: string;
  /** Changes when what the page says changes (not when the bundle's file names do): the sitemap's `lastmod` follows it. */
  hash: string;
  render(assets: PageAssets): string;
}

/** The text of `text` cut at a word end before `limit` characters, with an ellipsis when something was left out. */
export function teaser(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[\s,;:.!?-]+$/, '')}…`;
}

const t = (key: Parameters<typeof pairOf>[0], params?: Parameters<typeof pairOf>[1]): string => pairOf(key, params).vi;

/** `</script>` and HTML comments cannot end or hide a JSON block when `<` is written as an escape. */
const jsonLd = (data: Record<string, unknown>): string => JSON.stringify(data).replace(/</g, '\\u003c');

interface PageParts {
  /** The page's address. */
  path: string;
  title: string;
  description: string;
  image: string;
  structured: Record<string, unknown>;
  body: string;
}

export interface Site {
  pages: SitePage[];
  /** The page nginx answers a missing lesson page with (`/404.html`): a real 404 that is not indexed, with ways back. */
  notFound(assets: PageAssets): string;
}

/**
 * The pages of the repo's content: the subject pages that have lessons, then every lesson page, in book order. `csp` is
 * the policy each page carries in its own meta (the game's, `CONTENT_SECURITY_POLICY` of vite.config.ts).
 */
export function buildSite({ contentDir, assetsDir, csp }: { contentDir: string; assetsDir: string; csp: string }): Site {
  const url = assetUrlResolver(assetsDir);
  const lessons = readLessonPageData(contentDir);
  const imageAlt = t('seo.imageAlt');

  /**
   * The page round `body`: the head every page shares (the game's policy, viewport, title, icons) and `extraHead`, then
   * the bundle's styles (and, for a page that runs it, the script) and the brand line.
   */
  const frame = ({ title, extraHead, body, interactive }: { title: string; extraHead: string[]; body: string; interactive: boolean }, assets: PageAssets): string => {
    const head: string[] = [
      '<meta charset="UTF-8">',
      renderHeadTag({ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp } }),
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)}</title>`,
      ...iconLinkTags(url).map(renderHeadTag),
      ...extraHead,
      ...assets.styles.map((href) => renderHeadTag({ tag: 'link', attrs: { rel: 'stylesheet', crossorigin: '', href } })),
      ...(interactive ? assets.imports.map((href) => renderHeadTag({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href } })) : []),
    ];
    return `<!doctype html>
<html lang="vi">
<head>
${head.map((line) => `  ${line}`).join('\n')}
</head>
<body>
  <div class="scene lesson-scene">
    <main class="scene-content lesson-page" data-id="lesson-page">
      <a class="lesson-brand" href="/" data-id="lesson-brand"><img src="${escapeHtml(url(APP_LOGO))}" width="48" height="48" alt=""><span>${escapeHtml(SITE_NAME)}</span></a>
${body}
    </main>
  </div>
${interactive ? `  <script type="module" crossorigin src="${escapeHtml(assets.script)}"></script>\n` : ''}</body>
</html>
`;
  };

  const document = (parts: PageParts, assets: PageAssets): string =>
    frame(
      {
        title: parts.title,
        extraHead: [
          renderHeadTag({ tag: 'link', attrs: { rel: 'canonical', href: absoluteUrl(parts.path) } }),
          ...socialTags({ title: parts.title, description: parts.description, url: absoluteUrl(parts.path), image: parts.image, imageAlt }, absoluteUrl(url(parts.image))).map(renderHeadTag),
          `<script type="application/ld+json">${jsonLd(parts.structured)}</script>`,
        ],
        body: parts.body,
        interactive: true,
      },
      assets,
    );

  const sitePage = (parts: PageParts): SitePage => ({
    path: parts.path,
    // The hash leaves the bundle's file names out: they change with every build of the code, not of the page.
    hash: createHash('sha256').update(document(parts, { script: '', imports: [], styles: [] })).digest('hex').slice(0, 12),
    render: (assets) => document(parts, assets),
  });

  const lessonsOf = (subject: LessonSubject): LessonPageData[] => lessons.filter((page) => page.subject.slug === subject.slug);
  const li = (href: string, text: string, attrs = ''): string => `<li><a href="${escapeHtml(href)}"${attrs}>${escapeHtml(text)}</a></li>`;

  const subjectPage = (subject: LessonSubject): SitePage => {
    const params = { subject: subject.name };
    const units = [...new Set(lessonsOf(subject).map((page) => page.unit))];
    const sections = units.map((unit) => {
      const items = lessonsOf(subject)
        .filter((page) => page.unit === unit)
        .map((page) => li(lessonPagePath(page.slug), page.title));
      return `        <section><h2>${escapeHtml(unit)}</h2><ul class="lesson-list">${items.join('')}</ul></section>`;
    });
    const path = subjectPagePath(subject);
    const title = t('subjectPage.title', params);
    const description = t('subjectPage.description', params);
    return sitePage({
      path,
      title,
      description,
      image: GENERAL_SHARE_CARD,
      structured: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: absoluteUrl(path),
        inLanguage: 'vi',
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
      },
      body: `      <article class="panel lesson-panel" data-id="subject-page">
        <h1>${escapeHtml(t('subjectPage.heading', params))}</h1>
        <p class="hint">${escapeHtml(t('subjectPage.lead'))}</p>
${sections.join('\n')}
        <a class="btn btn--primary" href="/login" data-id="subject-play">${escapeHtml(t('landing.play'))}</a>
      </article>`,
    });
  };

  const lessonPage = (page: LessonPageData, previous: LessonPageData | undefined, next: LessonPageData | undefined): SitePage => {
    const { label } = splitLessonTitle(page.title);
    const review = label === null;
    const params = { lesson: page.title, subject: page.subject.name, page: page.page, unit: page.unit };
    const path = lessonPagePath(page.slug);
    const title = t(review ? 'lessonPage.titleReview' : 'lessonPage.title', params);
    const first = page.activities[0];
    // `activities` is never empty: a lesson has a page only because a quest plays it.
    const description = t(review ? 'lessonPage.descriptionReview' : 'lessonPage.description', { ...params, teaser: teaser(first?.summary ?? '', 110) });
    const activities = page.activities
      .map(
        (activity) => `          <li><h3>${escapeHtml(activity.title)}</h3><p>${escapeHtml(activity.summary)}</p><p class="hint">${escapeHtml(t('lessonPage.activityRegion', { region: activity.regionName }))}</p></li>`,
      )
      .join('\n');
    const neighbour = (other: LessonPageData | undefined, key: 'lessonPage.previous' | 'lessonPage.next'): string =>
      other ? `<a class="btn btn--ghost btn--sm" href="${escapeHtml(lessonPagePath(other.slug))}">${escapeHtml(t(key))}: ${escapeHtml(other.title)}</a>` : '';
    return sitePage({
      path,
      title,
      description,
      image: lessonShareCard(page.slug),
      structured: {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: title,
        description,
        url: absoluteUrl(path),
        inLanguage: 'vi',
        isAccessibleForFree: true,
        learningResourceType: 'Trò chơi học tập',
        educationalLevel: 'Lớp 2',
        teaches: page.title,
        about: page.subject.name,
        provider: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      },
      body: `      <article class="panel lesson-panel" data-id="lesson-article">
        <p class="badge">${escapeHtml(t('lessonPage.bookLine', params))}</p>
        <h1>${escapeHtml(t(review ? 'lessonPage.headingReview' : 'lessonPage.heading', params))}</h1>
        <h2>${escapeHtml(t('lessonPage.activities'))}</h2>
        <ul class="lesson-activities">
${activities}
        </ul>
        <a class="btn btn--primary" href="/login" data-id="lesson-play" data-play-region="${escapeHtml(first?.region ?? '')}" data-play-quest="${escapeHtml(first?.id ?? '')}">${escapeHtml(t('lessonPage.play'))}</a>
        <p class="hint">${escapeHtml(t('lessonPage.playHint'))}</p>
        <nav class="lesson-nav" aria-label="${escapeHtml(page.subject.name)}">
${[neighbour(previous, 'lessonPage.previous'), neighbour(next, 'lessonPage.next'), `<a class="btn btn--ghost btn--sm" href="${escapeHtml(subjectPagePath(page.subject))}">${escapeHtml(t('lessonPage.allLessons', { subject: page.subject.name }))}</a>`]
  .filter((link) => link !== '')
  .map((link) => `          ${link}`)
  .join('\n')}
        </nav>
        <p class="note">${escapeHtml(t('lessonPage.note'))}</p>
      </article>`,
    });
  };

  const pages: SitePage[] = [];
  for (const subject of LESSON_SUBJECTS) {
    const own = lessonsOf(subject);
    if (own.length === 0) continue;
    pages.push(subjectPage(subject));
    own.forEach((page, i) => pages.push(lessonPage(page, own[i - 1], own[i + 1])));
  }
  const notFound = (assets: PageAssets): string =>
    frame(
      {
        title: t('notFound.title'),
        extraHead: ['<meta name="robots" content="noindex">'],
        body: `      <article class="panel lesson-panel" data-id="not-found">
        <h1>${escapeHtml(t('notFound.title'))}</h1>
        <p class="hint">${escapeHtml(t('notFound.hint'))}</p>
        <a class="btn btn--primary" href="/">${escapeHtml(t('lessonPage.toGame'))}</a>
        <nav class="lesson-nav">
          ${LESSON_SUBJECTS.map((subject) => `<a class="btn btn--ghost btn--sm" href="${escapeHtml(subjectPagePath(subject))}">${escapeHtml(t('lessonPage.allLessons', { subject: subject.name }))}</a>`).join('\n          ')}
        </nav>
      </article>`,
        interactive: false,
      },
      assets,
    );
  return { pages, notFound };
}

/** Every page the sitemap lists: the home page (whose HTML is `indexHtml`), then the site's pages. */
export function sitemapPages(site: Site, indexHtml: string): SitemapPage[] {
  return [{ path: '/', hash: shellHash(indexHtml) }, ...site.pages.map(({ path, hash }) => ({ path, hash }))];
}

/**
 * The styles an entry needs, those of the chunks it imports first (so the entry's own sheet comes last and wins a tie),
 * and every chunk it loads at start (the pages `modulepreload` them), each once.
 */
export function entryAssets(bundle: Rollup.OutputBundle, entry: Rollup.OutputChunk): PageAssets {
  const styles: string[] = [];
  const imports: string[] = [];
  const visited = new Set<string>();
  const visit = (chunk: Rollup.OutputChunk): void => {
    if (visited.has(chunk.fileName)) return;
    visited.add(chunk.fileName);
    for (const file of chunk.imports) {
      const dependency = bundle[file];
      if (dependency?.type === 'chunk') {
        visit(dependency);
        imports.push(`/${file}`);
      }
    }
    for (const file of chunk.viteMetadata?.importedCss ?? []) if (!styles.includes(`/${file}`)) styles.push(`/${file}`);
  };
  visit(entry);
  return { script: `/${entry.fileName}`, imports: [...new Set(imports)], styles };
}

/**
 * Writes the site's pages into the build, each as `<path>index.html`, and the 404 page. Needs the bundle's `lesson-page` entry (its
 * script, what that imports, its styles), which is why this runs once the bundle is complete.
 */
export function lessonPageFiles(site: Site): Plugin {
  return {
    name: 'miu-lesson-pages',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((chunk) => chunk.type === 'chunk' && chunk.isEntry && chunk.name === LESSON_PAGE_ENTRY);
      if (entry?.type !== 'chunk') throw new Error(`the bundle has no "${LESSON_PAGE_ENTRY}" entry: add it to build.rollupOptions.input`);
      const assets = entryAssets(bundle, entry);
      for (const page of site.pages) this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}index.html`, source: page.render(assets) });
      this.emitFile({ type: 'asset', fileName: '404.html', source: site.notFound(assets) });
    },
  };
}
