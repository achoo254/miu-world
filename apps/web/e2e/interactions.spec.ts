// Every interaction animates, puts the child in the right place and gets an answer from the object (owner,
// 05/10/2026: "không muốn bất kỳ hành động tương tác nào mà nhân vật bị đơ hoặc không có hoạt cảnh"). A tour of
// the child's home through the `objects=1` switch (game/interact/object-tour.ts): one object for each pose and
// each kind of answer, tried in a row on one page. The whole catalogue (every pose has a gesture, every seat
// model its seat data) is checked in Node (interaction-catalogue.test.ts); here only samples.
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { TourObject } from '../src/game/interact/object-tour';
import { freshChild } from './quest-api';
import { expectDrawCalls, readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 } });

const HOME = '/play?region=nha-cua-be&quest=nha-cua-be-ch1&objects=1&spawnAt=spawn';
const SHOTS = '../../../.data/interactions/review-shots';
const DRAW_CALL_BUDGET = 150;
/** Poses that keep her on the object until she gets up, and where her body then is above her controller. */
const HELD = new Set(['sit', 'lay', 'sleep', 'swing', 'watch']);

const objects = (page: Page): Promise<TourObject[]> => page.evaluate(() => window.__miuObjects?.list() ?? []);
/** The objects of the home itself (the land round it, generated as she plays, has far-off boats at sea). */
const homeObjects = async (page: Page): Promise<TourObject[]> => (await objects(page)).filter((o) => o.middle[0] >= 0 && o.middle[0] < 160 && o.middle[2] >= 0 && o.middle[2] < 160);
const goTo = (page: Page, id: string): Promise<boolean> => page.evaluate((target) => window.__miuObjects?.goTo(target) ?? false, id);

/** Stands her by the object and waits for its prompt; false when another target takes the prompt there. */
async function standBy(page: Page, object: TourObject): Promise<boolean> {
  if (!(await goTo(page, object.id))) return false;
  try {
    await expect.poll(async () => (await readStats(page)).nearObject, { timeout: 2_500 }).toBe(object.id);
    return true;
  } catch {
    return false;
  }
}

/** How far her bones and tilt are from another sample (radians). */
function poseDistance(a: Record<string, number> | null, b: Record<string, number> | null): number {
  if (!a || !b) return 0;
  return Math.max(...Object.keys(a).map((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0))));
}

/** Lets her go (a second tap for what holds her, a step otherwise) and checks she stands free on open ground. */
async function getUp(page: Page, held: boolean): Promise<void> {
  if (held) await page.keyboard.press('KeyE');
  else {
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(150);
    await page.keyboard.up('KeyS');
  }
  const log: string[] = [];
  await expect
    .poll(async () => {
      const s = await readStats(page);
      log.push(JSON.stringify({ a: s.objects?.active, g: s.objects?.gesture, p: s.player.map((v) => +v.toFixed(2)), f: s.frames, sp: +s.speed.toFixed(2) }));
      return s.objects?.active ?? null;
    })
    .toBeNull()
    .catch((e: unknown) => {
      console.log(log.join('\n'));
      throw e;
    });
  const after = await readStats(page);
  expect(after.embedded, 'standing free after getting up').toBe(false);
}

test('sitting on a chair puts her hips on its seat, and she gets up on open floor', { tag: '@smoke' }, async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(`${HOME}&quality=low`);
  await waitReady(page);
  const chairs = (await objects(page)).filter((o) => o.def === 'chair-sit');
  let chair: TourObject | null = null;
  for (const c of chairs) if (await standBy(page, c)) {
    chair = c;
    break;
  }
  if (!chair) throw new Error('no chair to sit on in the home');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await readStats(page)).objects?.body ?? null).not.toBeNull();
  const seated = await readStats(page);
  expect(seated.objects?.active).toBe('chair-sit');
  const body = seated.objects?.body;
  // On the seat, not on the floor and not sunk into the chair: the hips well above her controller's feet.
  expect((body?.[1] ?? 0) - seated.player[1]).toBeGreaterThan(0.2);
  expect(seated.embedded).toBe(false);
  await getUp(page, true);
});

test('one object for every pose and every kind of answer: she moves, the object answers, she gets up free', async ({ page, baseURL }) => {
  // Some twenty objects tried one after another on one page, each a gesture of one to three seconds.
  test.setTimeout(150_000);
  await freshChild(page, baseURL ?? '');
  await page.goto(`${HOME}&quality=low`);
  await waitReady(page);
  const all = await homeObjects(page);
  const poses = new Set(all.map((o) => o.pose));
  const kinds = new Set(all.map((o) => o.effect ?? 'none'));
  // Candidates for each pose and each answer, the first that has its prompt there is tried.
  const groups: TourObject[][] = [...[...poses].map((p) => all.filter((o) => o.pose === p)), ...[...kinds].map((k) => all.filter((o) => (o.effect ?? 'none') === k))];
  const tried = new Set<string>();
  const covered = { poses: new Set<string>(), kinds: new Set<string>() };
  for (const group of groups) {
    const pose = group[0]?.pose ?? '';
    const kind = group[0]?.effect ?? 'none';
    if (covered.poses.has(pose) && covered.kinds.has(kind) && group.every((o) => o.pose === pose)) continue;
    let object: TourObject | null = null;
    for (const candidate of group.slice(0, 6)) {
      if (tried.has(candidate.id)) continue;
      if (await standBy(page, candidate)) {
        object = candidate;
        break;
      }
    }
    if (!object) continue;
    tried.add(object.id);
    covered.poses.add(object.pose);
    covered.kinds.add(object.effect ?? 'none');
    const what = `${object.def} (${object.pose}, ${object.effect ?? 'no answer'})`;
    const before = await readStats(page);
    const wasOn = before.objects?.on.includes(object.stateKey) ?? false;
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await readStats(page)).objects?.active, { message: what }).toBe(object.def);
    // The stove and the kitchen sink also open the cooking screen over the game: closed, the gesture goes on.
    if (/stove|kitchen/.test(object.def)) await page.locator('[data-id="cooking-close"]').click();
    await page.waitForTimeout(350);
    const during = await readStats(page);
    expect(during.objects?.gesture, `${what}: a gesture`).not.toBeNull();
    expect(poseDistance(during.pose as unknown as Record<string, number>, before.pose as unknown as Record<string, number>), `${what}: she moves`).toBeGreaterThan(0.05);
    const held = HELD.has(object.pose);
    if (held && object.pose !== 'watch') expect((during.objects?.body?.[1] ?? 0) - during.player[1], `${what}: on top of it`).toBeGreaterThan(0.1);
    if (held) expect(during.objects?.body, `${what}: her body placed`).not.toBeNull();
    // The object answers.
    const effects = during.objects?.effects;
    switch (object.effect) {
      case 'light':
        expect(during.objects?.on.includes(object.stateKey), what).toBe(!wasOn);
        if (!wasOn) expect(effects?.halos, what).toBeGreaterThan(0);
        break;
      case 'screen':
        expect(effects?.screens, what).toBeGreaterThan(0);
        break;
      case 'open':
        await expect.poll(async () => (await readStats(page)).objects?.effects.open ?? 0, { message: what }).toBeGreaterThan(0);
        break;
      case 'door':
        // It opened as she came near; her tap shut it.
        expect(wasOn, `${what}: open as she came`).toBe(true);
        expect(during.objects?.on.includes(object.stateKey), what).toBe(false);
        break;
      case 'sway': {
        const a = during.objects?.body ?? [0, 0, 0];
        await page.waitForTimeout(500);
        const b = (await readStats(page)).objects?.body ?? [0, 0, 0];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), `${what}: swinging`).toBeGreaterThan(0.02);
        break;
      }
      case null:
        break;
      default:
        expect((effects?.playing ?? 0) + (effects?.particles ?? 0), `${what}: plays`).toBeGreaterThan(0);
    }
    await getUp(page, held);
  }
  // Every pose and every kind of answer of the home was tried, but where a quest's own target takes the prompt
  // (the timetable board is the timetable quest's); the ones that hold her and every kind of answer always are.
  const untried = [...poses].filter((p) => !covered.poses.has(p));
  if (untried.length > 0) test.info().annotations.push({ type: 'poses only behind a quest target', description: untried.join(', ') });
  expect(untried.filter((p) => HELD.has(p))).toEqual([]);
  expect(covered.poses.size).toBeGreaterThanOrEqual(poses.size - 1);
  const kindsUntried = [...kinds].filter((k) => !covered.kinds.has(k));
  if (kindsUntried.length > 0) test.info().annotations.push({ type: 'answers only behind a quest target', description: kindsUntried.join(', ') });
  expect(kindsUntried.filter((k) => ['light', 'screen', 'open', 'door', 'sway', 'water', 'steam', 'symbols'].includes(k))).toEqual([]);
});

test('what she switches on in her home is still on next time, and the lit home stays in the draw-call budget', async ({ page, baseURL }) => {
  test.setTimeout(60_000); // two loads of the home, one on the high quality
  await freshChild(page, baseURL ?? '');
  await page.goto(`${HOME}&quality=high`);
  await waitReady(page);
  const all = await objects(page);
  const switched: string[] = [];
  for (const def of ['lamp-toggle', 'tv-watch']) {
    for (const o of all.filter((x) => x.def === def)) {
      if (!(await standBy(page, o))) continue;
      await page.keyboard.press('KeyE');
      await expect.poll(async () => (await readStats(page)).objects?.on ?? []).toContain(o.stateKey);
      switched.push(o.stateKey);
      await getUp(page, def === 'tv-watch');
      break;
    }
  }
  expect(switched).toHaveLength(2);
  const lit = await readStats(page);
  expect(lit.objects?.effects.light).toBe(true);
  expectDrawCalls(lit.calls, DRAW_CALL_BUDGET, 'the home with a lamp lit and the television on');
  test.info().annotations.push({ type: 'draw calls', description: `${lit.calls} with a lamp lit and the television on (quality high)` });
  console.log(`draw calls, home lit (high): ${lit.calls}, triangles ${lit.triangles}`);
  await expect.poll(async () => Object.keys(((await (await page.request.get('/api/home-objects')).json()) as { states: Record<string, true> }).states)).toEqual(expect.arrayContaining(switched));
  await page.reload();
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).objects?.on ?? []).toEqual(expect.arrayContaining(switched));
  const back = await readStats(page);
  expect(back.objects?.effects.halos).toBeGreaterThan(0);
  expect(back.objects?.effects.screens).toBeGreaterThan(0);
});

test('review shots: the front door, a chair, the swing, a lit lamp and the television', async ({ page, baseURL }) => {
  test.skip(!process.env.REVIEW_SHOTS, 'review material only');
  test.setTimeout(120_000); // a dozen waits for the scene to settle before each shot
  mkdirSync(new URL(SHOTS, import.meta.url), { recursive: true });
  await freshChild(page, baseURL ?? '');
  await page.goto(`${HOME}&quality=high`);
  await waitReady(page);
  const all = await homeObjects(page);
  const shoot = async (name: string): Promise<void> => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: new URL(`${SHOTS}/after-${name}.png`, import.meta.url).pathname });
  };
  /** Uses the first object of `def` (the lowest first when `groundFloor`) and shoots it in use. */
  const use = async (def: string, name: string, held: boolean, groundFloor = false, turn = 0): Promise<void> => {
    const candidates = all.filter((x) => x.def === def);
    if (groundFloor) candidates.sort((a, b) => a.middle[1] - b.middle[1]);
    for (const o of candidates) {
      if (!(await standBy(page, o))) continue;
      await page.keyboard.press('KeyE');
      if (turn !== 0) {
        // Round to her side, where the swing's frame does not stand between her and the camera.
        await page.mouse.move(590, 300);
        await page.mouse.down();
        await page.mouse.move(590 + turn, 300, { steps: 8 });
        await page.mouse.up();
      }
      await shoot(name);
      if (held) await page.keyboard.press('KeyE');
      await page.waitForTimeout(400);
      return;
    }
  };
  const door = all.find((o) => o.def === 'front-door');
  if (door && (await goTo(page, door.id))) await shoot('front-door-open');
  const cupboard = all.find((o) => o.def === 'stair-cupboard-open');
  if (cupboard && (await goTo(page, cupboard.id))) await shoot('stair-cupboard');
  await use('chair-sit', 'chair-seated', true);
  await use('sofa-relax', 'sofa-seated', true);
  await use('swing-play', 'swing', true, false, 260);
  await use('lamp-toggle', 'lamp-lit', false, true);
  await use('tv-watch', 'tv-on', true);
  await use('bed-sleep', 'bed', true);
  await use('wardrobe-pick', 'wardrobe-open', false);
});
