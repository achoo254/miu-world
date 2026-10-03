// Player intent from keyboard, a minimal touch joystick + Run/Jump buttons, mouse/touch drag to orbit the
// camera, and zoom (mouse wheel, two-finger pinch, + / − keys). Movement is camera-relative: x = strafe right, y = forward, both in [-1, 1].
export interface InputState {
  moveX: number;
  moveY: number;
  run: boolean;
  jump: boolean;
  /** Accumulated look drag since the last read, in pixels. */
  lookX: number;
  lookY: number;
  /** Interact key (E) pressed since the last read. */
  interact: boolean;
}

export interface InputSource {
  read(): InputState;
}

const KEYS_FORWARD = ['KeyW', 'ArrowUp'];
const KEYS_BACK = ['KeyS', 'ArrowDown'];
const KEYS_LEFT = ['KeyA', 'ArrowLeft'];
const KEYS_RIGHT = ['KeyD', 'ArrowRight'];
const KEYS_ZOOM_IN = ['Equal', 'NumpadAdd'];
const KEYS_ZOOM_OUT = ['Minus', 'NumpadSubtract'];
/** Zoom per wheel pixel, and per + / − press (log scale of the camera distance). */
const ZOOM_PER_WHEEL_PX = 0.0015;
const ZOOM_PER_KEY = 0.15;

export class PlayerInput implements InputSource {
  private readonly keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private runHeld = false;
  private jumpQueued = false;
  private look = { x: 0, y: 0 };
  private interactQueued = false;
  /** Zoom gathered since the last `readZoom` (log scale: + farther). */
  private zoomed = 0;
  /** Window listeners outlive the game DOM, so they are removed explicitly on dispose. */
  private readonly listeners = new AbortController();

  constructor(root: HTMLElement, joystick: HTMLElement, runButton: HTMLElement, jumpButton: HTMLElement) {
    const signal = this.listeners.signal;
    window.addEventListener(
      'keydown',
      (e) => {
        this.keys.add(e.code);
        if (e.code === 'Space') this.jumpQueued = true;
        if (e.code === 'KeyE') this.interactQueued = true;
        if (KEYS_ZOOM_IN.includes(e.code)) this.zoomed -= ZOOM_PER_KEY;
        if (KEYS_ZOOM_OUT.includes(e.code)) this.zoomed += ZOOM_PER_KEY;
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), { signal });
    window.addEventListener('blur', () => this.keys.clear(), { signal });
    this.bindJoystick(joystick);
    this.bindHold(runButton, (held) => (this.runHeld = held));
    this.bindHold(jumpButton, (held) => {
      if (held) this.jumpQueued = true;
    });
    this.bindLook(root);
    // iOS WebKit still runs its long-press gesture after pointerdown's preventDefault: holding the
    // joystick or a button selects the nearest page text (the HUD) and opens the copy menu.
    // Cancelling touchstart stops that gesture; pointer events keep firing.
    root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false, signal });
  }

  /**
   * Forgets keys and presses gathered while the game was paused (E or Space pressed on a dialog),
   * so resuming never replays them as an interaction or a jump.
   */
  clear(): void {
    this.keys.clear();
    this.jumpQueued = false;
    this.interactQueued = false;
    this.look = { x: 0, y: 0 };
    this.zoomed = 0;
  }

  /** Zoom asked for since the last call (log scale of the camera distance: + farther, − closer). */
  readZoom(): number {
    const zoom = this.zoomed;
    this.zoomed = 0;
    return zoom;
  }

  private bindHold(el: HTMLElement, onChange: (held: boolean) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
      onChange(true);
    });
    const release = (): void => {
      el.classList.remove('active');
      onChange(false);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  private bindJoystick(el: HTMLElement): void {
    const knob = el.querySelector<HTMLElement>('.knob');
    let origin: { x: number; y: number } | null = null;
    const radius = 48;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    el.addEventListener('pointermove', (e) => {
      if (!origin) return;
      let dx = e.clientX - origin.x;
      let dy = e.clientY - origin.y;
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      this.stick = { x: dx / radius, y: -dy / radius };
      if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const reset = (): void => {
      origin = null;
      this.stick = { x: 0, y: 0 };
      if (knob) knob.style.transform = '';
    };
    el.addEventListener('pointerup', reset);
    el.addEventListener('pointercancel', reset);
  }

  /** One finger or the mouse drags the view round; two fingers pinch it in and out; the wheel zooms. */
  private bindLook(root: HTMLElement): void {
    const signal = this.listeners.signal;
    const pointers = new Map<number, { x: number; y: number }>();
    const spread = (): number => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    root.addEventListener('pointerdown', (e) => {
      // The canvas fills #app, so accept it; joystick and buttons handle their own pointers.
      if (e.target instanceof Element && e.target.closest('#joystick, #actions')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove', (e) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      if (pointers.size >= 2) {
        // A pinch: fingers apart brings the camera closer, together takes it farther.
        const before = spread();
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const after = spread();
        if (before > 0 && after > 0) this.zoomed += Math.log(before / after);
        return;
      }
      this.look.x += e.clientX - last.x;
      this.look.y += e.clientY - last.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    const end = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        // Lines (Firefox) are about 16 px each.
        this.zoomed += e.deltaY * (e.deltaMode === 1 ? 16 : 1) * ZOOM_PER_WHEEL_PX;
      },
      { passive: false, signal },
    );
  }

  read(): InputState {
    const has = (codes: string[]): boolean => codes.some((c) => this.keys.has(c));
    let x = this.stick.x + (has(KEYS_RIGHT) ? 1 : 0) - (has(KEYS_LEFT) ? 1 : 0);
    let y = this.stick.y + (has(KEYS_FORWARD) ? 1 : 0) - (has(KEYS_BACK) ? 1 : 0);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const state: InputState = {
      moveX: x,
      moveY: y,
      run: this.runHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.y) > 0.95,
      jump: this.jumpQueued,
      lookX: this.look.x,
      lookY: this.look.y,
      interact: this.interactQueued,
    };
    this.jumpQueued = false;
    this.interactQueued = false;
    this.look = { x: 0, y: 0 };
    return state;
  }

  dispose(): void {
    this.listeners.abort();
  }
}
