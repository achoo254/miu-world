import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from './art';
import { buttonClass } from './button';
import { PinPad } from './pin-pad';
import { SkyScene } from './sky-scene';
import { UI_ICONS } from './ui-art';

afterEach(cleanup);

function PinHarness({ maxLength }: { maxLength?: number }) {
  const [pin, setPin] = useState('');
  return (
    <>
      <output data-testid="pin">{pin}</output>
      <PinPad value={pin} onChange={setPin} maxLength={maxLength} />
    </>
  );
}

describe('buttonClass', () => {
  it('composes the variant, size and width classes', () => {
    expect(buttonClass()).toBe('btn btn--primary');
    expect(buttonClass('danger', { small: true, block: true })).toBe('btn btn--danger btn--sm btn--block');
  });
});

describe('PinPad', () => {
  it('types digits, stops at the maximum length, deletes one and clears all', () => {
    render(<PinHarness maxLength={4} />);
    for (const d of ['1', '2', '3', '4', '5']) fireEvent.click(screen.getByRole('button', { name: d }));
    expect(screen.getByTestId('pin').textContent).toBe('1234');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa số cuối' }));
    expect(screen.getByTestId('pin').textContent).toBe('123');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa hết' }));
    expect(screen.getByTestId('pin').textContent).toBe('');
  });

  it('is one labelled group of real buttons', () => {
    render(<PinHarness />);
    const group = screen.getByRole('group', { name: 'Bàn phím số' });
    expect(group.querySelectorAll('button[type="button"]')).toHaveLength(12);
  });
});

describe('Icon', () => {
  it('is hidden from assistive tech unless it carries a label', () => {
    const { container } = render(<Icon name="key" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(`/game-assets/${UI_ICONS.key}`);
    cleanup();
    render(<Icon name="key" label="Chìa khóa" />);
    expect(screen.getByRole('img', { name: 'Chìa khóa' })).toBeTruthy();
  });
});

describe('SkyScene', () => {
  it('adds the brand column only in hero mode', () => {
    render(
      <SkyScene hero>
        <main>nội dung</main>
      </SkyScene>,
    );
    expect(screen.getByText('Miu World')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toBe('nội dung');
    cleanup();
    render(
      <SkyScene>
        <main>nội dung</main>
      </SkyScene>,
    );
    expect(screen.queryByText('Miu World')).toBeNull();
  });
});
