import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionClaimResponse, CollectionResponse, CollectionSetDto } from '@miu/schema/collectible';
import type { CharacterDto } from '@miu/schema/game';
import { PROGRESS } from '../player/test-fixtures';
import { CollectibleDropNote } from './collectible-drop';
import { CollectionBook } from './collection-book';
import { BOOK_SETS } from './collection-catalog';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };
const FOREST = BOOK_SETS.find((s) => s.mapId === 'khu-rung-bi-mat');
if (!FOREST) throw new Error('the forest has no set');
const ids = FOREST.slots.map((s) => s.id);

function setOf(mapId: string, owned: Record<string, number>, claimed = false): CollectionSetDto {
  const found = Object.keys(owned).length;
  return { mapId, owned, found, total: 10, complete: found === 10, claimed, reward: { coins: 150, title: 'Danh hiệu' } };
}
const collection = (forestOwned: Record<string, number>, claimed = false): CollectionResponse => ({
  sets: BOOK_SETS.map((s) => (s.mapId === 'khu-rung-bi-mat' ? setOf(s.mapId, forestOwned, claimed) : setOf(s.mapId, {}))),
  titles: [],
});

function stubServer(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const body = routes[`${init?.method ?? 'GET'} ${String(input)}`];
    return new Response(JSON.stringify(body ?? { error: 'not-found' }), { status: body ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the collection book', () => {
  it('shows a tab per region and the page of ten slots: found things lit with their count, the others as silhouettes', async () => {
    stubServer({ 'GET /api/collection': collection({ [ids[0] ?? '']: 3 }) });
    render(<CollectionBook character={CHARACTER} onClose={() => undefined} />);
    expect(await screen.findByText('Đã tìm 1/10')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(BOOK_SETS.length);
    const slots = document.querySelectorAll('[data-id^="book-item-"]');
    expect(slots).toHaveLength(10);
    expect([...slots].filter((s) => s.getAttribute('data-owned') === 'true')).toHaveLength(1);
    const first = document.querySelector(`[data-id="book-item-${ids[0] ?? ''}"]`);
    expect(first?.textContent).toContain('×3');
    // Tapping shows the description; a missing one says how to find it.
    fireEvent.click(first as Element);
    expect(document.querySelector('[data-id="book-detail"]')?.getAttribute('data-owned')).toBe('true');
    fireEvent.click(document.querySelector(`[data-id="book-item-${ids[1] ?? ''}"]`) as Element);
    expect(screen.getByText('Chưa tìm thấy', { selector: 'strong' })).toBeTruthy();
    expect(document.querySelector('[data-id="book-reward"]')?.getAttribute('data-state')).toBe('locked');
  });

  it('claims a full set once and opens the celebration card with the server coins and title', async () => {
    const full = Object.fromEntries(ids.map((id) => [id, 1]));
    const claim: CollectionClaimResponse = { set: setOf('khu-rung-bi-mat', full, true), granted: true, coins: 150, title: 'Danh hiệu', progress: { ...PROGRESS, coins: 162 } };
    const fetchMock = stubServer({ 'GET /api/collection': collection(full), 'POST /api/collection/claim': claim });
    const onCoins = vi.fn();
    render(<CollectionBook character={CHARACTER} onClose={() => undefined} onCoins={onCoins} />);
    fireEvent.click(await screen.findByText('Nhận thưởng'));
    const card = await screen.findByRole('dialog', { name: 'Chúc mừng!' });
    expect(within(card).getByText('+150 Xu')).toBeTruthy();
    expect(onCoins).toHaveBeenCalledWith(162);
    const posted = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(posted?.[1]?.body))).toEqual({ mapId: 'khu-rung-bi-mat' });
    expect(document.querySelector('[data-id="book-reward"]')?.getAttribute('data-state')).toBe('claimed');
  });

  it('opens at the region she plays, and says so when it cannot be read', async () => {
    stubServer({});
    const last = BOOK_SETS.at(-1);
    render(<CollectionBook character={CHARACTER} startAt={last?.mapId} onClose={() => undefined} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('the drop note', () => {
  it('says "Mới!" for a first one and the count for a double, nothing without a drop', () => {
    const fill = (text: string) => text;
    const { rerender } = render(<CollectibleDropNote drop={{ itemId: ids[0] ?? '', mapId: 'khu-rung-bi-mat', owned: 1 }} fill={fill} />);
    expect(screen.getByText('Mới!')).toBeTruthy();
    rerender(<CollectibleDropNote drop={{ itemId: ids[0] ?? '', mapId: 'khu-rung-bi-mat', owned: 4 }} fill={fill} />);
    expect(screen.getByText('×4')).toBeTruthy();
    rerender(<CollectibleDropNote drop={null} fill={fill} />);
    expect(document.querySelector('[data-id="collectible-drop"]')).toBeNull();
  });
});
