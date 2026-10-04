import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../kit/modal';
import { OfflineBanner } from './offline-banner';
import { PauseScreen } from './pause-screen';
import { SettingsDialog } from './settings-dialog';
import { readMusicOn, readSoundOn } from './sound-setting';
import { readFontSize, readReduceMotion } from './display-setting';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-reduced-motion');
  document.documentElement.removeAttribute('data-font-size');
});

describe('Modal', () => {
  it('moves focus in, keeps Tab inside, closes on Esc and gives focus back', () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(
      <Modal title="Hộp thoại" onClose={onClose}>
        <button type="button">Một</button>
        <button type="button">Hai</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Hộp thoại' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Một');
    screen.getByRole('button', { name: 'Hai' }).focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement?.textContent).toBe('Một');
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement?.textContent).toBe('Hai');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('PauseScreen', () => {
  const renderPause = (onResume = vi.fn(), onRescue = vi.fn()) =>
    render(
      <MemoryRouter>
        <PauseScreen onResume={onResume} onRescue={onRescue} homePath="/profiles" />
      </MemoryRouter>,
    );

  it('offers a way back to a safe spot for a stuck Miu', () => {
    const onRescue = vi.fn();
    renderPause(vi.fn(), onRescue);
    fireEvent.click(screen.getByRole('button', { name: /Về chỗ an toàn/ }));
    expect(onRescue).toHaveBeenCalledTimes(1);
  });

  it('resumes from the button or Esc, and links home', () => {
    const onResume = vi.fn();
    renderPause(onResume);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chơi/ }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Tạm dừng' }), { key: 'Escape' });
    expect(onResume).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('link', { name: /Về trang chủ/ }).getAttribute('href')).toBe('/profiles');
  });

  it('remembers sound on/off on this device, on by default', () => {
    expect(readSoundOn()).toBe(true);
    renderPause();
    const sound = screen.getByRole('button', { name: /Âm thanh: Bật/ });
    fireEvent.click(sound);
    expect(sound.getAttribute('aria-pressed')).toBe('false');
    expect(readSoundOn()).toBe(false);
  });

  it('still works when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderPause();
    fireEvent.click(screen.getByRole('button', { name: /Âm thanh: Bật/ }));
    expect(screen.getByRole('button', { name: /Âm thanh: Tắt/ })).toBeTruthy();
  });

  it('toggles background music on and off', () => {
    expect(readMusicOn()).toBe(true);
    renderPause();
    const musicBtn = screen.getByRole('button', { name: /Nhạc nền: Bật/ });
    fireEvent.click(musicBtn);
    expect(readMusicOn()).toBe(false);
    expect(screen.getByRole('button', { name: /Nhạc nền: Tắt/ })).toBeTruthy();
  });

  it('adjusts motion reduction and font size', () => {
    renderPause();
    const reduceBtn = screen.getByRole('radio', { name: /Giảm bớt/ });
    fireEvent.click(reduceBtn);
    expect(readReduceMotion()).toBe(true);
    expect(document.documentElement.dataset.reducedMotion).toBe('true');

    const largeFontBtn = screen.getByRole('radio', { name: /Lớn/ });
    fireEvent.click(largeFontBtn);
    expect(readFontSize()).toBe('large');
    expect(document.documentElement.dataset.fontSize).toBe('large');
  });
});

describe('SettingsDialog', () => {
  it('renders all grouped settings and links', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <SettingsDialog onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: 'Cài đặt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Âm thanh: Bật/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Nhạc nền: Bật/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Đổi nhân vật/ }).getAttribute('href')).toBe('/create');
    expect(screen.getByRole('link', { name: /Đổi hồ sơ/ }).getAttribute('href')).toBe('/profiles');

    fireEvent.click(screen.getByRole('button', { name: /Xong/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});


describe('OfflineBanner', () => {
  it('retries once per press and shows that it is reconnecting', async () => {
    let finish: () => void = () => undefined;
    const onRetry = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<OfflineBanner onRetry={onRetry} />);
    expect(screen.getByRole('dialog', { name: 'Mất kết nối mạng' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    const busy = screen.getByRole('button', { name: 'Đang kết nối lại…' }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    finish();
    expect(await screen.findByRole('button', { name: 'Thử kết nối lại' })).toBeTruthy();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
