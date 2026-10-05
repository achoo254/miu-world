// The bilingual display's dictionaries (apps/web/src/ui/i18n/locales, Master Plan §8c): every Vietnamese key has
// an English line with the same `{placeholders}` (a pool has as many lines), and English has no key of its own.
// A pool never says the same line twice, and the pools shown again and again (the loading tips) are big enough
// to stay fresh.
// The web app falls back to Vietnamese at run time; this gate keeps that fallback from hiding a gap.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const LOCALES_DIR = path.resolve(import.meta.dirname, '../../apps/web/src/ui/i18n/locales');

type Locale = Readonly<Record<string, unknown>>;

/** Pools that must hold at least this many lines (owner, 05/10/2026: the loading tips never changed). */
export const POOL_MINIMUMS: Readonly<Record<string, number>> = { 'loading.tips': 20 };

const placeholders = (text: string): string => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

function lineIssues(key: string, vi: unknown, en: unknown): string[] {
  if (typeof vi === 'string') {
    if (typeof en !== 'string' || en.trim() === '') return [`${key}: no English line`];
    return placeholders(vi) === placeholders(en) ? [] : [`${key}: placeholders differ ({${placeholders(vi)}} vs {${placeholders(en)}})`];
  }
  if (Array.isArray(vi) && vi.every((line) => typeof line === 'string')) {
    if (!Array.isArray(en) || en.length !== vi.length) return [`${key}: English pool needs ${vi.length} lines`];
    const pool: string[] = [];
    const minimum = POOL_MINIMUMS[key] ?? 0;
    if (vi.length < minimum) pool.push(`${key}: pool needs at least ${minimum} lines (has ${vi.length})`);
    for (const [lang, lines] of [['vi', vi], ['en', en]] as const) {
      const repeated = lines.filter((line: unknown, i) => lines.indexOf(line) !== i);
      if (repeated.length > 0) pool.push(`${key}: ${lang} pool repeats ${JSON.stringify(repeated[0])}`);
    }
    return [...pool, ...vi.flatMap((line: string, i) => lineIssues(`${key}[${i}]`, line, en[i]))];
  }
  return [`${key}: a value must be a line or a list of lines`];
}

/** Problems between the Vietnamese dictionary and the English one (empty: they match). */
export function localeIssues(vi: Locale, en: Locale): string[] {
  const issues = Object.entries(vi).flatMap(([key, value]) => lineIssues(key, value, en[key]));
  for (const key of Object.keys(en)) if (!(key in vi)) issues.push(`${key}: in en.json only`);
  return issues.map((issue) => `locales: ${issue}`);
}

export function checkLocales(dir = LOCALES_DIR): string[] {
  const read = (name: string): Locale => JSON.parse(readFileSync(path.join(dir, `${name}.json`), 'utf8')) as Locale;
  try {
    return localeIssues(read('vi'), read('en'));
  } catch (error) {
    return [`locales: ${error instanceof Error ? error.message : String(error)}`];
  }
}
