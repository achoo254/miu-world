import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PetCareResponse, PetCareStatusResponse } from '@miu/schema/pet-care';
import { PetCarePanel } from './pet-care-panel';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockPetCareApi(status: PetCareStatusResponse, actionResponse?: PetCareResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/api/character/pet/care') && method === 'GET') {
        return json(status);
      }
      if (url.includes('/api/character/pet/care') && method === 'POST') {
        const fallback: PetCareResponse = {
          stats: { happiness: 100, fullness: 90, cleanliness: 95 },
          message: 'Bé cưng rất thích!',
          emote: 'love',
          friendshipTier: 2,
          title: 'Bạn Thân Thiết',
        };
        return json(actionResponse ?? fallback);
      }
      return json({ error: 'not-found' }, 404);
    }),
  );
}

describe('PetCarePanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders empty message when no pet is equipped', async () => {
    mockPetCareApi({ hasPet: false, petId: null });
    render(<PetCarePanel />);
    expect(await screen.findByText('Bé chưa chọn thú cưng đồng hành!')).toBeTruthy();
  });

  it('renders pet stats and friendship tier', async () => {
    mockPetCareApi({
      hasPet: true,
      petId: 'meo-xam',
      petName: 'Mèo xám',
      stats: { happiness: 85, fullness: 70, cleanliness: 90 },
      friendshipTier: 3,
      title: 'Tri Kỷ Nhỏ',
    });

    render(<PetCarePanel />);
    expect(await screen.findByText('Mèo xám')).toBeTruthy();
    expect(screen.getByText(/Tri Kỷ Nhỏ/)).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('triggers action when clicking action button', async () => {
    mockPetCareApi(
      {
        hasPet: true,
        petId: 'meo-xam',
        petName: 'Mèo xám',
        stats: { happiness: 60, fullness: 50, cleanliness: 60 },
        friendshipTier: 1,
        title: 'Bạn Đồng Hành',
      },
      {
        stats: { happiness: 80, fullness: 50, cleanliness: 60 },
        message: 'Mèo xám dụi đầu vào tay bạn thật âu yếm! ❤️',
        emote: 'love',
        friendshipTier: 2,
        title: 'Bạn Thân Thiết',
      },
    );

    const onFeedback = vi.fn();
    render(<PetCarePanel onActionFeedback={onFeedback} />);
    const petBtn = await screen.findByRole('button', { name: /Vuốt ve/i });
    fireEvent.click(petBtn);

    expect(await screen.findByText('Mèo xám dụi đầu vào tay bạn thật âu yếm! ❤️')).toBeTruthy();
    expect(onFeedback).toHaveBeenCalledWith('pet', 'Mèo xám dụi đầu vào tay bạn thật âu yếm! ❤️', 'love');
  });
});
