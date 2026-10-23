import { afterEach, describe, expect, it, vi } from 'vitest';
import { backAction, pressBack, type BackButtonDeps } from './back-button';

function dialog(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  document.body.append(el);
  return el;
}

function deps(pathname: string, overrides: Partial<BackButtonDeps> = {}): BackButtonDeps {
  return { root: document, view: window, pathname: () => pathname, historyBack: vi.fn(), confirmExit: vi.fn(() => true), exitApp: vi.fn(), ...overrides };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('Android Back button', () => {
  it('closes the dialog on top first, with the Esc the dialog already understands', () => {
    dialog();
    const top = dialog();
    const keys: string[] = [];
    top.addEventListener('keydown', (e) => keys.push(e.key));
    const d = deps('/home');
    pressBack(d);
    expect(keys).toEqual(['Escape']);
    expect(d.historyBack).not.toHaveBeenCalled();
    expect(d.exitApp).not.toHaveBeenCalled();
  });

  it('opens the pause menu in the game (Esc to the window)', () => {
    expect(backAction(document, '/play', window)).toEqual({ kind: 'escape', target: window });
    const onKey = vi.fn();
    window.addEventListener('keydown', onKey);
    pressBack(deps('/play'));
    window.removeEventListener('keydown', onKey);
    expect(onKey).toHaveBeenCalledTimes(1);
  });

  it('goes back one screen elsewhere', () => {
    const d = deps('/backpack');
    pressBack(d);
    expect(d.historyBack).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving the app from the first screens, and stays when she says no', () => {
    for (const path of ['/', '/home', '/login']) expect(backAction(document, path, window)).toEqual({ kind: 'confirm-exit' });
    const stay = deps('/home', { confirmExit: vi.fn(() => false) });
    pressBack(stay);
    expect(stay.exitApp).not.toHaveBeenCalled();
    const leave = deps('/home');
    pressBack(leave);
    expect(leave.exitApp).toHaveBeenCalledTimes(1);
  });
});
