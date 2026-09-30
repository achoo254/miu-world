import { afterEach, describe, expect, it } from 'vitest';
import { PlayerInput } from './input';

const inputs: PlayerInput[] = [];
afterEach(() => {
  for (const input of inputs.splice(0)) input.dispose();
});

function create(): PlayerInput {
  const el = () => {
    const div = document.createElement('div');
    document.body.append(div);
    return div;
  };
  const input = new PlayerInput(el(), el(), el(), el());
  inputs.push(input);
  return input;
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

  it('still reports a press made after resuming', () => {
    const input = create();
    input.clear();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    expect(input.read().interact).toBe(true);
  });
});
