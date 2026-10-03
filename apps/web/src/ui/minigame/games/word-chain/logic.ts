// Word chain (nối từ): a little dragon made of word cards. The last word's second sound must be the next
// word's first ("gấu bông → bông hoa → hoa quả"). The child taps the right one of three picture cards: it flies
// onto the dragon's tail (a point). A wrong card flies off and the cards rest a moment; no penalty. When no
// word can follow, the dragon flies away and a new one starts. Every word has a picture. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Word {
  text: string;
  picture: SpriteName;
}

/** Two-sound words a child of seven knows, each with a picture; chains form where a word's end starts another. */
export const WORDS: readonly Word[] = [
  { text: 'gấu bông', picture: 'teddy-bear' },
  { text: 'bông hoa', picture: 'tulip' },
  { text: 'bông tuyết', picture: 'snowflake' },
  { text: 'hoa quả', picture: 'red-apple' },
  { text: 'hoa sen', picture: 'lotus' },
  { text: 'quả bóng', picture: 'soccer-ball' },
  { text: 'quả trứng', picture: 'egg' },
  { text: 'quả dứa', picture: 'pineapple' },
  { text: 'quả chuối', picture: 'banana' },
  { text: 'trứng gà', picture: 'hatching-chick' },
  { text: 'gà con', picture: 'baby-chick' },
  { text: 'gà trống', picture: 'chicken' },
  { text: 'con mèo', picture: 'cat' },
  { text: 'mèo con', picture: 'cat-face' },
  { text: 'con cá', picture: 'fish' },
  { text: 'cá heo', picture: 'dolphin' },
  { text: 'cá vàng', picture: 'tropical-fish' },
  { text: 'con ong', picture: 'honeybee' },
  { text: 'ong mật', picture: 'sunflower' },
  { text: 'mật ong', picture: 'jar' },
  { text: 'con thỏ', picture: 'rabbit' },
  { text: 'con khỉ', picture: 'monkey' },
  { text: 'con rùa', picture: 'turtle' },
  { text: 'con vịt', picture: 'duck' },
  { text: 'con thuyền', picture: 'canoe' },
  { text: 'thuyền buồm', picture: 'sailboat' },
  { text: 'bóng đá', picture: 'goal-net' },
  { text: 'bóng bay', picture: 'balloon' },
  { text: 'bóng đèn', picture: 'light-bulb' },
  { text: 'đá cầu', picture: 'badminton' },
  { text: 'cầu vồng', picture: 'rainbow' },
  { text: 'bay cao', picture: 'kite' },
  { text: 'máy bay', picture: 'airplane' },
  { text: 'đèn lồng', picture: 'red-paper-lantern' },
  { text: 'lồng đèn', picture: 'star' },
  { text: 'đèn pin', picture: 'flashlight' },
  { text: 'xe đạp', picture: 'bicycle' },
  { text: 'đạp xe', picture: 'running-shoe' },
  { text: 'xe buýt', picture: 'bus' },
  { text: 'xô nước', picture: 'bucket' },
  { text: 'nước mưa', picture: 'droplet' },
  { text: 'nước chanh', picture: 'lemon' },
  { text: 'mưa rào', picture: 'cloud' },
  { text: 'mặt trời', picture: 'sun' },
  { text: 'trời mưa', picture: 'cloud-with-lightning' },
  { text: 'bò sữa', picture: 'cow' },
  { text: 'sữa bò', picture: 'glass-of-milk' },
  { text: 'hộp quà', picture: 'gift' },
  { text: 'quà tặng', picture: 'party-popper' },
  { text: 'nốt nhạc', picture: 'musical-note' },
  { text: 'nhạc cụ', picture: 'drum' },
  { text: 'lá cây', picture: 'leaf' },
  { text: 'cây thông', picture: 'evergreen-tree' },
  { text: 'cây dừa', picture: 'palm-tree' },
];

export const firstSound = (w: Word): string => w.text.split(' ')[0] ?? '';
export const lastSound = (w: Word): string => w.text.split(' ').at(-1) ?? '';

export interface Card extends Word {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Seconds since it was chosen (flying to the dragon, or off when wrong), -1 while it waits. */
  goneAgo: number;
  right: boolean;
}

export interface WordChainState {
  /** The dragon's words, head first. */
  dragon: Word[];
  options: Card[];
  /** Seconds the cards rest after a wrong pick. */
  rest: number;
  /** Seconds since the dragon was finished and flew away (-1 while growing). */
  flewAgo: number;
  /** Seconds since the last word joined (the tail wiggles). */
  grewAgo: number;
  dragons: number;
  /** When the current cards were dealt (the bot reads a moment first). */
  dealtAt: number;
  /** Where the dragon's row is. */
  dragonY: number;
  score: number;
  time: number;
}

const FLY_SECONDS = 0.5;
const REST_SECONDS = 0.6;
const FLY_AWAY_SECONDS = 1.4;

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

/** Words that may follow `tail` and are not in the dragon yet. */
export function followers(tail: Word, used: readonly Word[]): Word[] {
  return WORDS.filter((w) => firstSound(w) === lastSound(tail) && !used.includes(w));
}

export function createWordChain({ arena, rng }: GameSetup): MinigameLogic<WordChainState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const cardW = Math.min(250, (arena.width - 60) / 3 - 14);
  const cardH = Math.min(landscape ? 170 : 200, cardW * 0.9);
  const optionsY = arena.height - cardH - 30;
  const state: WordChainState = {
    dragon: [],
    options: [],
    rest: 0,
    flewAgo: -1,
    grewAgo: 9,
    dragons: 0,
    dealtAt: 0,
    dragonY: landscape ? HUD_SAFE_TOP + 95 : Math.min(HUD_SAFE_TOP + 220, (HUD_SAFE_TOP + optionsY) / 2),
    score: 0,
    time: 0,
  };

  function deal(): void {
    const tail = state.dragon.at(-1);
    const next = tail ? followers(tail, state.dragon) : [];
    const answer = next.length > 0 ? next[rng.int(0, next.length - 1)] : undefined;
    if (!tail || !answer) return;
    const others = shuffle(
      WORDS.filter((w) => firstSound(w) !== lastSound(tail) && !state.dragon.includes(w)),
      rng,
    ).slice(0, 2);
    const words = shuffle([answer, ...others], rng);
    state.options = words.map((w, i) => ({ ...w, x: arena.width / 2 + (i - 1) * (cardW + 18) - cardW / 2, y: optionsY, w: cardW, h: cardH, goneAgo: -1, right: w === answer }));
    state.dealtAt = state.time;
  }

  function newDragon(): void {
    const starts = WORDS.filter((w) => followers(w, [w]).length > 0);
    const first = starts[rng.int(0, starts.length - 1)] ?? WORDS[0];
    state.dragon = first ? [first] : [];
    state.flewAgo = -1;
    state.dragons += 1;
    deal();
  }
  newDragon();

  function tap(p: Point): void {
    if (state.rest > 0 || state.flewAgo >= 0) return;
    const card = state.options.find((c) => c.goneAgo < 0 && p.x >= c.x - 8 && p.x <= c.x + c.w + 8 && p.y >= c.y - 8 && p.y <= c.y + c.h + 8);
    if (!card) return;
    card.goneAgo = 0;
    if (card.right) {
      state.score += 1;
      events.push({ type: 'score', x: card.x + card.w / 2, y: card.y });
    } else {
      state.rest = REST_SECONDS;
      events.push({ type: 'miss', x: card.x + card.w / 2, y: card.y + card.h / 2 });
    }
  }

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
      state.grewAgo += dt;
      state.rest = Math.max(0, state.rest - dt);
      for (const c of state.options) if (c.goneAgo >= 0) c.goneAgo += dt;
      if (state.flewAgo >= 0) {
        state.flewAgo += dt;
        if (state.flewAgo >= FLY_AWAY_SECONDS) newDragon();
        return;
      }
      // A right card has landed on the tail: the dragon grows, then new cards (or it flies off when complete).
      const landed = state.options.find((c) => c.right && c.goneAgo >= FLY_SECONDS);
      if (landed) {
        const word = WORDS.find((w) => w.text === landed.text);
        if (word) state.dragon.push(word);
        state.grewAgo = 0;
        state.options = [];
        const tail = state.dragon.at(-1);
        if (!tail || followers(tail, state.dragon).length === 0) {
          state.flewAgo = 0;
          events.push({ type: 'action', x: arena.width / 2, y: state.dragonY, note: 79, voice: 'whistle' });
        } else deal();
        return;
      }
      state.options = state.options.filter((c) => c.right || c.goneAgo < FLY_SECONDS);
      for (const p of input.taps) tap(p);
    },
  };
}

/** Good play: reads the cards a moment, then taps the word that starts with the tail's sound. */
export function wordChainBot(state: WordChainState, _context: BotContext): BotMove {
  if (state.flewAgo >= 0 || state.rest > 0 || state.time - state.dealtAt < 1) return {};
  const card = state.options.find((c) => c.right && c.goneAgo < 0);
  return card ? { tap: { x: card.x + card.w / 2, y: card.y + card.h / 2 } } : {};
}
