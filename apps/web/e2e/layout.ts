// Facts about a screen's layout, read from the DOM when a review picture is taken (screens.spec.ts): hints for the
// one who looks at the picture, never assertions. What a child would see as broken: a control off the screen, two
// controls over one another, an open panel with no way to close it, text cut off, a translation key on screen.
import type { Page } from '@playwright/test';

export interface LayoutFacts {
  /** Controls drawn on top whose box reaches past the screen's edge. */
  offScreen: string[];
  /** Pairs of controls drawn on top whose boxes cross. */
  overlaps: string[];
  /** Open panels or scenes with no close or back control in sight. */
  missingClose: string[];
  /** Elements whose own text is cut off by their box. */
  clipped: string[];
  /** Text that looks like a translation key (`common.close`). */
  rawText: string[];
  /** Controls on top that are smaller than a fingertip (44 px). */
  small: string[];
}

/** Reads the facts of the screen as it is now. */
export function layoutFacts(page: Page): Promise<LayoutFacts> {
  return page.evaluate(() => {
    const view = { width: window.innerWidth, height: window.innerHeight };
    const name = (el: Element): string => {
      const id = el.getAttribute('data-id');
      if (id) return `[data-id="${id}"]`;
      const label = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? '';
      return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''}${label ? ` "${label}"` : ''}`;
    };
    const shown = (el: Element): boolean => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
      // Drawn on top: what lies at its centre (inside the screen) is it or part of it.
      const cx = Math.min(Math.max(r.x + r.width / 2, 0), view.width - 1);
      const cy = Math.min(Math.max(r.y + r.height / 2, 0), view.height - 1);
      const top = document.elementFromPoint(cx, cy);
      return top !== null && (top === el || el.contains(top));
    };
    const controls = [...document.querySelectorAll('button, a[href], [role="button"], input, select, textarea, [data-id="hud-interact"]')].filter(shown);
    const boxes = controls.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const offScreen = boxes.filter(({ r }) => r.left < -1 || r.top < -1 || r.right > view.width + 1 || r.bottom > view.height + 1).map(({ el, r }) => `${name(el)} at ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`);
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        if (!a || !b || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.r.left + 1 < b.r.right && b.r.left + 1 < a.r.right && a.r.top + 1 < b.r.bottom && b.r.top + 1 < a.r.bottom) overlaps.push(`${name(a.el)} × ${name(b.el)}`);
      }
    }
    const small = boxes.filter(({ r }) => r.width < 44 && r.height < 44).map(({ el, r }) => `${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    const closers = '[data-id$="-close"], .scene-close, [data-id$="-back"], [data-id="dialogue-next"], [data-id="completion-next"], [data-id="notebook-done"]';
    const panels = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"], .scene-modal')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
    });
    const missingClose = panels.filter((p) => ![...p.querySelectorAll(closers)].some(shown) && !p.closest('[role="dialog"]')?.querySelector(closers)).map(name);
    const clipped: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      if (clipped.length >= 20) break;
      if (![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0)) continue;
      const style = getComputedStyle(el);
      const cuts = (o: string): boolean => o === 'hidden' || o === 'clip';
      if ((cuts(style.overflowX) && el.scrollWidth > el.clientWidth + 1) || (cuts(style.overflowY) && el.scrollHeight > el.clientHeight + 1) || style.textOverflow === 'ellipsis') {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) clipped.push(`${name(el)} shows ${el.clientWidth}×${el.clientHeight} of ${el.scrollWidth}×${el.scrollHeight}`);
      }
    }
    const rawText: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n !== null && rawText.length < 20; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim();
      if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(text) && !/^\d/.test(text) && n.parentElement && shown(n.parentElement)) rawText.push(text);
    }
    return { offScreen, overlaps, missingClose, clipped, rawText, small };
  });
}
