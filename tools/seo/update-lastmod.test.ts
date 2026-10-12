import { describe, expect, it } from 'vitest';
import { saigonDay } from './update-lastmod';

describe('saigonDay', () => {
  it('is the day in Asia/Saigon, which is seven hours ahead of UTC', () => {
    expect(saigonDay(new Date('2026-10-12T16:59:00Z'))).toBe('2026-10-12');
    expect(saigonDay(new Date('2026-10-12T17:00:00Z'))).toBe('2026-10-13');
  });
});
