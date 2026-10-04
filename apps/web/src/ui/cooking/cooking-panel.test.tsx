import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CookingPanel } from './cooking-panel';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const sampleRecipes = [
  {
    id: 'banh-mi-trung-op-la',
    name: 'Bánh mì trứng ốp la',
    description: 'Bánh mì vàng giòn kẹp trứng thơm béo.',
    icon: 'sandwich',
    ingredients: [
      { itemId: 'bong-lua-vang', name: 'Bông lúa vàng', qty: 2 },
      { itemId: 'trung-ga-ta', name: 'Trứng gà ta', qty: 1 },
    ],
    resultItemId: 'banh-mi-trung-op-la',
    resultQty: 1,
    hungerRestore: 40,
    happinessBonus: 20,
  },
];

function mockCookingApi(recipes = sampleRecipes, ingredients: Record<string, number> = { 'bong-lua-vang': 5, 'trung-ga-ta': 2 }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/api/cooking/recipes') && method === 'GET') {
        return json({ recipes, ingredients });
      }
      if (url.includes('/api/cooking/cook') && method === 'POST') {
        return json({
          recipe: sampleRecipes[0],
          cookedItem: { id: 'banh-mi-trung-op-la', name: 'Bánh mì trứng ốp la', qty: 1 },
          message: 'Bé đã nấu thành công món Bánh mì trứng ốp la! ✨🍳',
        });
      }
      return json({ error: 'not-found' }, 404);
    }),
  );
}

describe('CookingPanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders recipe list with ingredients and buffs', async () => {
    mockCookingApi();
    render(<CookingPanel />);
    expect(await screen.findByText('Bánh mì trứng ốp la')).toBeTruthy();
    expect(screen.getByText('Bánh mì vàng giòn kẹp trứng thơm béo.')).toBeTruthy();
    expect(screen.getByText(/5\/2/)).toBeTruthy();
    expect(screen.getByText(/2\/1/)).toBeTruthy();
    expect(screen.getByText(/No bụng/)).toBeTruthy();
  });

  it('cooks a recipe when clicking cook button', async () => {
    mockCookingApi();
    const onCooked = vi.fn();
    render(<CookingPanel onCooked={onCooked} />);
    const cookBtn = await screen.findByRole('button', { name: /Nấu món/i });
    fireEvent.click(cookBtn);

    expect(await screen.findByText('Bé đã nấu thành công món Bánh mì trứng ốp la! ✨🍳')).toBeTruthy();
    expect(onCooked).toHaveBeenCalledWith(sampleRecipes[0]);
  });
});
