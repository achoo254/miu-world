import { describe, expect, it } from 'vitest';
import { lessonPageOf } from './lesson-link';
import { inviteLink, resultLink, weeklyLink } from './share-links';

const ORIGIN = 'https://miu.hoandat.com';
const CODE = 'AbCdEfGhIjKlMnOpQrStUv';

describe('share links', () => {
  it('makes an invite link of the code alone, with how it was shared', () => {
    expect(inviteLink(ORIGIN, CODE)).toBe(`${ORIGIN}/moi/${CODE}?utm_source=share&utm_medium=share&utm_campaign=invite`);
  });

  it('points a result at the lesson page, with an invite code only when asked', () => {
    expect(resultLink(ORIGIN, 'toan-2-bai-1')).toBe(`${ORIGIN}/bai/toan-2-bai-1/?utm_source=share&utm_medium=share&utm_campaign=result`);
    expect(resultLink(ORIGIN, 'toan-2-bai-1', CODE)).toBe(`${ORIGIN}/bai/toan-2-bai-1/?utm_source=share&utm_medium=share&utm_campaign=result&moi=${CODE}`);
  });

  it('points a result with no lesson page at the home page, or at the invite page with an invite', () => {
    expect(resultLink(ORIGIN, null)).toBe(`${ORIGIN}/?utm_source=share&utm_medium=share&utm_campaign=result`);
    expect(resultLink(ORIGIN, null, CODE)).toBe(`${ORIGIN}/moi/${CODE}?utm_source=share&utm_medium=share&utm_campaign=result`);
  });

  it('points the week’s card at the home page', () => {
    expect(weeklyLink(ORIGIN)).toBe(`${ORIGIN}/?utm_source=share&utm_medium=share&utm_campaign=weekly`);
  });
});

describe('the page of a lesson', () => {
  it('is named the way the build names it, from the lesson as printed', () => {
    expect(lessonPageOf({ book: 'Toán 2, tập một', lesson: 'Bài 1. Ôn tập các số đến 100' })).toEqual({ slug: 'toan-2-bai-1-on-tap-cac-so-den-100', lessonId: 'toan2-t1-b01' });
  });

  it('is none for a lesson the books do not list, another book or a quest with no textbook lesson', () => {
    expect(lessonPageOf({ book: 'Toán 2, tập một', lesson: 'Bài 99. Không có' })).toBeNull();
    expect(lessonPageOf({ book: 'Sách khác', lesson: 'Bài 1. Ôn tập các số đến 100' })).toBeNull();
    expect(lessonPageOf(undefined)).toBeNull();
  });
});
