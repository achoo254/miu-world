// The picture of a week for a parent to forward: the minutes played this week and the lessons done so far, on a sky
// with a strip of grass and soil. Drawn in the browser on a canvas from what the progress view already holds; the
// fonts are the game's own (served from this origin) and the colours are read from the design tokens. It has no name
// of the player and nothing else of hers, in Vietnamese whatever the display mode, and no network request is made.
import { webOrigin } from '../../platform/endpoints';
import { pairOf } from '../i18n/i18n';

export const WEEKLY_CARD_SIZE = { width: 1080, height: 1080 } as const;

/** What the card says: all of it comes from the progress view. */
export interface WeeklyCardFacts {
  /** Minutes played in the current week. */
  minutes: number;
  lessonsDone: number;
  lessonsTotal: number;
}

/** The colours the card uses (CSS colour values, read from `tokens.css`). */
export interface CardColours {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  parchment: string;
  parchmentEdge: string;
  ink: string;
  inkSoft: string;
  primary: string;
  grass: string;
  dirt: string;
}

/** The card's colours as the page's design tokens define them now. */
export function readCardColours(root: HTMLElement = document.documentElement): CardColours {
  const style = getComputedStyle(root);
  const token = (name: string): string => style.getPropertyValue(name).trim();
  return {
    skyTop: token('--color-sky-top'),
    skyMid: token('--color-sky-mid'),
    skyBottom: token('--color-sky-bottom'),
    parchment: token('--color-parchment'),
    parchmentEdge: token('--color-parchment-edge'),
    ink: token('--color-ink'),
    inkSoft: token('--color-ink-soft'),
    primary: token('--color-primary'),
    grass: token('--color-grass'),
    dirt: token('--color-dirt'),
  };
}

/** The lines of text on the card, in Vietnamese. */
export interface CardTexts {
  brand: string;
  headline: string;
  minutes: string;
  minutesLabel: string;
  lessons: string;
  lessonsLabel: string;
  footer: string;
  site: string;
}

export function weeklyCardTexts(facts: WeeklyCardFacts, site: string): CardTexts {
  return {
    brand: pairOf('weeklyCard.brand').vi,
    headline: pairOf('weeklyCard.headline').vi,
    minutes: String(facts.minutes),
    minutesLabel: pairOf('weeklyCard.minutesLabel').vi,
    lessons: `${facts.lessonsDone}/${facts.lessonsTotal}`,
    lessonsLabel: pairOf('weeklyCard.lessonsLabel').vi,
    footer: pairOf('weeklyCard.footer').vi,
    site,
  };
}

/** The part of a canvas context the card is drawn with (a recording stand-in does for tests). */
export type CardPainter = Pick<
  CanvasRenderingContext2D,
  'fillRect' | 'fillText' | 'measureText' | 'beginPath' | 'roundRect' | 'fill' | 'stroke' | 'createLinearGradient' | 'save' | 'restore'
> & {
  fillStyle: CanvasRenderingContext2D['fillStyle'];
  strokeStyle: CanvasRenderingContext2D['strokeStyle'];
  lineWidth: CanvasRenderingContext2D['lineWidth'];
  font: CanvasRenderingContext2D['font'];
  textAlign: CanvasRenderingContext2D['textAlign'];
  textBaseline: CanvasRenderingContext2D['textBaseline'];
};

const DISPLAY = '"Baloo 2", system-ui, sans-serif';
const BODY = 'Nunito, system-ui, sans-serif';
const { width: W, height: H } = WEEKLY_CARD_SIZE;
const BLOCK = 60;

/** Draws one centred line, its size shrunk (down to a third) until it fits `maxWidth`. */
function centred(ctx: CardPainter, text: string, y: number, weight: 700 | 800, size: number, family: string, colour: string, maxWidth: number): void {
  let px = size;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > size / 3) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  ctx.fillStyle = colour;
  ctx.fillText(text, W / 2, y);
}

/** Paints the card on a `WEEKLY_CARD_SIZE` surface. */
export function paintWeeklyCard(ctx: CardPainter, colours: CardColours, texts: CardTexts): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, colours.skyTop);
  sky.addColorStop(0.55, colours.skyMid);
  sky.addColorStop(1, colours.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  centred(ctx, texts.brand, 128, 800, 76, DISPLAY, colours.primary, W - 160);
  centred(ctx, texts.headline, 196, 700, 44, DISPLAY, colours.ink, W - 160);

  // The parchment with the two numbers.
  const card = { x: 90, y: 250, w: W - 180, h: 560 };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(card.x, card.y, card.w, card.h, 40);
  ctx.fillStyle = colours.parchment;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = colours.parchmentEdge;
  ctx.stroke();
  ctx.restore();

  centred(ctx, texts.minutes, 480, 800, 200, DISPLAY, colours.ink, card.w - 80);
  centred(ctx, texts.minutesLabel, 544, 700, 44, BODY, colours.inkSoft, card.w - 80);
  centred(ctx, texts.lessons, 696, 800, 112, DISPLAY, colours.primary, card.w - 80);
  centred(ctx, texts.lessonsLabel, 756, 700, 44, BODY, colours.inkSoft, card.w - 80);

  // Grass over soil, in blocks.
  for (let x = 0; x < W; x += BLOCK) {
    ctx.fillStyle = colours.grass;
    ctx.fillRect(x, 880, BLOCK, BLOCK);
    ctx.fillStyle = colours.dirt;
    ctx.fillRect(x, 880 + BLOCK, BLOCK, H - 880 - BLOCK);
  }
  centred(ctx, texts.footer, 1000, 700, 40, BODY, colours.ink, W - 160);
  centred(ctx, texts.site, 1050, 800, 36, DISPLAY, colours.ink, W - 160);
}

/** Makes sure the card's fonts are loaded before it is drawn (a font not yet used on the page is not loaded yet). */
async function loadCardFonts(texts: CardTexts): Promise<void> {
  if (!('fonts' in document)) return;
  const sample = Object.values(texts).join(' ');
  await Promise.all([document.fonts.load(`800 76px ${DISPLAY}`, sample), document.fonts.load(`700 44px ${DISPLAY}`, sample), document.fonts.load(`700 44px ${BODY}`, sample)]);
}

/** The card as a PNG. */
export async function renderWeeklyCard(facts: WeeklyCardFacts, site: string = new URL(webOrigin()).host): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-canvas');
  const texts = weeklyCardTexts(facts, site);
  await loadCardFonts(texts);
  paintWeeklyCard(ctx, readCardColours(), texts);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no-image'))), 'image/png'));
}
