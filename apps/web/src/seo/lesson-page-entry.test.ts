import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { takePostLoginTarget } from '../post-login-target';

const CODE = 'AbCdEfGhIjKlMnOpQrStUv';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
  document.body.innerHTML = '<a href="#play" data-play-quest="toan2-cd1-b01" data-play-region="truong-hoc" data-id="lesson-play">Chơi</a>';
});
afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

async function openPageAt(address: string): Promise<void> {
  window.history.replaceState({}, '', address);
  await import('./lesson-page-entry');
  // The visitor's click would leave the page (jsdom cannot): it only has to reach the script's listener.
  document.addEventListener('click', (event) => event.preventDefault());
  document.querySelector<HTMLElement>('[data-id="lesson-play"]')?.click();
}

describe('the lesson page script', () => {
  it('keeps the quest for after sign-in', async () => {
    await openPageAt('/bai/toan-2-bai-1/');
    expect(takePostLoginTarget()).toEqual({ next: '/play?region=truong-hoc&quest=toan2-cd1-b01' });
  });

  it('keeps the invite code of a result shared with an invite, along with the quest', async () => {
    await openPageAt(`/bai/toan-2-bai-1/?utm_source=share&moi=${CODE}`);
    expect(takePostLoginTarget()).toEqual({ next: '/play?region=truong-hoc&quest=toan2-cd1-b01', inviteCode: CODE });
  });

  it('ignores a code that is not an invite code', async () => {
    await openPageAt('/bai/toan-2-bai-1/?moi=<script>');
    expect(takePostLoginTarget()).toEqual({ next: '/play?region=truong-hoc&quest=toan2-cd1-b01' });
  });
});
