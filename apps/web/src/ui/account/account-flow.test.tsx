import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountProvider } from './account-context';
import { AppRoutes } from '../app-shell';

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
    dispose() {
      gameLifecycle.disposed += 1;
    }
  },
}));

type Handler = (body: unknown) => { status: number; body?: unknown };

const CHILD = '0b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d';
const PARENT = { id: '1b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', email: 'p@example.vn' };
const me = (over: Record<string, unknown> = {}) => ({
  parent: PARENT,
  consentAccepted: true,
  activeChildId: null,
  parentGateOpen: false,
  pinLocked: false,
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
    expect(await screen.findByRole('heading', { name: 'Đăng nhập phụ huynh' })).toBeTruthy();
  });

  it('validates the register form before calling the server', async () => {
    const calls = stubApi({ 'GET /api/auth/me': () => ({ status: 401, body: { error: 'unauthenticated' } }) });
    renderAt('/register');
    await screen.findByRole('heading', { name: 'Tạo tài khoản phụ huynh' });
    const field = (id: string) => document.querySelector(`[data-id="${id}"]`) as HTMLInputElement;
    fireEvent.change(field('register-email'), { target: { value: 'p@example.vn' } });
    fireEvent.change(field('register-password'), { target: { value: 'short' } });
    fireEvent.change(field('register-pin'), { target: { value: '1234' } });
    fireEvent.change(field('register-pin-again'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect((await screen.findByRole('alert')).textContent).toContain('10 đến 128');
    expect(calls.some((c) => c.key === 'POST /api/auth/register')).toBe(false);
  });

  it('shows the draft consent and moves on to the parent area after accepting', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ consentAccepted: false, parentGateOpen: true }) }),
      'GET /api/consents/policy': () => ({
        status: 200,
        body: { version: 'draft-1', requiresLegalReview: true, title: 'Đồng ý của phụ huynh', paragraphs: ['Nội dung.'] },
      }),
      'POST /api/consents': () => ({ status: 201, body: me({ parentGateOpen: true }) }),
      'GET /api/children': () => ({ status: 200, body: [] }),
    });
    renderAt('/profiles');
    expect(await screen.findByText('Bản nháp — chờ pháp chế duyệt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là phụ huynh và đồng ý' }));
    expect(await screen.findByRole('heading', { name: 'Tạo hồ sơ cho bé' })).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /api/consents')?.body).toEqual({ policyVersion: 'draft-1' });
  });

  it('asks for the PIN before showing parent-only controls', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me() }),
      'GET /api/children': () => ({ status: 200, body: [] }),
      'POST /api/parent-gate/unlock': () => ({ status: 401, body: { error: 'invalid-pin' } }),
    });
    renderAt('/parent');
    const pin = (await screen.findByLabelText('Nhập mã PIN phụ huynh')) as HTMLInputElement;
    expect(screen.queryByRole('heading', { name: 'Tạo hồ sơ cho bé' })).toBeNull();
    fireEvent.change(pin, { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Mã PIN chưa đúng.');
  });

  it('offers a password re-login when the PIN is locked', async () => {
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ pinLocked: true }) }),
      'GET /api/children': () => ({ status: 200, body: [] }),
      'POST /api/auth/login': () => ({ status: 200, body: me({ parentGateOpen: true }) }),
    });
    renderAt('/parent');
    const field = (await screen.findByLabelText('Mật khẩu')) as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'test-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở lại' }));
    expect(await screen.findByRole('heading', { name: 'Tạo hồ sơ cho bé' })).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /api/auth/login')?.body).toMatchObject({ email: PARENT.email });
  });

  it('shows the PIN prompt again when the server says the gate has closed', async () => {
    let gateOpen = true;
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ parentGateOpen: gateOpen }) }),
      'GET /api/children': () => ({ status: 200, body: [] }),
      'POST /api/children': () => {
        gateOpen = false;
        return { status: 403, body: { error: 'parent-gate-closed' } };
      },
    });
    renderAt('/parent');
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo hồ sơ' }));
    expect(await screen.findByLabelText('Nhập mã PIN phụ huynh')).toBeTruthy();
  });

  it('lets the child pick a profile and enter play', async () => {
    let active: string | null = null;
    const calls = stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me({ activeChildId: active }) }),
      'GET /api/children': () => ({ status: 200, body: [{ id: CHILD, displayName: 'Mèo Mây' }] }),
      [`POST /api/children/${CHILD}/select`]: () => {
        active = CHILD;
        return { status: 200, body: { activeChildId: CHILD } };
      },
      'GET /api/character': () => ({ status: 200, body: { species: 'cat', name: 'Miu', equipped: ['hat-witch-pink'] } }),
    });
    renderAt('/profiles');
    fireEvent.click(await screen.findByRole('button', { name: 'Mèo Mây' }));
    expect(await screen.findByRole('link', { name: 'Thoát' })).toBeTruthy();
    await vi.waitFor(() => expect(gameLifecycle.started).toBeGreaterThan(0));
    expect(gameLifecycle.outfit).toEqual(['hat-witch-pink']);
    expect(calls.map((c) => c.key)).toContain(`POST /api/children/${CHILD}/select`);
    cleanup();
    expect(gameLifecycle.disposed).toBe(gameLifecycle.started);
  });

  it('keeps /play behind a selected profile', async () => {
    stubApi({
      'GET /api/auth/me': () => ({ status: 200, body: me() }),
      'GET /api/children': () => ({ status: 200, body: [] }),
    });
    renderAt('/play');
    expect(await screen.findByRole('heading', { name: 'Ai đang chơi?' })).toBeTruthy();
  });
});
