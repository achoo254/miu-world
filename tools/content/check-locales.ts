// The bilingual display's dictionaries (apps/web/src/ui/i18n/locales, Master Plan §8c): every Vietnamese key has
// an English line with the same `{placeholders}` (a pool has as many lines), and English has no key of its own.
// The web app falls back to Vietnamese at run time; this gate keeps that fallback from hiding a gap.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const LOCALES_DIR = path.resolve(import.meta.dirname, '../../apps/web/src/ui/i18n/locales');

type Locale = Readonly<Record<string, unknown>>;

const placeholders = (text: string): string => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

function lineIssues(key: string, vi: unknown, en: unknown): string[] {
  if (typeof vi === 'string') {
    if (typeof en !== 'string' || en.trim() === '') return [`${key}: no English line`];
    return placeholders(vi) === placeholders(en) ? [] : [`${key}: placeholders differ ({${placeholders(vi)}} vs {${placeholders(en)}})`];
  }
  if (Array.isArray(vi) && vi.every((line) => typeof line === 'string')) {
    if (!Array.isArray(en) || en.length !== vi.length) return [`${key}: English pool needs ${vi.length} lines`];
    return vi.flatMap((line: string, i) => lineIssues(`${key}[${i}]`, line, en[i]));
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
