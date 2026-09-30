// Writing space in vở ô li, and the model hand written on it. The model is the primary-school font
// (HP001), served by our own server only where it has been installed; without it the sheet shows no
// model at all rather than letters in a hand the child should not copy.
import { useEffect, useState, type CSSProperties } from 'react';

const MODEL_FONT = 'Chu Mau Tieu Hoc';

/** True once the model handwriting font has loaded; false when the server has none. */
export function useModelHand(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    // `load` rejects when the file 404s, and resolves empty where no face matches.
    document.fonts?.load(`700 1em "${MODEL_FONT}"`).then(
      (faces) => live && setReady(faces.length > 0),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/**
 * One line of model writing. `size` follows the handwriting book: `vua` (medium) makes lowercase 2 ô li
 * and capitals 5 ô li tall, `nho` (small) half that. The baseline sits on the bold line at the bottom of
 * dòng `row` (1-based). Parts marked `trace` print pale, for the child to write over.
 */
export interface ModelLine {
  size: 'vua' | 'nho';
  row: number;
  parts: ReadonlyArray<{ text: string; trace: boolean }>;
}

/** Writing space `rows` dòng high (one dòng = one 8 mm square = four ô li), with any model lines on it. */
export function OLi({ rows, lines = [] }: { rows: number; lines?: readonly ModelLine[] }) {
  return (
    <div className="oli" data-rows={rows} style={{ '--oli-rows': rows } as CSSProperties}>
      {lines.map((line, i) => (
        <p key={i} className={`oli-model oli-model--${line.size}`} style={{ '--oli-baseline-row': line.row } as CSSProperties}>
          {line.parts.map((part, j) => (
            <span key={j} className={part.trace ? 'oli-trace' : undefined}>
              {part.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

/**
 * Capitals as the handwriting book sets them: each letter in ink then twice to trace, at medium size
 * with two empty dòng below for the child, then at small size with one.
 */
export function letterSpace(letters: readonly string[]): { rows: number; lines: ModelLine[] } {
  const parts = letters.flatMap((letter) => [
    { text: letter, trace: false },
    { text: letter, trace: true },
    { text: letter, trace: true },
  ]);
  return {
    rows: 6,
    lines: [
      { size: 'vua', row: 2, parts },
      { size: 'nho', row: 5, parts },
    ],
  };
}

/** A sentence to copy, small size: each line in ink, then once to trace, then two empty dòng. */
export function sentenceSpace(model: readonly string[]): { rows: number; lines: ModelLine[] } {
  const lines = model.flatMap((text, i): ModelLine[] => [
    { size: 'nho', row: i * 4 + 1, parts: [{ text, trace: false }] },
    { size: 'nho', row: i * 4 + 2, parts: [{ text, trace: true }] },
  ]);
  return { rows: model.length * 4, lines };
}
