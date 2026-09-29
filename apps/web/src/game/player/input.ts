// Player intent from keyboard, a minimal touch joystick + Run/Jump buttons, and mouse/touch drag
// to orbit the camera. Movement is camera-relative: x = strafe right, y = forward, both in [-1, 1].
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

export class PlayerInput implements InputSource {
  private readonly keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private runHeld = false;
  private jumpQueued = false;
  private look = { x: 0, y: 0 };
  private interactQueued = false;
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

  private bindLook(root: HTMLElement): void {
    let last: { x: number; y: number; id: number } | null = null;
    root.addEventListener('pointerdown', (e) => {
      // The canvas fills #app, so accept it; joystick and buttons handle their own pointers.
      if (e.target instanceof Element && e.target.closest('#joystick, #actions')) return;
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove', (e) => {
      if (!last || e.pointerId !== last.id) return;
      this.look.x += e.clientX - last.x;
      this.look.y += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    const end = (): void => {
      last = null;
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
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
