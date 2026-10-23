// The Android Back button in the app (iPhone has none). It does what Esc does on a keyboard, from the top down: it
// closes the dialog on top (ui/kit/modal.tsx closes on Esc when it can be closed), in the game it opens the pause menu
// (play-screen.tsx), on any other screen it goes back one screen, and on the first screens it asks before leaving.

/** Screens Back leaves the app from (after asking): the start, Home and sign-in. */
const EXIT_PATHS = new Set(['/', '/home', '/login']);
const GAME_PATH = '/play';
const OPEN_DIALOGS = '[role="dialog"][aria-modal="true"]';

export type BackAction = { kind: 'escape'; target: EventTarget } | { kind: 'history-back' } | { kind: 'confirm-exit' };

/** What Back does on `pathname`, with the dialogs open in `root`. */
export function backAction(root: ParentNode & EventTarget, pathname: string, view: EventTarget): BackAction {
  const dialogs = root.querySelectorAll<HTMLElement>(OPEN_DIALOGS);
  const top = dialogs[dialogs.length - 1];
  if (top) return { kind: 'escape', target: top };
  if (pathname === GAME_PATH) return { kind: 'escape', target: view };
  if (EXIT_PATHS.has(pathname)) return { kind: 'confirm-exit' };
  return { kind: 'history-back' };
}

export interface BackButtonDeps {
  root: ParentNode & EventTarget;
  view: EventTarget;
  pathname: () => string;
  historyBack: () => void;
  confirmExit: () => boolean;
  exitApp: () => void;
}

/** Runs one press of Back. */
export function pressBack(deps: BackButtonDeps): void {
  const action = backAction(deps.root, deps.pathname(), deps.view);
  switch (action.kind) {
    case 'escape':
      action.target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      return;
    case 'history-back':
      deps.historyBack();
      return;
    case 'confirm-exit':
      if (deps.confirmExit()) deps.exitApp();
  }
}
