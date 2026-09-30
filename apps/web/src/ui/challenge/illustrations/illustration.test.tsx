import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IllustrationRef } from '@miu/schema/content';
import { Illustration, handAngles } from './illustration';

afterEach(cleanup);
const draw = (raw: unknown) => render(<Illustration picture={IllustrationRef.parse(raw)} />).container;

describe('run-time illustrations', () => {
  it('points clock hands at the time', () => {
    expect(handAngles(3, 0)).toEqual({ hour: 90, minute: 0 });
    expect(handAngles(15, 30)).toEqual({ hour: 105, minute: 180 });
    const clock = draw({ kind: 'diagram', type: 'clock', params: { hour: 9, minute: 15 } });
    expect(clock.querySelectorAll('.ill-number')).toHaveLength(12);
    expect(clock.querySelector('[data-id="clock-hand-hour"]')).toBeTruthy();
  });

  it('draws one tick per step of a number line, with the asked marks as "?"', () => {
    const line = draw({ kind: 'diagram', type: 'number-line', params: { from: 0, to: 10, step: 1, marks: [7] } });
    expect(line.querySelectorAll('[data-id^="tick-"]')).toHaveLength(11);
    expect(line.querySelector('[data-id="tick-7"] text')?.textContent).toBe('?');
  });

  it('draws centimetre marks on a ruler and labels polyline segments', () => {
    expect(draw({ kind: 'diagram', type: 'ruler', params: { length: 12 } }).querySelectorAll('[data-id^="ruler-cm-"]')).toHaveLength(13);
    const poly = draw({ kind: 'diagram', type: 'polyline', params: { points: [0, 0, 3, 0, 3, 4], lengths: [3, 4] } });
    expect([...poly.querySelectorAll('[data-id^="segment-length-"]')].map((t) => t.textContent)).toEqual(['3 cm', '4 cm']);
  });

  it('labels scales and jugs with their amounts', () => {
    expect(draw({ kind: 'diagram', type: 'scale', params: { left: 2, right: 5 } }).querySelector('svg')?.getAttribute('aria-label')).toBe('Cân đĩa: bên trái 2 kg, bên phải 5 kg');
    expect(draw({ kind: 'diagram', type: 'jug', params: { litres: 3 } }).textContent).toContain('3 l');
  });

  it('shows a known icon and nothing for an unknown one', () => {
    expect(draw({ kind: 'icon', id: 'parrot' }).querySelector('img')).toBeTruthy();
    expect(draw({ kind: 'icon', id: 'dragon' }).querySelector('img')).toBeNull();
  });
});
