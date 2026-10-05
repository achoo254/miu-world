import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountProvider } from './account-context';
import { AppRoutes } from '../app-shell';
import { PROGRESS, questList } from '../player/test-fixtures';

// jsdom has no WebGL: the runtime is covered by Playwright; here only its lifecycle is observed.
const gameLifecycle = vi.hoisted(() => ({ started: 0, disposed: 0, outfit: [] as string[] }));
vi.mock('../../game/game', () => ({
  Game: class {
    constructor(_host: HTMLElement, options: { outfit: string[] }) {
      gameLifecycle.outfit = options.outfit;
    }
    async start() {
      gameLifecycle.started += 1;
    }
    stop() {}
    resume() {}
    currentSpot() {
      return null;
    }
    dispose() {
      gameLifecycle.disposed += 1;
    }
  },
}));

type Handler = (body: unknown) => { status: number; body?: unknown };

const CHILD = '0b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d';
const OTHER = '2b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d';
const PARENT = { id: '1b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', email: 'p@example.vn' };
const me = (over: Record<string, unknown> = {}) => ({
  parent: PARENT,
  consentAccepted: true,
  activePlayerId: null,
  players: [{ id: CHILD, displayName: 'Mèo Mây', primary: true }],
  parentGateOpen: false,
  pinLocked: false,
  pinSet: true,
  ...over,
});

/** Stubs `fetch` with a route table and records every call for assertions. */
function stubApi(routes: Record<string, Handler>) {
  const calls: Array<{ key: string; body: unknown }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`;
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ key, body });
      const handler = routes[key];
      const out = handler ? handler(body) : { status: 404, body: { error: 'not-found' } };
      return new Response(out.status === 204 ? null : JSON.stringify(out.body), { status: out.status });
    }),
  );
  return calls;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccountProvider>
        <AppRoutes />
      </AccountProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('account flow', () => {
  it('sends a signed-out visitor to the login screen', async () => {
    stubApi({ 'GET /api/auth/me': () => ({ status: 401, body: { error: 'unauthenticated' } }) });
    renderAt('/profiles');
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('offers only Google sign-in, through a same-origin server redirect', async () => {
    const calls = stubApi({ 'GET /api/auth/me': () => ({ status: 401, body: { error: 'unauthenticated' } }) });
    renderAt('/register?error=google');
    const link = await screen.findByRole('link', { name: 'Đăng nhập bằng Google' });
    expect(link.getAttribute('href')).toBe('/api/auth/google/start');
    expect((await screen.findByRole('alert')).textContent).toContain('chưa thành công');
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(calls.map((c) => c.key)).toEqual(['GET /api/auth/me']);
  });

  it('takes a parent fresh from Google straight to the consent, without asking for a PIN', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ pinSet: false, consentAccepted: false, parentGateOpen: true }) }),
      'GET /api/consents/policy': () => ({ status: 200, body: { version: 'draft-2', requiresLegalReview: true, title: 'Đồng ý', paragraphs: ['x'] } }),
    });
    renderAt('/profiles');
    expect(await screen.findByRole('button', { name: 'Tôi đồng ý' })).toBeTruthy();
    expect(screen.queryByLabelText('Mã PIN (4–6 số)')).toBeNull();
    expect(calls.some((c) => c.key === 'POST /api/auth/pin')).toBe(false);
  });

  it('lets a parent set the optional PIN from the parent area', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ pinSet: false, parentGateOpen: true }) }),
      'POST /api/auth/pin': () => ({ status: 200, body: me({ pinSet: true, parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
    });
    renderAt('/set-pin');
    const pin = (await screen.findByLabelText('Mã PIN (4–6 số)')) as HTMLInputElement;
    fireEvent.change(pin, { target: { value: '2468' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mã PIN'), { target: { value: '1357' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mã PIN' }));
    expect((await screen.findByRole('alert')).textContent).toContain('chưa khớp');
    fireEvent.change(screen.getByLabelText('Nhập lại mã PIN'), { target: { value: '2468' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mã PIN' }));
    expect(await screen.findByRole('heading', { name: /Người chơi của tài khoản/ })).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /api/auth/pin')?.body).toEqual({ pin: '2468' });
  });

  it('shows the draft consent, then goes straight into the game as the account\'s own player', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ consentAccepted: false, parentGateOpen: true, players: [] }) }),
      'GET /api/consents/policy': () => ({
        status: 200,
        body: { version: 'draft-1', requiresLegalReview: true, title: 'Đồng ý của phụ huynh', paragraphs: ['Nội dung.'] },
      }),
      'POST /api/consents': () => ({ status: 201, body: me({ parentGateOpen: true, activePlayerId: CHILD }) }),
      'GET /api/character': () => ({ status: 200, body: { species: 'cat', name: 'Mochi', equipped: [] } }),
      'GET /api/progress': () => ({ status: 200, body: PROGRESS }),
      'GET /api/quests': () => ({ status: 200, body: questList() }),
    });
    renderAt('/');
    expect(await screen.findByText('Bản nháp — chờ pháp chế duyệt')).toBeTruthy();
    expect(screen.getByText(/bạn là người chịu trách nhiệm/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đồng ý' }));
    // No player picker and no profile set-up: Home of the account's own player.
    // Home is lazy-loaded: its first import in a run can be slow on a cold transform cache.
    expect(await screen.findByRole('link', { name: 'Bắt đầu' }, { timeout: 10000 })).toBeTruthy();
    expect(calls.some((c) => c.key === 'GET /api/players')).toBe(false);
    expect(calls.find((c) => c.key === 'POST /api/consents')?.body).toEqual({ policyVersion: 'draft-1' });
  }, 15000);

  it('asks for the PIN before showing parent-only controls', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me() }),
      'GET /api/players': () => ({ status: 200, body: [] }),
      'POST /api/parent-gate/unlock': () => ({ status: 401, body: { error: 'invalid-pin' } }),
    });
    renderAt('/parent');
    const pin = (await screen.findByLabelText('Nhập mã PIN tài khoản')) as HTMLInputElement;
    expect(screen.queryByRole('heading', { name: /Người chơi của tài khoản/ })).toBeNull();
    fireEvent.change(pin, { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Mã PIN chưa đúng.');
  });

  it('sends a parent with a locked PIN back through Google to unlock it', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ pinLocked: true }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
    });
    renderAt('/parent');
    const link = await screen.findByRole('link', { name: 'Đăng nhập lại bằng Google' });
    expect(link.getAttribute('href')).toBe('/api/auth/google/start?intent=reauth');
  });

  it('shows the privacy page to a visitor who is not signed in, linked from the login screen', async () => {
    stubApi({ 'GET /api/auth/me': () => ({ status: 401, body: { error: 'unauthenticated' } }) });
    renderAt('/login');
    fireEvent.click(await screen.findByRole('link', { name: 'Quyền riêng tư' }));
    expect(await screen.findByRole('heading', { name: 'Quyền riêng tư của Miu World' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quyền của bạn' })).toBeTruthy();
    expect(screen.getByText(/tự soạn/)).toBeTruthy();
  });

  it('deletes the account only after a second confirmation, then signs out', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
      'DELETE /api/account': () => ({ status: 204 }),
    });
    renderAt('/parent');
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản' }));
    expect(calls.some((c) => c.key === 'DELETE /api/account')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Không' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa hẳn tài khoản' }));
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy();
    expect(calls.filter((c) => c.key === 'DELETE /api/account')).toHaveLength(1);
  });

  it('downloads the account data as a JSON file', async () => {
    const exported = { exportedAt: '2026-09-30T06:00:00.000Z', parent: { email: PARENT.email, signIn: 'google', createdAt: '2026-09-01T00:00:00.000Z' }, consents: [], sessions: [], players: [] };
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
      'GET /api/account/export': () => ({ status: 200, body: exported }),
    });
    // jsdom has no object URLs: record the file the page hands to the browser instead.
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
      return 'blob:export';
    };
    URL.revokeObjectURL = () => undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('miu-world-du-lieu-2026-09-30.json');
    });
    renderAt('/parent');
    fireEvent.click(await screen.findByRole('button', { name: 'Tải dữ liệu của tôi' }));
    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(JSON.parse(await blobs[0]?.text() ?? '')).toEqual(exported);
    click.mockRestore();
  });

  it('walks through the numbered steps, adds an extra player and can lock even with none', async () => {
    let children: Array<{ id: string; displayName: string; species: string; primary: boolean }> = [];
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: children }),
      'POST /api/players': (body) => {
        children = [{ id: CHILD, displayName: (body as { displayName: string }).displayName, species: 'cat', primary: false }];
        return { status: 201, body: children[0] };
      },
    });
    renderAt('/parent');
    // Wait for the list to load (the create form only shows then) before judging step 2.
    const create = await screen.findByRole('button', { name: 'Thêm người chơi' });
    expect(screen.getByRole('heading', { name: 'Bước 1: Người chơi của tài khoản' })).toBeTruthy();
    expect(screen.getByText('Tạo ít nhất một người chơi ở bước 1 trước nhé.')).toBeTruthy();
    // Locking never waits on a profile: an open parent area must always be closable.
    expect((screen.getByRole('button', { name: 'Xong, khóa mục này' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(create);
    expect(await screen.findByText('Mèo Mây', { selector: '.profile-row-name' })).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /api/players')?.body).toEqual({ displayName: 'Mèo Mây' });
    expect(screen.getByRole('heading', { name: 'Bước 1, đã xong: Người chơi của tài khoản' })).toBeTruthy();
    // The next profile defaults to the first name no sibling uses.
    expect((screen.getByLabelText(/Thêm người chơi phụ/) as HTMLSelectElement).value).toBe('Thỏ Bông');
  });

  it('without a PIN: says "play" instead of "lock", locks nothing, and offers to set a PIN', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ pinSet: false, parentGateOpen: true, players: [{ id: CHILD, displayName: 'Mèo Mây', primary: true }, { id: OTHER, displayName: 'Thỏ Bông', primary: false }] }) }),
      'GET /api/players': () => ({
        status: 200,
        body: [
          { id: CHILD, displayName: 'Mèo Mây', species: 'cat', primary: true },
          { id: OTHER, displayName: 'Thỏ Bông', species: 'cat', primary: false },
        ],
      }),
    });
    renderAt('/parent');
    const done = await screen.findByRole('button', { name: 'Xong, vào chơi' });
    expect(screen.getByRole('link', { name: 'Đặt mã PIN' }).getAttribute('href')).toBe('/set-pin');
    expect(screen.queryByRole('button', { name: 'Gỡ mã PIN' })).toBeNull();
    fireEvent.click(done);
    expect(await screen.findByRole('heading', { name: 'Ai đang chơi?' })).toBeTruthy();
    expect(calls.some((c) => c.key === 'POST /api/parent-gate/lock')).toBe(false);
  });

  it('with a PIN: offers to change or remove it while the area is open', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
      'DELETE /api/auth/pin': () => ({ status: 200, body: me({ pinSet: false, parentGateOpen: true }) }),
    });
    renderAt('/parent');
    expect((await screen.findByRole('link', { name: 'Đổi mã PIN' })).getAttribute('href')).toBe('/set-pin');
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ mã PIN' }));
    expect(await screen.findByRole('link', { name: 'Đặt mã PIN' })).toBeTruthy();
    expect(calls.some((c) => c.key === 'DELETE /api/auth/pin')).toBe(true);
  });

  it('shows a profile name as text and opens the name list only after "Đổi tên"', async () => {
    let name = 'Mèo Mây';
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
      'GET /api/players': () => ({ status: 200, body: [{ id: CHILD, displayName: name, species: 'cat', primary: true }] }),
      [`PATCH /api/players/${CHILD}`]: (body) => {
        name = (body as { displayName: string }).displayName;
        return { status: 200, body: { id: CHILD, displayName: name, species: 'cat', primary: true } };
      },
    });
    renderAt('/parent');
    expect(await screen.findByText('Mèo Mây', { selector: '.profile-row-name' })).toBeTruthy();
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi tên' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Tên hiển thị'));
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Thỏ Bông' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));
    expect(await screen.findByText('Thỏ Bông', { selector: '.profile-row-name' })).toBeTruthy();
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Đổi tên' })));
    expect(calls.find((c) => c.key === `PATCH /api/players/${CHILD}`)?.body).toEqual({ displayName: 'Thỏ Bông' });
  });

  it('shows the PIN prompt again when the server says the gate has closed', async () => {
    let gateOpen = true;
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: gateOpen }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
      'POST /api/players': () => {
        gateOpen = false;
        return { status: 403, body: { error: 'parent-gate-closed' } };
      },
    });
    renderAt('/parent');
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm người chơi' }));
    expect(await screen.findByLabelText('Nhập mã PIN tài khoản')).toBeTruthy();
  });

  it('lets the child pick a profile, land on Home and enter play from today\'s quest', async () => {
    let active: string | null = null;
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ activePlayerId: active }) }),
      'GET /api/players': () => ({ status: 200, body: [{ id: CHILD, displayName: 'Mèo Mây', species: 'cat', primary: true }] }),
      [`POST /api/players/${CHILD}/select`]: () => {
        active = CHILD;
        return { status: 200, body: { activePlayerId: CHILD } };
      },
      'GET /api/character': () => ({ status: 200, body: { species: 'cat', name: 'Miu', equipped: ['hat-witch-pink'] } }),
      'GET /api/progress': () => ({ status: 200, body: PROGRESS }),
      'GET /api/quests': () => ({ status: 200, body: questList() }),
    });
    renderAt('/profiles');
    fireEvent.click(await screen.findByRole('button', { name: 'Mèo Mây' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Bắt đầu' }, { timeout: 5000 }));
    expect(await screen.findByRole('button', { name: /Menu/ }, { timeout: 8000 })).toBeTruthy();
    await vi.waitFor(() => expect(gameLifecycle.started).toBeGreaterThan(0));
    expect(gameLifecycle.outfit).toEqual(['hat-witch-pink']);
    expect(calls.map((c) => c.key)).toContain(`POST /api/players/${CHILD}/select`);
    cleanup();
    expect(gameLifecycle.disposed).toBe(gameLifecycle.started);
  }, 15000);

  it('keeps /play behind a selected player: the picker on a shared device', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ players: [{ id: CHILD, displayName: 'Mèo Mây', primary: true }, { id: OTHER, displayName: 'Thỏ Bông', primary: false }] }) }),
      'GET /api/players': () => ({ status: 200, body: [] }),
    });
    renderAt('/play');
    expect(await screen.findByRole('heading', { name: 'Ai đang chơi?' })).toBeTruthy();
  });

  it('selects a lone player by itself instead of asking who plays', async () => {
    let active: string | null = null;
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ activePlayerId: active }) }),
      [`POST /api/players/${CHILD}/select`]: () => {
        active = CHILD;
        return { status: 200, body: { activePlayerId: CHILD } };
      },
      'GET /api/character': () => ({ status: 200, body: { species: 'cat', name: 'Mochi', equipped: [] } }),
      'GET /api/progress': () => ({ status: 200, body: PROGRESS }),
      'GET /api/quests': () => ({ status: 200, body: questList() }),
    });
    renderAt('/');
    // Home is lazy-loaded: its first import in a run can be slow on a cold transform cache.
    expect(await screen.findByRole('link', { name: 'Bắt đầu' }, { timeout: 10000 })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Ai đang chơi?' })).toBeNull();
    expect(calls.map((c) => c.key)).toContain(`POST /api/players/${CHILD}/select`);
  }, 15000);
});
