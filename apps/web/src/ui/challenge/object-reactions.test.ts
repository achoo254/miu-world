import { afterEach, describe, expect, it } from 'vitest';
import { GULP, LANDED, watchLandings } from './object-reactions';

const zone = (id: string): HTMLElement => {
  const el = document.createElement('div');
  el.setAttribute('data-drop-zone', id);
  return el;
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('object reactions', () => {
  it('pops in a piece that lands in a basket and lets the basket gulp it', async () => {
    const area = document.createElement('div');
    const basket = zone('container');
    area.append(basket);
    document.body.append(area);
    const stop = watchLandings(area);
    const apple = document.createElement('button');
    basket.append(apple);
    await flush();
    expect(apple.classList.contains(LANDED)).toBe(true);
    expect(basket.classList.contains(GULP)).toBe(true);
    stop();
  });

  it('does not celebrate a piece going back to the pool it started in', async () => {
    const area = document.createElement('div');
    const pool = zone('source');
    area.append(pool);
    document.body.append(area);
    const stop = watchLandings(area);
    const apple = document.createElement('button');
    pool.append(apple);
    await flush();
    expect(apple.classList.contains(LANDED)).toBe(false);
    expect(pool.classList.contains(GULP)).toBe(false);
    stop();
  });
});
