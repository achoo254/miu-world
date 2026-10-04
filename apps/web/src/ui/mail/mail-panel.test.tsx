import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MailDto, MailListResponse } from '@miu/schema/mail';
import { MailPanel } from './mail-panel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockMailItem: MailDto = {
  id: '12345678-1234-4234-8234-123456789abc',
  templateId: 'welcome-gift',
  sender: 'Hội đồng Đảo Mây',
  title: 'Chào mừng bé đến Đảo Mây!',
  body: 'Chúc bé có những giờ phút học tập vui vẻ!',
  category: 'system',
  isRead: false,
  isClaimed: false,
  reward: {
    coins: 50,
    xp: 50,
    items: {},
  },
  icon: 'gift',
  createdAt: new Date().toISOString(),
};

const mockListResponse: MailListResponse = {
  mail: [mockMailItem],
  unreadCount: 1,
};

describe('MailPanel', () => {
  it('loads and displays mail list and letter details', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/mail')) {
        return {
          ok: true,
          json: async () => mockListResponse,
        } as Response;
      }
      if (url.includes('/read')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const onClose = vi.fn();
    render(<MailPanel onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Hộp thư' })).toBeTruthy();
    expect((await screen.findAllByText('Hội đồng Đảo Mây')).length).toBeGreaterThanOrEqual(1);
    expect((screen.getAllByText('Chào mừng bé đến Đảo Mây!')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Chúc bé có những giờ phút học tập vui vẻ!')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nhận quà' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('claims reward and updates total coins', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/mail')) {
        return {
          ok: true,
          json: async () => mockListResponse,
        } as Response;
      }
      if (url.includes('/claim')) {
        return {
          ok: true,
          json: async () => ({
            claimed: true,
            coins: 50,
            xp: 50,
            items: {},
            totalCoins: 150,
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const onCoinsUpdated = vi.fn();
    render(<MailPanel onClose={vi.fn()} onCoinsUpdated={onCoinsUpdated} />);

    const claimBtn = await screen.findByRole('button', { name: 'Nhận quà' });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đã nhận quà' })).toBeTruthy();
    });
    expect(onCoinsUpdated).toHaveBeenCalledWith(150);
  });
});
