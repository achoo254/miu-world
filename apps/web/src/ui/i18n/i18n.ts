// Bilingual display (Master Plan §8c): every UI string lives in `locales/vi.json` with its English twin in
// `locales/en.json`. Three display modes: Tiếng Việt, English, Song ngữ (the Vietnamese line with a smaller
// English line under it). Missing English falls back to the Vietnamese; `pnpm content:check` and a unit test
// report the gaps. Textbook wording never goes through here: it stays the book's Vietnamese.
// React-free, so the game runtime can label its own buttons with `t()`; React screens use `useT()` / `<Bi>`.
import enJson from './locales/en.json';
import viJson from './locales/vi.json';

export type Lang = 'vi' | 'en';
export type LangMode = Lang | 'both';
export const LANG_MODES: readonly LangMode[] = ['vi', 'en', 'both'];

type Locale = typeof viJson;
/** A key whose value is one line. */
export type TextKey = { [K in keyof Locale]: Locale[K] extends string ? K : never }[keyof Locale];
/** A key whose value is a pool of lines (said in turn, never back-to-back). */
export type LinesKey = { [K in keyof Locale]: Locale[K] extends readonly string[] ? K : never }[keyof Locale];

/** One line in both languages; `en` equals `vi` for text that has no translation (textbook wording). */
export interface Bilingual {
  vi: string;
  en: string;
}

/** Values of `{param}` placeholders; a bilingual value fills each language with its own side. */
export type Params = Readonly<Record<string, string | number | Bilingual>>;

const VI: Readonly<Record<string, string | readonly string[]>> = viJson;
const EN: Readonly<Record<string, string | readonly string[] | undefined>> = enJson;

/**
 * Fills `{param}` placeholders given in `params` with their `lang` side; others (`{name}` filled later by `say`)
 * are left as they are.
 */
export function format(text: string, params?: Params, lang: Lang = 'vi'): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = params[key];
    if (value === undefined) return whole;
    return typeof value === 'object' ? value[lang] : String(value);
  });
}

/** Untranslated text (textbook wording, a server message): the same line in both languages, shown once. */
export const same = (text: string): Bilingual => ({ vi: text, en: text });

/** A key in both languages, English falling back to Vietnamese. */
export function pairOf(key: TextKey, params?: Params): Bilingual {
  const vi = VI[key];
  const en = EN[key];
  const viText = typeof vi === 'string' ? vi : key;
  const enText = typeof en === 'string' && en.trim() !== '' ? en : viText;
  return { vi: format(viText, params, 'vi'), en: format(enText, params, 'en') };
}

/** A pool of lines in both languages, paired by position; a missing English line falls back to its Vietnamese. */
export function linesOf(key: LinesKey): Bilingual[] {
  const vi = VI[key];
  const en = EN[key];
  const viLines = Array.isArray(vi) ? vi : [];
  const enLines = Array.isArray(en) ? en : [];
  return viLines.map((line, i) => {
    const english = enLines[i];
    return { vi: line, en: typeof english === 'string' && english.trim() !== '' ? english : line };
  });
}

/** Maps both sides of a line (fills `{name}`, `{who}`…). */
export const mapBoth = (text: Bilingual, fn: (line: string) => string): Bilingual => ({ vi: fn(text.vi), en: fn(text.en) });

/** Joins lines side by side ("Cần Lv.3 · Xong …"). */
export const joinBoth = (parts: readonly Bilingual[], separator = ''): Bilingual => ({
  vi: parts.map((p) => p.vi).join(separator),
  en: parts.map((p) => p.en).join(separator),
});

/** The line as one string in `mode`: in both languages "Việt / English" (once when they are the same). */
export function inline(text: Bilingual, mode: LangMode): string {
  if (mode === 'vi') return text.vi;
  if (mode === 'en') return text.en;
  return text.vi === text.en ? text.vi : `${text.vi} / ${text.en}`;
}

// The chosen mode, kept on this device for each child profile (Master Plan §8c: "lưu theo hồ sơ bé"), and as the
// device's choice for screens before a profile is picked. Storage can be blocked (private mode): reads fall back
// to Vietnamese and writes are skipped, so the setting never breaks the game.
const STORAGE_KEY = 'miu.lang';
const listeners = new Set<() => void>();

export const isLangMode = (value: unknown): value is LangMode => typeof value === 'string' && (LANG_MODES as readonly string[]).includes(value);

/** The child profile whose choice is read and written (null: the device's). */
let profile: string | null = null;
const profileKey = (id: string): string => `${STORAGE_KEY}.${id}`;

function readKey(key: string): LangMode | null {
  try {
    const stored = window.localStorage.getItem(key);
    return isLangMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeKey(key: string, mode: LangMode): void {
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // Blocked storage: the choice lasts until the page closes.
  }
}

const readStored = (): LangMode => (profile ? readKey(profileKey(profile)) : null) ?? readKey(STORAGE_KEY) ?? 'vi';

let current: LangMode | null = null;

function apply(mode: LangMode): void {
  current = mode;
  if (typeof document !== 'undefined') document.documentElement.lang = mode === 'en' ? 'en' : 'vi';
  for (const listener of listeners) listener();
}

export function getLangMode(): LangMode {
  current ??= readStored();
  return current;
}

function syncLanguageToServer(childId: string, mode: LangMode): void {
  if (typeof fetch === 'undefined') return;
  void fetch(`/api/children/${childId}/language`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: mode }),
  }).catch(() => {
    // Best-effort server sync; local storage is the instant offline cache.
  });
}

export function setLangMode(mode: LangMode, sync = true): void {
  writeKey(STORAGE_KEY, mode);
  if (profile) {
    writeKey(profileKey(profile), mode);
    if (sync) syncLanguageToServer(profile, mode);
  }
  apply(mode);
}

/** The selected child profile changed: her own choice applies (the device's until she makes one). */
export function bindLangProfile(childId: string | null, serverLanguage?: LangMode | null): void {
  if (childId === profile) {
    if (childId && serverLanguage && isLangMode(serverLanguage) && !readKey(profileKey(childId))) {
      writeKey(profileKey(childId), serverLanguage);
      if (serverLanguage !== current) apply(serverLanguage);
    }
    return;
  }
  profile = childId;
  if (childId && serverLanguage && isLangMode(serverLanguage) && !readKey(profileKey(childId))) {
    writeKey(profileKey(childId), serverLanguage);
    if (serverLanguage !== current) apply(serverLanguage);
    return;
  }
  const mode = readStored();
  if (mode !== current) apply(mode);
}

/** Calls `listener` after every change of the mode (React screens re-render, the game relabels its buttons). */
export function onLangModeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The game's own DOM (its buttons, not React): writes `key` into `el` in the current mode, in Song ngữ as the
 * same two lines as `<Bi>`. Call again after `onLangModeChange` to follow the setting.
 */
export function writeText(el: HTMLElement, key: TextKey): void {
  const text = pairOf(key);
  const mode = getLangMode();
  const stacked = mode === 'both' && text.vi !== text.en;
  el.classList.toggle('bi', stacked);
  if (!stacked) {
    el.textContent = inline(text, mode);
    return;
  }
  const vi = document.createElement('span');
  vi.className = 'bi-vi';
  vi.textContent = text.vi;
  const en = document.createElement('span');
  en.className = 'bi-en';
  en.lang = 'en';
  en.textContent = text.en;
  el.replaceChildren(vi, ' ', en);
}

/** A key as one string in the current mode (game code, aria labels). React screens use `useT()` to follow changes. */
export const t = (key: TextKey, params?: Params): string => inline(pairOf(key, params), getLangMode());
