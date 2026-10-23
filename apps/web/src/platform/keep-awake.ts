// The screen stays on while she plays in the app (a game is watched, not touched, for long stretches: a reading, a
// party waiting). Nothing on the web, where the browser decides.
import { NATIVE_APP } from './endpoints';

/** Keeps the phone's screen on until the returned release is called. */
export function keepScreenOn(): () => void {
  if (!NATIVE_APP) return () => undefined;
  let held = true;
  const plugin = import('@capacitor-community/keep-awake').then((module) => module.KeepAwake);
  const warn = (): void => console.warn('keep-awake unavailable');
  plugin.then((keepAwake) => (held ? keepAwake.keepAwake() : undefined)).catch(warn);
  return () => {
    held = false;
    plugin.then((keepAwake) => keepAwake.allowSleep()).catch(warn);
  };
}
