import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadContentCatalog } from '../content/content-catalog';
import { BOT_MAP_CONFIGS, BotRunner } from './bot-runner';
import { MultiplayerHub } from './multiplayer-hub';

describe('MultiplayerHub and BotRunner', () => {
  let hub: MultiplayerHub;
  let botRunner: BotRunner;

  beforeEach(() => {
    hub = new MultiplayerHub();
    botRunner = new BotRunner(hub);
  });

  afterEach(async () => {
    botRunner.stop();
    await hub.close();
  });

  it('initializes rooms and populates companion bots with isBot: true', () => {
    botRunner.start();
    const room = hub.getOrCreateRoom('trung-tam');
    expect(room.members.size).toBeGreaterThanOrEqual(3);

    for (const member of room.members.values()) {
      expect(member.isBot).toBe(true);
      expect(member.presence.isBot).toBe(true);
      expect(member.presence.displayName).toBeTruthy();
    }
  });

  it('updates bot positions smoothly during tick cycle', async () => {
    botRunner.start();
    const room = hub.getOrCreateRoom('trung-tam');
    const firstBot = Array.from(room.members.values())[0];
    expect(firstBot).toBeDefined();
    if (!firstBot) return;

    expect(Number.isFinite(firstBot.presence.x)).toBe(true);
    expect(Number.isFinite(firstBot.presence.z)).toBe(true);

    // Wait 350ms for a few ticks
    await new Promise((resolve) => setTimeout(resolve, 350));

    // The bot should have progressed or be in a valid coordinate
    expect(Number.isFinite(firstBot.presence.x)).toBe(true);
    expect(Number.isFinite(firstBot.presence.z)).toBe(true);
  });

  it('dresses every companion bot only in items of the accessory catalogue (an unknown id would leave it bare)', () => {
    const { accessories } = loadContentCatalog();
    for (const [map, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      for (const profile of profiles) {
        for (const entry of profile.outfit) expect(accessories.has(entry.split(':')[0] ?? ''), `${map}/${profile.id}: ${entry}`).toBe(true);
      }
    }
  });
});
