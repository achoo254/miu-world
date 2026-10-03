// Tone mark: a picture and its word with the tone mark missing ("ca" beside a fish). Five tone hats wait at the
// bottom: sắc, huyền, hỏi, ngã, nặng. The child drags the right one onto the word (or taps it, then the word):
// the word becomes "cá" and a new picture comes. A wrong mark makes the word say something funny ("cà?")
// for a moment and the hat goes home; no penalty. Every tone comes up equally often. Words are whole
// Vietnamese words for things the child can see; the mark lands on the vowel the spelling rules put it on,
// because each word is stored with its mark and the bare word is made by taking it off. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Tone = 'sac' | 'huyen' | 'hoi' | 'nga' | 'nang';
export const TONES: readonly Tone[] = ['sac', 'huyen', 'hoi', 'nga', 'nang'];
/** The combining mark (NFD) of each tone. */
const MARK: Readonly<Record<Tone, string>> = { sac: '́', huyen: '̀', hoi: '̉', nga: '̃', nang: '̣' };
export const TONE_NAMES: Readonly<Record<Tone, string>> = { sac: 'sắc', huyen: 'huyền', hoi: 'hỏi', nga: 'ngã', nang: 'nặng' };

/** Words with their mark, each with a picture of what it names. */
export const WORDS: Readonly<Record<Tone, readonly { word: string; picture: SpriteName }[]>> = {
  sac: [
    { word: 'cá', picture: 'fish' },
    { word: 'gấu', picture: 'bear' },
    { word: 'cáo', picture: 'fox' },
    { word: 'cú', picture: 'owl' },
    { word: 'ếch', picture: 'frog' },
    { word: 'chó', picture: 'dog-face' },
    { word: 'ốc', picture: 'snail' },
    { word: 'lá', picture: 'leaf' },
    { word: 'bướm', picture: 'butterfly' },
    { word: 'bóng', picture: 'soccer-ball' },
  ],
  huyen: [
    { word: 'gà', picture: 'chicken' },
    { word: 'bò', picture: 'cow' },
    { word: 'mèo', picture: 'cat' },
    { word: 'rùa', picture: 'turtle' },
    { word: 'dừa', picture: 'coconut' },
    { word: 'nhà', picture: 'house' },
    { word: 'quà', picture: 'gift' },
  ],
  hoi: [
    { word: 'thỏ', picture: 'rabbit' },
    { word: 'khỉ', picture: 'monkey-face' },
    { word: 'giỏ', picture: 'basket' },
    { word: 'cỏ', picture: 'herb' },
    { word: 'lửa', picture: 'fire' },
  ],
  nga: [
    { word: 'sữa', picture: 'glass-of-milk' },
    { word: 'gỗ', picture: 'wood' },
    { word: 'đĩa', picture: 'flying-disc' },
    { word: 'bão', picture: 'cloud-with-lightning' },
  ],
  nang: [
    { word: 'vịt', picture: 'duck' },
    { word: 'kẹo', picture: 'candy' },
    { word: 'chuột', picture: 'mouse-face' },
    { word: 'đậu', picture: 'beans' },
    { word: 'lọ', picture: 'jar' },
  ],
};

const TONE_OF_MARK = new Map(TONES.map((t) => [MARK[t], t]));
const isCombining = (ch: string): boolean => /\p{M}/u.test(ch);

/** The word without its tone mark ("gấu" → "gâu"). */
export function bare(word: string): string {
  return [...word.normalize('NFD')].filter((ch) => !TONE_OF_MARK.has(ch)).join('').normalize('NFC');
}

/** The word with another tone, on the same vowel ("gấu", huyền → "gầu"). */
export function withTone(word: string, tone: Tone): string {
  const chars = [...word.normalize('NFD')];
  const at = chars.findIndex((ch) => TONE_OF_MARK.has(ch));
  if (at < 0) return word;
  const rest = chars.filter((_, i) => i !== at);
  // The vowel the mark belonged to, and the end of its own marks (a circumflex, a horn).
  let end = at;
  while (end < rest.length && isCombining(rest[end] ?? '')) end += 1;
  rest.splice(end, 0, MARK[tone]);
  return rest.join('').normalize('NFC');
}

export function toneOf(word: string): Tone | null {
  for (const ch of word.normalize('NFD')) {
    const tone = TONE_OF_MARK.get(ch);
    if (tone) return tone;
  }
  return null;
}

export interface Hat {
  tone: Tone;
  home: Point;
  /** Where it is drawn (follows the finger while dragged). */
  x: number;
  y: number;
}

export interface ToneMarkState {
  word: string;
  picture: SpriteName;
  /** What the card shows: the bare word, a funny wrong word, or the right one. */
  shown: string;
  /** 'ask' while the child chooses; 'wrong' and 'right' for a moment after a drop. */
  mood: 'ask' | 'wrong' | 'right';
  moodAgo: number;
  card: { x: number; y: number; w: number; h: number };
  pictureAt: Point;
  pictureSize: number;
  hats: Hat[];
  hatSize: number;
  /** The hat in the finger (dragged) or picked by a tap, or null. */
  held: Tone | null;
  dragging: boolean;
  /** When this word appeared (the bot reads a moment first). */
  askedAt: number;
  words: number;
  score: number;
  time: number;
}

const WRONG_SECONDS = 0.9;
const RIGHT_SECONDS = 0.9;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

export function createToneMark({ arena, rng }: GameSetup): MinigameLogic<ToneMarkState> {
  const events = eventQueue();
  const hatSize = Math.min(130, (arena.width - 40) / 5 - 12);
  const hatY = arena.height - hatSize / 2 - 46;
  const landscape = arena.width > arena.height * 1.15;
  // Landscape: the picture beside the card; portrait: the picture on the grass above it.
  const rowBottom = hatY - hatSize / 2 - 40;
  const rowH = rowBottom - HUD_SAFE_TOP - 20;
  const cardH = Math.min(150, landscape ? rowH * 0.55 : rowH * 0.4);
  const pictureSize = landscape ? Math.min(220, rowH) : Math.min(240, (rowH - cardH - 60) * 0.85);
  const cardW = Math.min(landscape ? arena.width - pictureSize - 130 : arena.width - 60, 420);
  const cardY = landscape ? rowBottom - (rowH + cardH) / 2 : rowBottom - cardH;
  const cardX = landscape ? arena.width / 2 - (pictureSize + 40 + cardW) / 2 + pictureSize + 40 : arena.width / 2 - cardW / 2;
  const pictureX = landscape ? cardX - 40 - pictureSize / 2 : arena.width / 2;
  const pictureY = landscape ? cardY + cardH / 2 : cardY - 40 - pictureSize / 2;
  const decks = new Map<Tone, { word: string; picture: SpriteName }[]>();
  let toneDeck: Tone[] = [];

  const state: ToneMarkState = {
    word: '',
    picture: 'fish',
    shown: '',
    mood: 'ask',
    moodAgo: 0,
    card: { x: cardX, y: cardY, w: cardW, h: cardH },
    pictureAt: { x: pictureX, y: pictureY },
    pictureSize,
    hats: TONES.map((tone, i) => {
      const home = { x: arena.width / 2 + (i - 2) * (hatSize + 12), y: hatY };
      return { tone, home, x: home.x, y: home.y };
    }),
    hatSize,
    held: null,
    dragging: false,
    askedAt: 0,
    words: 0,
    score: 0,
    time: 0,
  };

  function nextWord(): void {
    if (toneDeck.length === 0) toneDeck = shuffle([...TONES], rng);
    const tone = toneDeck.pop() ?? 'sac';
    let deck = decks.get(tone) ?? [];
    if (deck.length === 0) deck = shuffle([...WORDS[tone]], rng);
    const entry = deck.pop() ?? { word: 'cá', picture: 'fish' as SpriteName };
    decks.set(tone, deck);
    state.word = entry.word;
    state.picture = entry.picture;
    state.shown = bare(entry.word);
    state.mood = 'ask';
    state.moodAgo = 0;
    state.askedAt = state.time;
    state.words += 1;
  }
  nextWord();

  const hatAt = (p: Point): Hat | undefined => state.hats.find((h) => Math.abs(p.x - h.home.x) <= hatSize / 2 + 6 && Math.abs(p.y - h.home.y) <= hatSize / 2 + 6);
  /** The word's card, or its picture: a mark dropped on either goes on the word. */
  const onCard = (p: Point): boolean => {
    const { card, pictureAt, pictureSize: size } = state;
    const inCard = p.x >= card.x - 20 && p.x <= card.x + card.w + 20 && p.y >= card.y - 30 && p.y <= card.y + card.h + 20;
    return inCard || Math.hypot(p.x - pictureAt.x, p.y - pictureAt.y) <= size / 2 + 20;
  };
  const sendHome = (): void => {
    for (const h of state.hats) {
      h.x = h.home.x;
      h.y = h.home.y;
    }
    state.held = null;
    state.dragging = false;
  };

  function put(tone: Tone): void {
    sendHome();
    if (tone === toneOf(state.word)) {
      state.shown = state.word;
      state.mood = 'right';
      state.moodAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.pictureAt.x, y: state.card.y });
    } else {
      state.shown = withTone(state.word, tone);
      state.mood = 'wrong';
      state.moodAgo = 0;
      events.push({ type: 'miss', x: state.card.x + state.card.w / 2, y: state.card.y + state.card.h / 2 });
    }
  }

  let lastPointer: Point | null = null;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.moodAgo += dt;
      if (state.mood === 'right') {
        if (state.moodAgo >= RIGHT_SECONDS) nextWord();
        lastPointer = input.pointer;
        return;
      }
      if (state.mood === 'wrong' && state.moodAgo >= WRONG_SECONDS) {
        state.mood = 'ask';
        state.shown = bare(state.word);
      }
      // Drag: pick a hat up where the finger goes down, carry it, drop it on release.
      if (input.pressed && input.pointer) {
        const hat = hatAt(input.pointer);
        if (hat) {
          state.held = hat.tone;
          state.dragging = true;
        }
      }
      const held = state.hats.find((h) => h.tone === state.held);
      if (held && state.dragging && input.pointer) {
        held.x = input.pointer.x;
        held.y = input.pointer.y;
      }
      if (input.released && held && state.dragging) {
        const at = lastPointer ?? held.home;
        if (onCard(at)) put(held.tone);
        else {
          // Let go elsewhere (a tap on the hat included): it goes home and stays chosen for a tap on the word.
          held.x = held.home.x;
          held.y = held.home.y;
          state.dragging = false;
        }
      }
      // Taps: a hat, then the word.
      for (const p of input.taps) {
        const hat = hatAt(p);
        if (hat) {
          state.held = hat.tone;
          events.push({ type: 'action', x: hat.home.x, y: hat.home.y });
        } else if (state.held && onCard(p)) put(state.held);
      }
      lastPointer = input.pointer;
    },
  };
}

/** Good play: read the word a moment, then drag the right hat onto it. */
export function toneMarkBot(state: ToneMarkState, _context: BotContext): BotMove {
  if (state.mood !== 'ask' || state.time - state.askedAt < 0.5) return {};
  const tone = toneOf(state.word);
  const hat = state.hats.find((h) => h.tone === tone);
  if (!hat) return {};
  if (state.held !== tone || !state.dragging) return { touch: { ...hat.home } };
  if (Math.abs(hat.x - hat.home.x) < 1 && Math.abs(hat.y - hat.home.y) < 1) return { touch: { x: state.card.x + state.card.w / 2, y: state.card.y + state.card.h / 2 } };
  return {};
}
