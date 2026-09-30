import { describe, expect, it } from 'vitest';
import { fillPlayerName, playerTextIssues } from './player-name';

describe('player name in quest text', () => {
  it('fills every placeholder with the character name', () => {
    expect(fillPlayerName('Chào {name}! {name} ơi, đi thôi.', 'Mochi')).toBe('Chào Mochi! Mochi ơi, đi thôi.');
    expect(fillPlayerName('Không có tên ở đây.', 'Mochi')).toBe('Không có tên ở đây.');
  });

  it('flags the game name used for the player, but not the game title', () => {
    expect(playerTextIssues('Chào Miu!')).toEqual(['says "Miu" instead of {name}']);
    expect(playerTextIssues('Chào mừng tới Miu World!')).toEqual([]);
    expect(playerTextIssues('Chào {name}!')).toEqual([]);
  });

  it('flags placeholders other than {name}', () => {
    expect(playerTextIssues('Chào {ten}!')).toEqual(['unknown placeholder {ten}']);
  });
});
