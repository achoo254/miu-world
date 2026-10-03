import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKartRace, LAPS, MAX_SPEED, PLACE_POINTS } from './logic';

describeMinigame('kart-race');

describe('kart race rules', () => {
  const setup = () => createKartRace({ arena: { width: 863, height: 600 }, goal: 4, duration: 50, params: { rivals: 1 }, rng: createRng(1) });

  it('speeds up toward a held finger and coasts to a stop without one', () => {
    const game = setup();
    const k = game.state.player;
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: k.x - 200, y: k.y } });
    expect(k.speed).toBeGreaterThan(MAX_SPEED * 0.8);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(k.speed).toBe(0);
  });

  it('slows to half speed on the grass', () => {
    const game = setup();
    const k = game.state.player;
    k.y = game.state.cy;
    k.x = game.state.cx;
    k.speed = MAX_SPEED;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: k.x + 300, y: k.y } });
    expect(game.state.offTrack).toBe(true);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: k.x + 300, y: k.y } });
    expect(k.speed).toBeLessThanOrEqual(MAX_SPEED / 2 + 1);
  });

  it('scores the place and the stars at the finish, and nothing for last place stars', () => {
    const game = setup();
    game.state.starsTaken = 3;
    game.state.player.progress = LAPS - 0.0001;
    game.state.player.speed = MAX_SPEED;
    for (let i = 0; i < 5 && game.state.place === 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 0, y: game.state.player.y } });
    expect(game.state.place).toBe(1);
    expect(game.score).toBe(PLACE_POINTS[0] + 3);
    const late = setup();
    late.state.starsTaken = 3;
    for (const r of late.state.rivals) r.finishedAt = 1;
    late.state.player.progress = LAPS - 0.0001;
    late.state.player.speed = MAX_SPEED;
    for (let i = 0; i < 5 && late.state.place === 0; i += 1) late.step(1 / 60, { ...NO_INPUT, pointer: { x: 0, y: late.state.player.y } });
    expect(late.state.place).toBe(4);
    expect(late.score).toBe(PLACE_POINTS[3]);
  });
});
