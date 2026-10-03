// The wide maps (800 x 800, loaded region by region) on the production build: each theme map opens next to
// its guide within the draw-call budget, and the gates carry the child from the hub, Trung tâm, into a theme
// map and back (and from the school's square into a theme map). Guides, lessons and gates are read from the content and the maps' entities as data.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] } });

const DRAW_CALL_BUDGET = 150;
const read = <T>(rel: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../${rel}`, import.meta.url)), 'utf8')) as T;
const regions = read<{ regions: Array<{ id: string; status: string; guide?: string }> }>('content/world/regions.json').regions;
const targets = read<{ targets: Record<string, { name: string }> }>('content/world/targets.json').targets;
const questDir = fileURLToPath(new URL('../../../content/quests/', import.meta.url));
const quests = readdirSync(questDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${questDir}${f}`, 'utf8')) as { id: string; region: string; status: string; category?: string; steps?: Array<{ target?: string }> })
  // Minigame side quests are offered by their characters, never the lesson a map opens beside.
  .filter((q) => q.category !== 'side');
/** A lesson of the region in which its guide plays (the guide stands in that lesson's chapter). */
const lessonWithGuide = (region: string, guide: string) => quests.find((q) => q.region === region && q.status === 'active' && q.steps?.some((s) => s.target === guide));
const firstLesson = (region: string) => quests.find((q) => q.region === region && q.status === 'active');

const THEME_MAPS = ['lang-ven-song', 'xom-mai-am', 'cho-phien', 'nong-trai', 'thu-vien', 'lau-dai', 'trung-tam', 'nui-tuyet', 'dao-bi-an', 'nha-cua-be'];

for (const id of THEME_MAPS) {
  test(`${id} opens beside its guide (or its first character) within the draw-call budget`, async ({ page, baseURL }) => {
    // The guide where a lesson has the child meet it (on the farm Bò Sữa Mơ only speaks: its first lesson's first character).
    const guide = regions.find((r) => r.id === id)?.guide;
    const withGuide = guide ? lessonWithGuide(id, guide) : undefined;
    const lesson = withGuide ?? firstLesson(id);
    const meet = withGuide ? guide : lesson?.steps?.find((s) => s.target)?.target;
    if (!lesson || !meet) throw new Error(`${id} has no lesson with a character to meet`);
    await freshChild(page, baseURL ?? '');
    await page.goto(`/play?quality=low&region=${id}&quest=${lesson.id}&spawnAt=${meet}`);
    await waitReady(page);
    // Standing there offers a lesson target (the character, or a thing of its place right beside it).
    await expect.poll(async () => (await readStats(page)).nearTarget).not.toBeNull();
    if (withGuide && guide) await expect(page.locator(`.npc-label[data-target="${guide}"]`)).toContainText(targets[guide]?.name ?? guide);
    expect((await readStats(page)).calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  });
}

test('a gate of the hub, Trung tâm, leads onto the mystery island, and the island gate leads back', async ({ page, baseURL }) => {
  const hubLesson = firstLesson('trung-tam');
  const island = firstLesson('dao-bi-an');
  if (!hubLesson || !island) throw new Error('no quest in the hub or on the island');
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=trung-tam&quest=${hubLesson.id}&spawnAt=cong-dao-bi-an`);
  await waitReady(page);
  // Every portal of the hub swirls with sparks (one draw for all of them).
  const hubPortals = read<{ props: Array<{ model: string }> }>('assets/generated/world/trung-tam/entities.json').props.filter((p) => /\/tt-portal-/.test(p.model)).length;
  expect(hubPortals).toBeGreaterThan(0);
  expect((await readStats(page)).portals).toBe(hubPortals);
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/sgk/review-shots/portal-sparks.png', import.meta.url)) });
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`region=dao-bi-an&quest=${island.id}`));
  // The trip through the portal shows (owner, 03/10/2026), then she stands at the island's starting point for
  // the lesson's chapter, and the quest card walks her to the lesson (the new map gets the step's target).
  await expect(page.locator('[data-id="play-loading"][data-via="portal"]')).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/sgk/review-shots/portal-trip.png', import.meta.url)) });
  await waitReady(page);
  const islandMap = read<{ spawn: { position: number[] }; chapterSpawns?: Record<string, { position: number[] }> }>('assets/generated/world/dao-bi-an/entities.json');
  const chapter = (read<{ chapter?: number }>(`content/quests/${island.id}.json`).chapter ?? 1).toString();
  const [sx = 0, , sz = 0] = (islandMap.chapterSpawns?.[chapter] ?? islandMap.spawn).position;
  const [px = 0, , pz = 0] = (await readStats(page)).player;
  expect(Math.hypot(px - sx, pz - sz)).toBeLessThan(3);
  await expect(page.locator('[data-id="hud-autowalk"]')).toHaveText('Chạm để tự đi tới');
  await page.goto(`/play?quality=low&region=dao-bi-an&quest=${island.id}&spawnAt=cong-trung-tam`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(/region=trung-tam/);
});

test("the hub's coral portal leads home to the front gate, and the home's gate leads back", async ({ page, baseURL }) => {
  const hubLesson = firstLesson('trung-tam');
  const home = firstLesson('nha-cua-be');
  if (!hubLesson || !home) throw new Error('no quest in the hub or at home');
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=trung-tam&quest=${hubLesson.id}&spawnAt=cong-nha-cua-be`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`region=nha-cua-be&quest=${home.id}`));
  await waitReady(page);
  // She arrives on the lane before the front gate (the map's start), the name board beside it.
  const homeMap = read<{ spawn: { position: number[] }; chapterSpawns?: Record<string, { position: number[] }> }>('assets/generated/world/nha-cua-be/entities.json');
  const [sx = 0, , sz = 0] = (homeMap.chapterSpawns?.['1'] ?? homeMap.spawn).position;
  const [px = 0, , pz = 0] = (await readStats(page)).player;
  expect(Math.hypot(px - sx, pz - sz)).toBeLessThan(3);
  await page.goto(`/play?quality=low&region=nha-cua-be&quest=${home.id}&spawnAt=cong-trung-tam`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(/region=trung-tam/);
});

test("a portal of the school's square leads into the market, and the market gate leads to Trung tâm", async ({ page, baseURL }) => {
  const schoolLesson = firstLesson('truong-hoc');
  const market = firstLesson('cho-phien');
  if (!schoolLesson || !market) throw new Error('no lesson in the school or the market');
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=truong-hoc&quest=${schoolLesson.id}&spawnAt=cong-cho-phien`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`region=cho-phien&quest=${market.id}`));
  await waitReady(page);
  await page.goto(`/play?quality=low&region=cho-phien&quest=${market.id}&spawnAt=cong-trung-tam`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(/region=trung-tam/);
});

// Every map's longest ride (owner, 03/10/2026: pressing Lên tàu left the child over bare sky; "xem thêm các map
// khác"): the land under her stays drawn on the way, and she gets off on solid ground at the far stop with the land
// round her drawn from the first moment. She really travels there (owner, 03/10/2026: "hoạt cảnh bé di chuyển
// thật"): on the vehicle and not yet there a second after the tap, at the far stop within about eight seconds.
// The first map of each kind of vehicle rides the whole way; the others skip with "Bỏ qua" once on the way.
// Rides are read from each map's entities.
type Ride = { id: string; position: [number, number, number]; ride?: [number, number, number] };
const longestRide = (map: string): Ride | undefined =>
  read<{ interactables: Ride[] }>(`assets/generated/world/${map}/entities.json`)
    .interactables.filter((t) => t.ride)
    .sort((a, b) => Math.hypot((b.ride?.[0] ?? 0) - b.position[0], (b.ride?.[2] ?? 0) - b.position[2]) - Math.hypot((a.ride?.[0] ?? 0) - a.position[0], (a.ride?.[2] ?? 0) - a.position[2]))[0];
const withMaps = read<{ regions: Array<{ id: string; map?: string }> }>('content/world/regions.json').regions.filter((r) => r.map);
/** The vehicle of each map's rides (ride-kind.ts); the wide maps' default is the bus. */
const RIDE_KIND: Readonly<Record<string, string>> = { 'trung-tam': 'balloon', 'nui-tuyet': 'cable-car', 'dao-bi-an': 'boat', 'lang-ven-song': 'boat', 'forest-ch1': 'train' };
const rideWhole = new Set<string>();

for (const region of withMaps) {
  const map = region.map ?? '';
  const stop = longestRide(map);
  if (!stop?.ride) continue;
  const [rx, , rz] = stop.ride;
  const kind = RIDE_KIND[map] ?? 'bus';
  const whole = !rideWhole.has(kind);
  rideWhole.add(kind);
  test(`${region.id}: the longest ride (${stop.id}) carries the child by ${kind} with the land drawn at both ends`, async ({ page, baseURL }) => {
    await freshChild(page, baseURL ?? '');
    const lesson = firstLesson(region.id);
    await page.goto(`/play?quality=low&region=${region.id}${lesson ? `&quest=${lesson.id}` : ''}&spawnAt=${stop.id}`);
    await waitReady(page);
    await expect.poll(async () => (await readStats(page)).nearTarget).toBe(stop.id);
    expect((await readStats(page)).patches).toBeGreaterThan(0);
    await page.keyboard.press('KeyE');
    const pressed = Date.now();
    const distance = (s: { player: number[] }): number => Math.hypot((s.player[0] ?? 0) - rx, (s.player[2] ?? 0) - rz);
    await expect.poll(async () => (await readStats(page)).journey?.kind).toBe(kind);
    // A second after the tap she is on her way, not at the far stop yet, over drawn land.
    await page.waitForTimeout(Math.max(0, 1000 - (Date.now() - pressed)));
    const early = await readStats(page);
    expect(early.journey).not.toBeNull();
    expect(distance(early)).toBeGreaterThan(8);
    expect(early.patches).toBeGreaterThan(0);
    if (!whole) await page.locator('[data-id="game-ride-skip"]').click();
    // At the far stop within about eight seconds of the tap (a little slack for a slow machine).
    await expect.poll(async () => distance(await readStats(page)), { timeout: Math.max(1000, 10_000 - (Date.now() - pressed)) }).toBeLessThan(8);
    await expect.poll(async () => (await readStats(page)).journey).toBeNull();
    // Land drawn the moment she arrives (the camera jumps with her instead of gliding over the gap).
    expect((await readStats(page)).patches).toBeGreaterThan(0);
    await expect.poll(async () => (await readStats(page)).onGround).toBe(true);
    await expect(page.locator('[data-id="game-ride-skip"]')).toBeHidden();
  });
}

// Asking for less motion (the system setting): the ride is a short fade to the far stop, no journey on screen.
test('with reduced motion a ride is a short fade to the far stop', async ({ page, baseURL }) => {
  const stop = longestRide('trung-tam');
  if (!stop?.ride) throw new Error('the hub has no ride');
  const [rx, , rz] = stop.ride;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await freshChild(page, baseURL ?? '');
  const lesson = firstLesson('trung-tam');
  await page.goto(`/play?quality=low&region=trung-tam${lesson ? `&quest=${lesson.id}` : ''}&spawnAt=${stop.id}`);
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).nearTarget).toBe(stop.id);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await readStats(page)).journey?.phase).toBe('fade');
  await expect.poll(async () => {
    const s = await readStats(page);
    return Math.hypot(s.player[0] - rx, s.player[2] - rz);
  }, { timeout: 5_000 }).toBeLessThan(8);
});

// The world map's quick facts (owner, 03/10/2026): under the island, a card per open region names each book
// its lessons come from and the pages they span, read here from the server's own quest list.
test('the world map names, for each region, the books and pages of its lessons', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  const shots = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
  type Listed = { quest: { region: string; status: string; textbook?: { book: string; pages: [number, number] } } };
  const listed = ((await (await page.request.get('/api/quests')).json()) as { quests: Listed[] }).quests;
  for (const viewport of [{ width: 1180, height: 820 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'Sách trong từng khu' })).toBeVisible();
    for (const region of withMaps) {
      const books = new Map<string, [number, number]>();
      for (const { quest } of listed.filter((x) => x.quest.region === region.id && x.quest.status === 'active')) {
        const t = quest.textbook;
        if (!t) continue;
        const known = books.get(t.book);
        books.set(t.book, known ? [Math.min(known[0], t.pages[0]), Math.max(known[1], t.pages[1])] : t.pages);
      }
      const card = page.locator(`[data-id="map-books-${region.id}"]`);
      for (const [book, [from, to]] of books) await expect(card).toContainText(`${book}Trang ${from === to ? from : `${from}–${to}`}`);
    }
    await page.locator('[data-id="map-books"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}map-books-${viewport.width}.png`, fullPage: true });
  }
});
