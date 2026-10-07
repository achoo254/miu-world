import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Group, Sprite } from 'three';
import type { PlayerPresence } from '@miu/schema/multiplayer';
import type { GuardedGltfLoader } from '../asset-loader';
import { setLangMode } from '../../ui/i18n/i18n';
import { RemotePlayerManager } from './remote-player-manager';

// No model loads here: the character is an empty group, and the name tags and bubbles are recorded, not painted.
const tags: Array<{ name: string; isBot: boolean; partyMate: boolean; busy: boolean }> = [];
const shown: string[] = [];

vi.mock('../entities/player-character', () => ({
  loadPlayerCharacter: async (_loader: unknown, _species: string, outfit: string[]) => ({ root: new Group(), outfit, wear: () => {}, update: () => {} }),
}));

vi.mock('../ambient/speech-bubble', () => ({
  createSpeechBubble: () => ({ sprite: new Sprite(), showing: false, show: (text: string) => shown.push(text), hide: () => {}, update: () => {} }),
}));

vi.mock('./multiplayer-nametag', () => ({
  createNametag: (name: string, isBot: boolean, partyMate = false, busy = false) => {
    tags.push({ name, isBot, partyMate, busy });
    return new Sprite();
  },
  createSpeakingMark: () => new Sprite(),
}));

const bot = (id: string): PlayerPresence => ({
  id,
  displayName: 'Bé Bông',
  isBot: true,
  species: 'rabbit',
  outfit: [],
  pet: null,
  petGear: [],
  x: 1,
  y: 2,
  z: 3,
  yaw: 0,
  speed: 0,
  action: 'idle',
  riding: false,
  bubble: null,
});

const manager = (): RemotePlayerManager => new RemotePlayerManager({} as unknown as GuardedGltfLoader, (_x, _z, y) => y, false);

beforeEach(() => {
  tags.length = 0;
  shown.length = 0;
  setLangMode('vi', false);
});

describe('a bot busy with a quest', () => {
  it('shows the quest scroll on its name tag while busy, and drops it when done', async () => {
    const remote = manager();
    await remote.spawn(bot('bot-tt-1'));
    expect(tags.at(-1)).toEqual({ name: 'Bé Bông', isBot: true, partyMate: false, busy: false });
    remote.setBusy('bot-tt-1', true);
    expect(tags.at(-1)?.busy).toBe(true);
    const drawn = tags.length;
    remote.setBusy('bot-tt-1', true);
    expect(tags).toHaveLength(drawn);
    remote.setBusy('bot-tt-1', false);
    expect(tags.at(-1)?.busy).toBe(false);
    remote.dispose();
  });

  it('keeps the mark for a bot that is still loading, and forgets it once the bot leaves the room', async () => {
    const remote = manager();
    const loading = remote.spawn(bot('bot-tt-2'));
    remote.setBusy('bot-tt-2', true);
    await loading;
    expect(tags.at(-1)?.busy).toBe(true);
    remote.despawn('bot-tt-2');
    await remote.spawn(bot('bot-tt-2'));
    expect(tags.at(-1)?.busy).toBe(false);
    remote.dispose();
  });

  it('keeps the mark when the bot is rebuilt as another species', async () => {
    const remote = manager();
    await remote.spawn(bot('bot-tt-3'));
    remote.setBusy('bot-tt-3', true);
    remote.applyAppearance('bot-tt-3', { displayName: 'Bé Bông', species: 'cat', outfit: [], pet: null, petGear: [] });
    await vi.waitFor(() => expect(tags.at(-1)).toMatchObject({ busy: true }));
    remote.dispose();
  });
});

describe('a bot’s own line', () => {
  it('shows over the bot in the display language', async () => {
    const remote = manager();
    await remote.spawn(bot('bot-tt-1'));
    const line = { vi: 'Chào bạn!', en: 'Hi there!' };
    remote.sayLine('bot-tt-1', line);
    setLangMode('en', false);
    remote.sayLine('bot-tt-1', line);
    setLangMode('both', false);
    remote.sayLine('bot-tt-1', line);
    expect(shown).toEqual(['Chào bạn!', 'Hi there!', 'Chào bạn! / Hi there!']);
    remote.sayLine('bot-not-here', line);
    expect(shown).toHaveLength(3);
    remote.dispose();
  });
});
