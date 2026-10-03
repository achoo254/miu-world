import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createChopsticks, TIP_OFFSET } from './logic';

describeMinigame('chopsticks');

describe('chopsticks rules', () => {
  const setup = () => createChopsticks({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(1) });

  it('picks a bean up on a press and scores it in the bowl', () => {
    const game = setup();
    const bean = game.state.beans[0];
    if (!bean) throw new Error('no bean');
    let finger = { x: bean.x, y: bean.y + TIP_OFFSET };
    game.step(1 / 60, { ...NO_INPUT, pointer: finger, pressed: true });
    expect(game.state.held).not.toBeNull();
    const { bowl } = game.state;
    for (let i = 0; i < 300; i += 1) {
      const tip = game.state.tip ?? bean;
      const dx = bowl.x - tip.x;
      const dy = bowl.y - tip.y;
      const d = Math.hypot(dx, dy);
      if (d < 5) break;
      finger = { x: tip.x + (dx / d) * Math.min(d, 4), y: tip.y + (dy / d) * Math.min(d, 4) + TIP_OFFSET };
      game.step(1 / 60, { ...NO_INPUT, pointer: finger });
    }
    expect(game.state.held).not.toBeNull();
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
  });

  it('lets the bean slip when the hand moves too fast', () => {
    const game = setup();
    const bean = game.state.beans[0];
    if (!bean) throw new Error('no bean');
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: bean.x, y: bean.y + TIP_OFFSET }, pressed: true });
    for (let i = 1; i < 10; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: bean.x + i * 30, y: bean.y + TIP_OFFSET } });
    expect(game.state.held).toBeNull();
    expect(game.drainEvents().some((e) => e.type === 'miss')).toBe(true);
  });
});
