import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageSetting, VoiceSpeedSetting } from '../system/language-setting';
import { readVoiceSpeed } from '../system/voice-setting';
import { bindLangProfile, format, getLangMode, inline, joinBoth, linesOf, mapBoth, pairOf, same, setLangMode, t, writeText } from './i18n';
import enLocale from './locales/en.json';
import viLocale from './locales/vi.json';
import { Bi, T } from './use-t';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  act(() => {
    bindLangProfile(null);
    setLangMode('vi');
  });
  window.localStorage.clear();
});

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('locales', () => {
  it('has an English line for every Vietnamese key, with the same placeholders and pool sizes', () => {
    const english: Record<string, unknown> = enLocale;
    for (const [key, value] of Object.entries(viLocale)) {
      const other = english[key];
      expect(other, `en.json lacks ${key}`).toBeDefined();
      if (Array.isArray(value)) {
        expect(Array.isArray(other) && other.length, `${key}: pool size`).toBe(value.length);
        value.forEach((line, i) => expect(placeholders((other as string[])[i] ?? ''), `${key}[${i}]`).toEqual(placeholders(line)));
      } else {
        expect(typeof other === 'string' && other.trim() !== '', `${key}: empty`).toBe(true);
        expect(placeholders(other as string), key).toEqual(placeholders(value));
      }
    }
    expect(Object.keys(enLocale).filter((key) => !(key in viLocale))).toEqual([]);
  });
});

describe('t and pairs', () => {
  it('fills params, leaving {name} for the character name filled later', () => {
    expect(pairOf('common.progress', { done: 2, total: 5 })).toEqual({ vi: 'Hoàn thành 2/5', en: 'Done 2/5' });
    expect(format('Chào {name}, còn {n}', { n: 3 })).toBe('Chào {name}, còn 3');
    expect(pairOf('support.answerNote').vi).toContain('{name}');
  });

  it('fills a bilingual param with its own side in each language', () => {
    expect(pairOf('reward.goal.claim', { tier: { vi: 'Rương', en: 'Chest' } })).toEqual({ vi: 'Rương đã sẵn sàng, mở ngay nào!', en: 'Chest is ready, open it now!' });
  });

  it('shows Vietnamese, English or both inline, once when the two are the same', () => {
    const pair = pairOf('common.close');
    expect(inline(pair, 'vi')).toBe('Đóng');
    expect(inline(pair, 'en')).toBe('Close');
    expect(inline(pair, 'both')).toBe('Đóng / Close');
    expect(inline(same('Bài 1'), 'both')).toBe('Bài 1');
    expect(inline(pairOf('common.menu'), 'both')).toBe('Menu');
  });

  it('falls back to Vietnamese when an English line is missing or blank', async () => {
    vi.resetModules();
    vi.doMock('./locales/en.json', () => ({ default: { 'common.close': '', 'loop.found': ['Found it, {name}!'] } }));
    const fresh = await import('./i18n');
    expect(fresh.pairOf('common.close')).toEqual({ vi: 'Đóng', en: 'Đóng' });
    expect(fresh.pairOf('common.back')).toEqual({ vi: 'Quay lại', en: 'Quay lại' });
    const found = fresh.linesOf('loop.found');
    expect(found[0]?.en).toBe('Found it, {name}!');
    expect(found[1]).toEqual({ vi: 'A ha! {who} đây rồi.', en: 'A ha! {who} đây rồi.' });
    vi.doUnmock('./locales/en.json');
    vi.resetModules();
  });

  it('pairs pools line by line and maps or joins both sides', () => {
    const pool = linesOf('loop.tryAgain');
    expect(pool.length).toBe(5);
    expect(mapBoth(pool[0] ?? same(''), (line) => line.replace('{name}', 'Mochi'))).toEqual({ vi: 'Gần đúng rồi, Mochi thử lại nhé!', en: 'Almost, Mochi! Try again.' });
    expect(joinBoth([pairOf('common.close'), pairOf('common.back')], ' · ')).toEqual({ vi: 'Đóng · Quay lại', en: 'Close · Back' });
  });

  it('follows the mode: t() and the game-side writer', () => {
    const button = document.createElement('button');
    setLangMode('en');
    expect(t('game.run')).toBe('Run');
    writeText(button, 'game.run');
    expect(button.textContent).toBe('Run');
    setLangMode('both');
    expect(t('game.run')).toBe('Chạy / Run');
    writeText(button, 'game.run');
    expect(button.classList.contains('bi')).toBe(true);
    expect(button.querySelector('.bi-en')?.textContent).toBe('Run');
    setLangMode('vi');
    writeText(button, 'game.run');
    expect(button.textContent).toBe('Chạy');
    expect(button.classList.contains('bi')).toBe(false);
  });
});

describe('the mode setting', () => {
  it('is Vietnamese by default and kept per device and per child profile', () => {
    expect(getLangMode()).toBe('vi');
    bindLangProfile('child-a');
    setLangMode('both');
    expect(window.localStorage.getItem('miu.lang.child-a')).toBe('both');
    bindLangProfile('child-b');
    // Child B has no choice of her own yet: the device's last one.
    expect(getLangMode()).toBe('both');
    setLangMode('en');
    bindLangProfile('child-a');
    expect(getLangMode()).toBe('both');
    bindLangProfile('child-b');
    expect(getLangMode()).toBe('en');
  });

  it('still works when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setLangMode('en');
    expect(getLangMode()).toBe('en');
  });
});

describe('<Bi> and <T>', () => {
  it('renders the bare Vietnamese in Vietnamese mode, so screens read as before', () => {
    const { container } = render(<T k="pause.resume" />);
    expect(container.innerHTML).toBe('Tiếp tục chơi');
  });

  it('switches at once with the setting: English, then both lines', () => {
    render(
      <p data-testid="line">
        <Bi vi="Xin chào" en="Hello" />
      </p>,
    );
    const line = screen.getByTestId('line');
    act(() => setLangMode('en'));
    expect(line.textContent).toBe('Hello');
    expect(line.querySelector('[lang="en"]')).not.toBeNull();
    act(() => setLangMode('both'));
    expect(line.querySelector('.bi-vi')?.textContent).toBe('Xin chào');
    expect(line.querySelector('.bi-en')?.textContent).toBe('Hello');
  });

  it('shows untranslated text once in both mode', () => {
    act(() => setLangMode('both'));
    const { container } = render(<Bi vi="Bài 1" en="Bài 1" />);
    expect(container.innerHTML).toBe('Bài 1');
  });
});

describe('LanguageSetting', () => {
  it('offers the three modes and applies the chosen one at once', () => {
    render(
      <>
        <LanguageSetting dataId="lang" />
        <p data-testid="label">
          <T k="settings.title" />
        </p>
      </>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Ngôn ngữ / Language' });
    expect(group).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(screen.getByTestId('label').textContent).toBe('Settings');
    expect(screen.getByRole('radio', { name: 'English' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Song ngữ Both' }));
    expect(screen.getByTestId('label').textContent).toBe('Cài đặt Settings');
    expect(window.localStorage.getItem('miu.lang')).toBe('both');
  });

  it('keeps the read-aloud speed on this device, slow by default', () => {
    render(<VoiceSpeedSetting dataId="voice" />);
    expect(readVoiceSpeed()).toBe('slow');
    expect(screen.getByRole('radio', { name: 'Chậm' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Vừa' }));
    expect(readVoiceSpeed()).toBe('normal');
    expect(screen.getByRole('radio', { name: 'Vừa' }).getAttribute('aria-checked')).toBe('true');
  });
});
