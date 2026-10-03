import { describe, expect, it } from 'vitest';
import { checkLocales, localeIssues } from './check-locales';

describe('locale check', () => {
  it('passes on the shipped dictionaries', () => {
    expect(checkLocales()).toEqual([]);
  });

  it('reports a missing or blank English line, other placeholders, a short pool and an English-only key', () => {
    const vi = { a: 'Chào {name}', b: 'Đóng', c: ['Một', 'Hai {who}'], d: 'Còn {n}' };
    const en = { a: 'Hello {name}', b: ' ', c: ['One'], d: 'Left {count}', e: 'Extra' };
    expect(localeIssues(vi, en)).toEqual([
      'locales: b: no English line',
      'locales: c: English pool needs 2 lines',
      'locales: d: placeholders differ ({n} vs {count})',
      'locales: e: in en.json only',
    ]);
    expect(localeIssues({ c: ['Hai {who}'] }, { c: ['Two'] })).toEqual(['locales: c[0]: placeholders differ ({who} vs {})']);
  });
});
