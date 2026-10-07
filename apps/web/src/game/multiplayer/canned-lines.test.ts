import { describe, expect, it } from 'vitest';
import { BOT_LINES, BOT_LINE_VARIANTS } from '@miu/schema/bot-lines';
import viLocale from '../../ui/i18n/locales/vi.json';
import enLocale from '../../ui/i18n/locales/en.json';
import { linesOf } from '../../ui/i18n/i18n';
import { botLinePair } from './canned-lines';

const pool = (locale: Readonly<Record<string, unknown>>, key: string): string[] => {
  const lines = locale[`online.botLines.${key}`];
  return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === 'string') : [];
};

describe('companion bot lines in the locale files', () => {
  it('words every kind of line as many times as the wire allows, in Vietnamese and in English', () => {
    for (const key of BOT_LINES) {
      expect(pool(viLocale, key), key).toHaveLength(BOT_LINE_VARIANTS);
      expect(pool(enLocale, key), key).toHaveLength(BOT_LINE_VARIANTS);
    }
  });

  it('never says the same line twice, in a kind or across kinds', () => {
    for (const locale of [viLocale, enLocale]) {
      const all = BOT_LINES.flatMap((key) => pool(locale, key).map((line) => line.trim().toLowerCase()));
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('keeps each line whole: no name to fill in, no empty wording', () => {
    for (const locale of [viLocale, enLocale]) {
      for (const key of BOT_LINES) {
        for (const line of pool(locale, key)) {
          expect(line.trim(), key).not.toBe('');
          expect(line, key).not.toMatch(/[{}]/);
        }
      }
    }
  });

  it('reads a line in both languages by kind and wording, and nothing past the last wording', () => {
    expect(botLinePair('hello', 0)).toEqual(linesOf('online.botLines.hello')[0]);
    const last = botLinePair('friend', BOT_LINE_VARIANTS - 1);
    expect(last?.vi).toBe(pool(viLocale, 'friend').at(-1));
    expect(last?.en).toBe(pool(enLocale, 'friend').at(-1));
    expect(botLinePair('bye', BOT_LINE_VARIANTS)).toBeNull();
  });
});
