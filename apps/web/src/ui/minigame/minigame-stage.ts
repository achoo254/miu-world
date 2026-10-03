// The canvas a round plays on: sized to its box at the device's pixel ratio, a fixed-step loop on
// requestAnimationFrame, one finger read from pointer events, the effects layer and the sounds. React only
// creates it and calls start / pause / resume / dispose; the score, clock and hearts are written straight
// into the HUD elements it is given (they change every frame, React never holds them).
import { playCue, playNote } from '../sound/sfx';
import { BOT_DECISION_STEPS, BotDriver } from './bot-driver';
import type { MinigameModule } from './define-minigame';
import { Effects, EVENT_SOUNDS } from './effects';
import { InputCollector } from './input';
import { MinigameRound, arenaFor, stepsForFrame, type RoundSetup } from './round';
import type { SpriteRef, Sprites } from './sprites';
import type { Theme } from './theme';
import type { Arena, DrawView, Point } from './types';

/** Pixel ratio cap: sharper than this costs battery for nothing a child can see. */
const MAX_PIXEL_RATIO = 2;
/** The same sound is not replayed within this many ms (ten stars at once make one sparkle, not ten). */
const SOUND_GAP_MS = 80;

export interface StageHud {
  score: HTMLElement | null;
  time: HTMLElement | null;
  lives: HTMLElement | null;
}

export interface StageOptions {
  /** The box the canvas fills. */
  host: HTMLElement;
  module: MinigameModule;
  goal: number;
  duration: number;
  params: RoundSetup['params'];
  seed: number;
  /** Hearts bought in the shop for this round (round.ts). */
  extraLives?: number;
  theme: Theme;
  sprites: Sprites;
  player: SpriteRef;
  reducedMotion: boolean;
  hud: StageHud;
  /** The game's bot plays (dev page demo, screenshots). */
  bot?: boolean;
  /** The round is over: its score and whether it reached the goal. */
  onFinish: (result: { score: number; won: boolean }) => void;
  /** Dev page screenshots: the round stops (no pause card) once this many seconds are played. */
  freezeAt?: number;
  onFreeze?: () => void;
}

export class MinigameStage {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly round: MinigameRound;
  private readonly arena: Arena;
  private readonly input: InputCollector;
  private readonly driver: BotDriver | null;
  private readonly effects: Effects;
  private readonly sounds = new Map<string, number>();
  private frame = 0;
  private last = 0;
  private carry = 0;
  private stepCount = 0;
  private running = false;
  private finished = false;
  private disposed = false;
  private shownScore = -1;
  private shownSeconds = -1;
  private shownLives = -1;
  /** Arena → CSS px: scale and offset (the arena keeps its shape when the screen turns). */
  private view = { scale: 1, x: 0, y: 0 };
  private pixelRatio = 1;
  private readonly cleanups: Array<() => void> = [];

  constructor(private readonly options: StageOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minigame-canvas';
    this.canvas.dataset.id = 'minigame-canvas';
    options.host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    const box = options.host.getBoundingClientRect();
    const { arena, pxPerUnit } = arenaFor(box.width, box.height);
    this.arena = arena;
    this.input = new InputCollector(pxPerUnit);
    this.driver = options.bot ? new BotDriver(this.input) : null;
    this.round = new MinigameRound(options.module, { arena, goal: options.goal, duration: options.duration, params: options.params, seed: options.seed, extraLives: options.extraLives });
    this.effects = new Effects(options.theme, options.reducedMotion);
    this.resize();
    this.listen();
    this.writeHud();
    this.loop(performance.now());
  }

  /** Tries the round has, or null when it has none (the HUD hides its hearts). */
  get lives(): number | null {
    return this.round.game.lives;
  }

  start(): void {
    this.running = true;
    this.last = performance.now();
  }

  pause(): void {
    this.running = false;
    this.input.cancel();
  }

  resume(): void {
    if (this.finished) return;
    this.running = true;
    this.last = performance.now();
    this.carry = 0;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    for (const cleanup of this.cleanups) cleanup();
    this.canvas.remove();
  }

  private resize(): void {
    const box = this.options.host.getBoundingClientRect();
    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    this.pixelRatio = ratio;
    this.canvas.width = Math.max(1, Math.round(box.width * ratio));
    this.canvas.height = Math.max(1, Math.round(box.height * ratio));
    const scale = Math.min(box.width / this.arena.width, box.height / this.arena.height);
    this.view = { scale, x: (box.width - this.arena.width * scale) / 2, y: (box.height - this.arena.height * scale) / 2 };
    this.input.setScale(scale);
  }

  private toArena(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left - this.view.x) / this.view.scale, y: (event.clientY - rect.top - this.view.y) / this.view.scale };
  }

  private listen(): void {
    let finger: number | null = null;
    const on = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (e: HTMLElementEventMap[K]) => void): void => {
      target.addEventListener(type, handler);
      this.cleanups.push(() => target.removeEventListener(type, handler));
    };
    on(this.canvas, 'pointerdown', (e) => {
      if (finger !== null || !this.running || this.driver) return;
      finger = e.pointerId;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.input.down(this.toArena(e), e.timeStamp);
      e.preventDefault();
    });
    on(this.canvas, 'pointermove', (e) => {
      if (e.pointerId === finger) this.input.move(this.toArena(e));
    });
    on(this.canvas, 'pointerup', (e) => {
      if (e.pointerId !== finger) return;
      finger = null;
      this.input.up(this.toArena(e), e.timeStamp);
    });
    on(this.canvas, 'pointercancel', (e) => {
      if (e.pointerId !== finger) return;
      finger = null;
      this.input.cancel();
    });
    on(this.canvas, 'contextmenu', (e) => e.preventDefault());
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.options.host);
    this.cleanups.push(() => observer.disconnect());
  }

  private play(cue: Parameters<typeof playCue>[0]): void {
    const now = performance.now();
    if (now - (this.sounds.get(cue) ?? -Infinity) < SOUND_GAP_MS) return;
    this.sounds.set(cue, now);
    playCue(cue);
  }

  private loop = (now: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const frameSeconds = (now - this.last) / 1000;
    this.last = now;
    if (this.running) {
      const { steps, carry } = stepsForFrame(this.carry, frameSeconds);
      this.carry = carry;
      for (let i = 0; i < steps && !this.round.finished; i += 1) {
        // Pointer events and the bot share one clock: the page's (performance.now, as event.timeStamp).
        if (this.driver && this.stepCount % BOT_DECISION_STEPS === 0) this.driver.apply(this.round.game.bot({ arena: this.arena, time: this.round.elapsed, goal: this.round.goal }), now);
        this.stepCount += 1;
        for (const event of this.round.step(this.input.take(now))) {
          this.effects.add(event);
          // A note sounds instead of the event's usual cue.
          if (event.note !== undefined) playNote(event.note, event.voice);
          else {
            const cue = EVENT_SOUNDS[event.type];
            if (cue) this.play(cue);
          }
        }
      }
      const { freezeAt, onFreeze } = this.options;
      if (freezeAt !== undefined && this.round.elapsed >= freezeAt && !this.round.finished) {
        this.running = false;
        onFreeze?.();
      }
      if (this.round.finished && !this.finished) {
        this.finished = true;
        this.running = false;
        const result = { score: this.round.score, won: this.round.won };
        // A beat to see the last catch before the result card.
        window.setTimeout(() => !this.disposed && this.options.onFinish(result), 700);
      }
    }
    this.effects.update(this.finished || this.running ? Math.min(frameSeconds, 0.1) : 0);
    this.writeHud();
    this.render();
  };

  private writeHud(): void {
    const { hud } = this.options;
    const score = this.round.score;
    if (score !== this.shownScore && hud.score) {
      hud.score.textContent = `${score}/${this.round.goal}`;
      // Restart the bump animation on every new point.
      if (this.shownScore >= 0) {
        hud.score.classList.remove('minigame-bump');
        void hud.score.offsetWidth;
        hud.score.classList.add('minigame-bump');
      }
    }
    this.shownScore = score;
    const seconds = Math.ceil(this.round.timeLeft);
    if (seconds !== this.shownSeconds && hud.time) {
      hud.time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      hud.time.dataset.low = seconds <= 5 ? 'true' : 'false';
    }
    this.shownSeconds = seconds;
    const lives = this.round.game.lives;
    if (lives !== null && lives !== this.shownLives && hud.lives) hud.lives.textContent = String(lives);
    this.shownLives = lives ?? -1;
  }

  private render(): void {
    const { ctx } = this;
    if (!ctx) return;
    const ratio = this.pixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.options.theme.ink;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const time = this.round.elapsed;
    const shake = this.effects.offset(performance.now() / 1000);
    const { scale, x, y } = this.view;
    ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * x + shake.x * ratio * scale, ratio * y + shake.y * ratio * scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.arena.width, this.arena.height);
    ctx.clip();
    const view: DrawView = { arena: this.arena, time, sprites: this.options.sprites, theme: this.options.theme, player: this.options.player, reducedMotion: this.options.reducedMotion };
    this.round.game.draw(ctx, view);
    this.effects.draw(ctx, view);
    ctx.restore();
  }
}
