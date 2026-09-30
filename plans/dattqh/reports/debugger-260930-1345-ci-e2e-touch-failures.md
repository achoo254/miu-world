# CI E2E: three touch specs fail on Linux, pass on macOS

Date: 2026-09-30. Runs: 36678999294 (68f9d16), 36679821684 (1a82fec). Scope tier: S (one test helper).

## Outcome

One shared cause, in the test harness, not the app. The synthetic touch drag in `apps/web/e2e/touch.ts`
lifts the finger in the same instant as its last 70 px step, which Chromium reads as a fling. On Linux
(Aura) Chromium suppresses the tap of the next touch that stops a fling, so the first tap after every
drag produced no `click`. The fix makes the finger rest on the target before lifting, as a real drop does.
No assertion was changed.

## Evidence

- Pattern in all three failures (both attempts, both runs; deterministic): the **first** tap after a
  `touchDrag` loses its click; the tap after that works.
  - challenges.spec.ts:25: trace DOM snapshots never show `drag-piece--selected` after the tap on
    `piece-apple-11` (taps landed at the right coordinates, x=96 y=476). The basket tap then has nothing to drop, so the count stays 10.
  - mvp-loop.spec.ts:151: tap on `challenge-check` at t=353696; the network trace has **no** POST to
    `.../steps/apples.../complete` afterwards. The check button is a plain button outside the drag hook.
  - sgk-mechanics.spec.ts:48: tap on `card-but` right after two drags; no snapshot shows
    `classify-card--selected`, the card stays unplaced, `canCheck={unplaced.length === 0}` keeps Check
    disabled, and no classify POST is sent, so the next dialog never appears.
- Chromium source (main):
  - `components/input/input_router_impl.cc` `SendGestureEvent`: `PassToFlingController` runs **before**
    `touch_action_filter_.FilterGestureEvent`, so `touch-action: none` on the tile does not stop a fling.
  - `components/input/fling_controller.cc` + `tap_suppression_controller.cc`: a GestureFlingCancel that
    stops a fling suppresses the next GestureTapDown/GestureTap within `max_cancel_to_down_time` (400 ms).
  - `ui/events/gesture_detection/gesture_configuration_aura.cc`: `set_fling_touchscreen_tap_suppression_enabled(true)`;
    the default (macOS) keeps it `false`. This is the Linux-only difference.
  - `ui/events/velocity_tracker/velocity_tracker.cc`: `kAssumePointerUpStoppedTimeMs = 80`: a touch-up
    at least 80 ms after the last move clears velocity, so no fling starts.
- macOS probe (scratch script, CDP drag then `page.touchscreen.tap`): the click fires with or without a
  hold, which matches the tests passing locally.

## Hypotheses eliminated

- Drop target not laid out / no pointermove before pointerup: all 10 drags were counted (count=10
  passed), and tap coordinates were read after the re-render.
- `justDragged` / `stopPropagation` in `usePointerDrag`: cannot explain the lost click on the Check
  button, which does not use the hook. The tiles also never reached `onTap` because no click arrived.
- Slow CPU / software GL: the failure is deterministic across retries and runs, and it follows the
  gesture configuration, not timing jitter.

## Fix

`apps/web/e2e/touch.ts`: `touchDrag` holds still on the target for `HOLD_BEFORE_LIFT_MS = 120` (above
Chromium's 80 ms stopped threshold) before `touchEnd`. This is part of the gesture's shape, not a wait
for app state. It adds about 3 s across the suite.

## Verification (macOS)

- `pnpm --filter @miu/web e2e:ci`: 31 passed (1.8m), 0 failed.
- `pnpm typecheck`: exit 0. `pnpm lint` (`eslint . --max-warnings=0`): exit 0.
- No `apps/web/src` change, so vitest and web build were not needed.
- Not yet verified on Linux: the next CI push is the proof. This machine has no Docker or Linux VM.

## Second finding: register rate-limit budget (not fixed, outside file boundary)

Run 36679821684 also failed `worksheets` and `speak` with 429 on `/api/auth/register`. The limit is
`registerLimitPerHour: 10` per IP (`apps/server/src/config.ts:107`, hard-coded, no env override). A
green run makes exactly 10 registrations (setup 1, creator 1, quest-flow 3, challenges 2,
sgk-mechanics 1, worksheets 1, speak 1). The two retries of challenges and sgk used registrations
7 and 10, so worksheets and speak got 429. With the touch fix there are no retries and CI fits exactly,
but any retry or any new `freshChild` spec will fail again in the same way.
Options: (a) make the limit configurable for non-production env and raise it in `playwright.config.ts`
(recommended; server change); (b) let `freshChild` add a new child under one shared parent instead of
registering a parent each time (e2e-only; depends on the per-parent child cap).

## Unresolved questions

- Real Chromebook / Android Chrome: a child who lifts while still flicking and then taps within about
  400 ms would lose that tap too (platform behaviour). Whether an app-side mitigation is worth adding
  (a non-passive native `touchmove` `preventDefault` on tiles) needs a device check. The primary target is iPad Safari, which does not use this code path.
