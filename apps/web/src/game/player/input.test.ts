import { afterEach, describe, expect, it } from 'vitest';
import { PlayerInput } from './input';

const inputs: PlayerInput[] = [];
afterEach(() => {
  for (const input of inputs.splice(0)) input.dispose();
});

function create(root: HTMLElement = el()): PlayerInput {
  const input = new PlayerInput(root, el(), el(), el());
  inputs.push(input);
  return input;
}

function el(): HTMLDivElement {
  const div = document.createElement('div');
  document.body.append(div);
  return div;
}

describe('PlayerInput', () => {
  it('forgets E and Space pressed while paused, so resuming replays nothing', () => {
    const input = create();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    input.clear();
    const state = input.read();
    expect(state.interact).toBe(false);
    expect(state.jump).toBe(false);
  });

  it('leaves keys pressed in a dialog over the running game to the dialog', () => {
    const input = create();
    const dialog = el();
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.append(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    const state = input.read();
    expect(state.jump).toBe(false);
    expect(state.moveY).toBe(0);
    // A HUD button keeps focus after a click: the game's keys still work there.
    const hud = document.createElement('button');
    document.body.append(hud);
    hud.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(input.read().jump).toBe(true);
  });

  it('still reports a press made after resuming', () => {
    const input = create();
    input.clear();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    expect(input.read().interact).toBe(true);
  });

  it('cancels touchstart on the game layer, so holding a control never selects page text', () => {
    const root = el();
    const joystick = el();
    root.append(joystick);
    create(root);
    const touch = new Event('touchstart', { bubbles: true, cancelable: true });
    joystick.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(true);
  });

  it('zooms with the wheel and the + / − keys, and forgets zoom asked while paused', () => {
    const root = el();
    const input = create(root);
    root.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));
    expect(input.readZoom()).toBeGreaterThan(0);
    expect(input.readZoom()).toBe(0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Equal' }));
    expect(input.readZoom()).toBeLessThan(0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Minus' }));
    input.clear();
    expect(input.readZoom()).toBe(0);
  });

  it('pinches: fingers apart zoom in without turning the view, one finger still turns it', () => {
    const root = el();
    root.setPointerCapture = () => undefined;
    const input = create(root);
    const pointer = (type: string, id: number, x: number): void => {
      root.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: 100, bubbles: true }));
    };
    pointer('pointerdown', 1, 100);
    pointer('pointerdown', 2, 200);
    pointer('pointermove', 2, 300);
    const state = input.read();
    expect(input.readZoom()).toBeCloseTo(Math.log(100 / 200), 5);
    expect(state.lookX).toBe(0);
    pointer('pointerup', 2, 300);
    pointer('pointermove', 1, 130);
    expect(input.read().lookX).toBe(30);
  });
});
