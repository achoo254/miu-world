// `pnpm security:dist`: after `pnpm --filter @miu/web build`, checks that no quest answer reached the
// web bundle. Answers and support layers live only on the server (content/quests is read there); a
// stray import from the web app would ship them to every child's browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../assets/asset-lib';

const QUEST_DIR = path.join(REPO_ROOT, 'content/quests');
const DIST_DIR = path.join(REPO_ROOT, 'apps/web/dist');
/**
 * Shorter strings ("13", "Bạn Hải ly") also appear as public choice labels; only distinctive text counts.
 * This scan is a tripwire for a stray import of content/quests, not the protection itself: that is
 * `QuestStepPublic`, which drops answers and support layers before anything leaves the server.
 */
const MIN_SECRET_LENGTH = 16;
const SCANNED = new Set(['.js', '.mjs', '.json', '.html', '.css', '.map']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
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

export function scanDist(distDir = DIST_DIR, questDir = QUEST_DIR): string[] {
  const quests = files(questDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(f, 'utf8')) as unknown);
  const secrets = questSecrets(quests);
  if (secrets.length === 0) return ['no answer text found in content/quests: the scan would prove nothing'];
  return files(distDir)
    .filter((f) => SCANNED.has(path.extname(f)))
    .flatMap((f) => leaksIn(readFileSync(f, 'utf8'), secrets).map((leak) => `${path.relative(REPO_ROOT, f)}: ${leak}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let issues: string[];
  try {
    issues = scanDist();
  } catch (error) {
    issues = [`cannot scan apps/web/dist (build it first): ${error instanceof Error ? error.message : String(error)}`];
  }
  if (issues.length > 0) {
    console.error(`security:dist FAILED (${issues.length}):`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log('security:dist OK — no quest answer in apps/web/dist');
}
