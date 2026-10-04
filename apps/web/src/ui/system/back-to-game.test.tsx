import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackToGame, lastPlay, rememberPlay } from './back-to-game';

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <BackToGame />
  </MemoryRouter>
);

describe('BackToGame', () => {
  it('stays away until a game was played, and never shows in the game itself', () => {
    render(at('/home'));
    expect(screen.queryByTestId('x')).toBeNull();
    expect(document.querySelector('[data-id="back-to-game"]')).toBeNull();
    rememberPlay('/play?region=truong-hoc&quest=toan2-cd1-b01');
    cleanup();
    render(at('/play?region=truong-hoc'));
    expect(document.querySelector('[data-id="back-to-game"]')).toBeNull();
  });

  it('returns to the game she was in, from Home, the map, a region', () => {
    rememberPlay('/play?region=truong-hoc&quest=toan2-cd1-b01');
    expect(lastPlay()).toBe('/play?region=truong-hoc&quest=toan2-cd1-b01');
    for (const path of ['/home', '/map', '/region/nong-trai']) {
      render(at(path));
      expect(document.querySelector('[data-id="back-to-game"]')?.getAttribute('href')).toBe('/play?region=truong-hoc&quest=toan2-cd1-b01');
      cleanup();
    }
  });

  it('ignores a saved address that is not a game', () => {
    window.sessionStorage.setItem('miu.lastPlay', '/parent');
    expect(lastPlay()).toBeNull();
  });
});
