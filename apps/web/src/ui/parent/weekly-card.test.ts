import { describe, expect, it } from 'vitest';
import { WEEKLY_CARD_SIZE, paintWeeklyCard, readCardColours, weeklyCardTexts, type CardColours, type CardPainter } from './weekly-card';

const COLOURS: CardColours = {
  skyTop: '#111111',
  skyMid: '#222222',
  skyBottom: '#333333',
  parchment: '#444444',
  parchmentEdge: '#555555',
  ink: '#666666',
  inkSoft: '#777777',
  primary: '#888888',
  grass: '#999999',
  dirt: '#aaaaaa',
};

/** A painter that remembers the text it was asked to draw and gives every character the same width. */
function recorder(charWidth = 10): { painter: CardPainter; texts: string[]; fonts: string[]; fills: unknown[]; stops: string[] } {
  const texts: string[] = [];
  const stops: string[] = [];
  const fonts: string[] = [];
  const fills: unknown[] = [];
  const painter: CardPainter = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect() {
      fills.push(painter.fillStyle);
    },
    fillText(text: string) {
      texts.push(text);
      fonts.push(painter.font);
    },
    measureText: (text: string) => ({ width: text.length * (Number.parseInt(painter.font.split(' ')[1] ?? '16', 10) / 10) * charWidth }) as TextMetrics,
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    createLinearGradient: () => ({ addColorStop: (_at: number, colour: string) => void stops.push(colour) }) as unknown as CanvasGradient,
  };
  return { painter, texts, fonts, fills, stops };
}

describe('the weekly card', () => {
  it('says the minutes this week and the lessons done, in Vietnamese, and nothing else about the player', () => {
    const texts = weeklyCardTexts({ minutes: 95, lessonsDone: 12, lessonsTotal: 70 }, 'miu.hoandat.com');
    const { painter, texts: drawn } = recorder();
    paintWeeklyCard(painter, COLOURS, texts);
    expect(drawn).toEqual(['Miu World', 'Một tuần vừa chơi vừa học', '95', 'phút chơi tuần này', '12/70', 'bài đã xong', 'Học SGK lớp 2 qua trò chơi 3D', 'miu.hoandat.com']);
  });

  it('uses the colours it is given and the game’s fonts, and shrinks a line that does not fit', () => {
    const { painter, fonts, fills, stops } = recorder(40);
    paintWeeklyCard(painter, COLOURS, weeklyCardTexts({ minutes: 123456789, lessonsDone: 0, lessonsTotal: 70 }, 'miu.hoandat.com'));
    expect(stops).toEqual([COLOURS.skyTop, COLOURS.skyMid, COLOURS.skyBottom]);
    expect(fills).toContain(COLOURS.grass);
    expect(fills).toContain(COLOURS.dirt);
    expect(fonts.every((font) => /"Baloo 2"|Nunito/.test(font))).toBe(true);
    const minutesFont = fonts[2] ?? '';
    expect(Number.parseInt(minutesFont.split(' ')[1] ?? '0', 10)).toBeLessThan(200);
  });

  it('is square, as the share sheets crop it least', () => {
    expect(WEEKLY_CARD_SIZE.width).toBe(WEEKLY_CARD_SIZE.height);
  });

  it('reads its colours from the design tokens of the page', () => {
    const root = document.createElement('div');
    root.style.setProperty('--color-sky-top', ' #8fd0ff ');
    document.body.append(root);
    expect(readCardColours(root).skyTop).toBe('#8fd0ff');
    root.remove();
  });
});
