import { describe, expect, it } from 'vitest';
import { npcIcon } from './npc-portrait';

describe('npcIcon', () => {
  it('pictures birds by name, the messenger dove included', () => {
    expect(npcIcon('Bồ Câu Đưa Tin', 'trum-tt-bo-cau')).toBe('bird');
    expect(npcIcon('Chim Sẻ')).toBe('bird');
  });

  it('has no picture for a name it does not know (the portrait shows its first letter)', () => {
    expect(npcIcon('Bác Thợ Rèn', 'trum-tt-ren')).toBeNull();
  });
});
