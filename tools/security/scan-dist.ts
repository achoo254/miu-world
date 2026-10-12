// `pnpm security:dist`: after `pnpm --filter @miu/web build`, checks that no quest answer reached the
// web bundle. Answers and support layers live only on the server (content/quests is read there); a
// stray import from the web app would ship them to every child's browser. It also checks the static
// lesson pages (dist/bai/): each carries the game's CSP and runs no inline script.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_SECURITY_POLICY } from '../../apps/web/vite.config';
import { REPO_ROOT } from '../assets/asset-lib';

const QUEST_DIR = path.join(REPO_ROOT, 'content/quests');
const CURRICULUM_DIR = path.join(REPO_ROOT, 'content/curriculum');
const DIST_DIR = path.join(REPO_ROOT, 'apps/web/dist');
/**
 * Shorter strings ("13", "Bạn Hải ly") also appear as public choice labels; only distinctive text counts.
 * This scan is a tripwire for a stray import of content/quests, not the protection itself: that is
 * `QuestStepPublic`, which drops answers and support layers before anything leaves the server.
 */
const MIN_SECRET_LENGTH = 16;
const SCANNED = new Set(['.js', '.mjs', '.json', '.html', '.css', '.map', '.xml', '.txt']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

interface BookFile {
  title?: unknown;
  toc?: Array<{ title?: unknown; lessons?: Array<{ title?: unknown }> }>;
}

/**
 * The books' own titles for their lessons and topics. The lesson pages print them by design, so a quest whose answer
 * is one of them (the name of the poem a lesson reads) gives nothing away that the page does not already say.
 */
export function publicBookTitles(curriculumDir = CURRICULUM_DIR): string[] {
  if (!existsSync(curriculumDir)) return [];
  return readdirSync(curriculumDir).flatMap((book) => {
    const file = path.join(curriculumDir, book, 'book.json');
    if (!existsSync(file)) return [];
    const { title, toc = [] } = JSON.parse(readFileSync(file, 'utf8')) as BookFile;
    return [title, ...toc.flatMap((unit) => [unit.title, ...(unit.lessons ?? []).map((lesson) => lesson.title)])].filter((t): t is string => typeof t === 'string');
  });
}

type WithSupport = { support?: { answer?: { text?: unknown; explanation?: unknown } } };

/**
 * Text only the support endpoint may hand out: the answer layer's explanation and (unless it is only a choice's label,
 * which the question itself shows) its answer, per step and per boss question.
 */
export function questSecrets(quests: readonly unknown[]): string[] {
  const secrets = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.length >= MIN_SECRET_LENGTH) secrets.add(value);
  };
  for (const quest of quests) {
    const steps = (quest as { steps?: unknown[] }).steps ?? [];
    for (const step of steps) {
      const answer = (step as WithSupport).support?.answer;
      add(answer?.text);
      add(answer?.explanation);
      for (const turn of (step as { turns?: unknown[] }).turns ?? []) {
        const layer = (turn as WithSupport).support?.answer;
        const labels = ((turn as { choices?: Array<{ text?: unknown }> }).choices ?? []).map((c) => c.text);
        if (!labels.includes(layer?.text)) add(layer?.text);
        add(layer?.explanation);
      }
    }
  }
  return [...secrets];
}

/** Leaks in one file: a secret string, or a raw quest object with its support layers. */
export function leaksIn(text: string, secrets: readonly string[]): string[] {
  const found = secrets.filter((s) => text.includes(s)).map((s) => `answer text "${s.slice(0, 40)}…"`);
  if (/"support"\s*:\s*\{\s*"guide"/.test(text)) found.push('a quest object with its support layers');
  return found;
}

/** `&#39;` and the like in an attribute value, as the browser reads them. */
const decodeAttribute = (value: string): string => value.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * What a static lesson page (dist/bai/<slug>/index.html) must keep to: the game's Content-Security-Policy in its own meta, and no
 * script that is code in the page itself. The one inline script allowed is the structured-data block, which is
 * data (`application/ld+json`); every other script names a file of this site.
 */
export function lessonPageIssues(html: string): string[] {
  const issues: string[] = [];
  const policy = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html);
  if (!policy) issues.push('no Content-Security-Policy meta');
  else if (decodeAttribute(policy[1] ?? '') !== CONTENT_SECURITY_POLICY) issues.push('its Content-Security-Policy is not the game\'s');
  for (const [, attrs = '', body = ''] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /\ssrc="([^"]*)"/i.exec(attrs)?.[1];
    if (src === undefined) {
      if (!/\stype="application\/ld\+json"/i.test(attrs)) issues.push(`inline script: ${body.trim().slice(0, 40)}`);
    } else if (!src.startsWith('/') || src.startsWith('//')) {
      issues.push(`script from another origin: ${src}`);
    }
  }
  return issues;
}

export function scanDist(distDir = DIST_DIR, questDir = QUEST_DIR): string[] {
  const quests = files(questDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(f, 'utf8')) as unknown);
  const titles = publicBookTitles();
  const secrets = questSecrets(quests).filter((secret) => !titles.some((title) => title.includes(secret)));
  if (secrets.length === 0) return ['no answer text found in content/quests: the scan would prove nothing'];
  return files(distDir)
    .filter((f) => SCANNED.has(path.extname(f)))
    .flatMap((f) => leaksIn(readFileSync(f, 'utf8'), secrets).map((leak) => `${path.relative(REPO_ROOT, f)}: ${leak}`));
}

/**
 * The lesson pages of a build (`dist/bai/<slug>/index.html`) and its 404 page, checked one by one; a build with no
 * lesson page is an issue too.
 */
export function scanLessonPages(distDir = DIST_DIR): string[] {
  const root = path.join(distDir, 'bai');
  const lessons = existsSync(root) ? files(root).filter((f) => path.basename(f) === 'index.html') : [];
  if (lessons.length === 0) return ['no lesson page in dist/bai: the build did not write them'];
  const notFound = path.join(distDir, '404.html');
  const pages = existsSync(notFound) ? [...lessons, notFound] : lessons;
  return pages.flatMap((f) => lessonPageIssues(readFileSync(f, 'utf8')).map((issue) => `${path.relative(REPO_ROOT, f)}: ${issue}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let issues: string[];
  try {
    issues = [...scanDist(), ...scanLessonPages()];
  } catch (error) {
    issues = [`cannot scan apps/web/dist (build it first): ${error instanceof Error ? error.message : String(error)}`];
  }
  if (issues.length > 0) {
    console.error(`security:dist FAILED (${issues.length}):`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log('security:dist OK — no quest answer in apps/web/dist, every lesson page keeps the CSP and runs no inline script');
}
