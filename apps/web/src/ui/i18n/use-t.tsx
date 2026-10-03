// React side of the bilingual display: the mode as React state (every screen using it re-renders when the
// setting changes), `t()` bound to it for strings shown inline (aria labels, placeholders), and `<Bi>` / `<T>`
// for visible text: in Song ngữ the Vietnamese line with a smaller English line under it.
import { useMemo, useSyncExternalStore } from 'react';
import { getLangMode, inline, onLangModeChange, pairOf, type Bilingual, type LangMode, type Params, type TextKey } from './i18n';
import './i18n.css';

export function useLangMode(): LangMode {
  return useSyncExternalStore(onLangModeChange, getLangMode, getLangMode);
}

export interface Translator {
  mode: LangMode;
  /** A key as one string in the current mode ("Việt / English" in Song ngữ). */
  t: (key: TextKey, params?: Params) => string;
  /** Any bilingual line as one string in the current mode. */
  inline: (text: Bilingual) => string;
}

export function useT(): Translator {
  const mode = useLangMode();
  return useMemo(() => ({ mode, t: (key, params) => inline(pairOf(key, params), mode), inline: (text) => inline(text, mode) }), [mode]);
}

/**
 * Visible text in the current mode. Vietnamese mode renders the bare text (the same DOM as before the
 * bilingual display); Song ngữ stacks a smaller English line under the Vietnamese one, unless both are the same.
 */
export function Bi({ vi, en }: Bilingual) {
  const mode = useLangMode();
  if (mode === 'vi' || vi === en) return <>{mode === 'en' ? en : vi}</>;
  if (mode === 'en') return <span lang="en">{en}</span>;
  return (
    <span className="bi">
      <span className="bi-vi">{vi}</span>{' '}
      <span className="bi-en" lang="en">
        {en}
      </span>
    </span>
  );
}

/** `<Bi>` for a locale key. */
export function T({ k, params }: { k: TextKey; params?: Params }) {
  const pair = pairOf(k, params);
  return <Bi vi={pair.vi} en={pair.en} />;
}
