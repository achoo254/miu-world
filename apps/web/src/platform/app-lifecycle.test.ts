import { describe, expect, it, vi } from 'vitest';
import { AppVisibility, type VisibilitySource } from './app-lifecycle';

function fakePage(): VisibilitySource & { set(state: DocumentVisibilityState): void } {
  let state: DocumentVisibilityState = 'visible';
  const listeners: Array<() => void> = [];
  return {
    get visibilityState() {
      return state;
    },
    addEventListener: (_type, listener) => listeners.push(listener),
    set(next) {
      state = next;
      for (const listener of listeners) listener();
    },
  };
}

describe('app visibility', () => {
  it('follows the page visibility on the web', () => {
    const page = fakePage();
    const visibility = new AppVisibility(page);
    const seen: boolean[] = [];
    visibility.subscribe(() => seen.push(visibility.hidden()));
    page.set('hidden');
    page.set('visible');
    expect(seen).toEqual([true, false]);
  });

  it('counts the app going to the background even when the WebView keeps the page visible', () => {
    const visibility = new AppVisibility(fakePage());
    const listener = vi.fn();
    visibility.subscribe(listener);
    visibility.setNativeHidden(true);
    expect(visibility.hidden()).toBe(true);
    visibility.setNativeHidden(true);
    visibility.setNativeHidden(false);
    expect(visibility.hidden()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('tells once when the page and the app both say it went away', () => {
    const page = fakePage();
    const visibility = new AppVisibility(page);
    const listener = vi.fn();
    visibility.subscribe(listener);
    page.set('hidden');
    visibility.setNativeHidden(true);
    expect(listener).toHaveBeenCalledTimes(1);
    visibility.setNativeHidden(false);
    expect(visibility.hidden()).toBe(true); // the page is still hidden
    expect(listener).toHaveBeenCalledTimes(1);
    page.set('visible');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops calling a listener after it unsubscribes', () => {
    const page = fakePage();
    const visibility = new AppVisibility(page);
    const listener = vi.fn();
    const off = visibility.subscribe(listener);
    off();
    page.set('hidden');
    expect(listener).not.toHaveBeenCalled();
  });
});
