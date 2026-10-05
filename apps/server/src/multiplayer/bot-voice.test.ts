import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_BOT_LINE_VARIANTS } from '@miu/schema/voice';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { BOT_REPLY_MS, BOT_VOICE_GAP_MS, BOT_VOICE_HELLO_MS, BOT_VOICE_REPLY_MS, BotRunner } from './bot-runner';
import { botVoice, distinctVoices, personaOf, VOICES } from './bot-persona';

let h: ReturnType<typeof hubHarness>;
let runner: BotRunner;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  runner.stop();
  await h.hub.close();
  vi.useRealTimers();
});

/** A player at the plaza of the central map with two of its bots in her party, in the party's voice. */
async function voiceWithBots(random = 0): Promise<{ a: Client; bots: string[] }> {
  runner = new BotRunner(h.hub, { random: () => random });
  runner.start();
  const a = await h.joined('child-a', [395, 13, 420]);
  const bots = ['bot-tt-1', 'bot-tt-2'];
  a.send({ type: 'party-invite', to: bots[0] });
  await vi.advanceTimersByTimeAsync(BOT_REPLY_MS + 100);
  // The leader invites the second bot by its id once it walks by (the party frame's own invite needs it near).
  h.hub.parties.invite(a.id, bots[1] ?? '');
  h.hub.answerPartyInvite(bots[1] ?? '', a.id, true);
  await settle();
  expect(a.last('party-state')?.party?.members.map((m) => m.id)).toEqual([a.id, ...bots]);
  a.send({ type: 'voice-join', mic: true });
  await settle();
  return { a, bots };
}

const said = (a: Client) => a.all('voice-bot-say');

describe('companion bots in a party voice', () => {
  it('greet a player who comes into the voice, one bot for the party', async () => {
    const { a, bots } = await voiceWithBots();
    await vi.advanceTimersByTimeAsync(BOT_VOICE_HELLO_MS + 50);
    expect(said(a)).toHaveLength(1);
    expect(said(a)[0]?.line.key).toBe('hello');
    expect(bots).toContain(said(a)[0]?.id);
  });

  it('wait for her to stop talking, then one answers with a line fitting how long she talked; turns go round', async () => {
    const { a } = await voiceWithBots();
    await vi.advanceTimersByTimeAsync(BOT_VOICE_HELLO_MS + BOT_VOICE_GAP_MS);
    const greeter = said(a)[0]?.id;
    a.send({ type: 'voice-speaking', on: true });
    await vi.advanceTimersByTimeAsync(800);
    a.send({ type: 'voice-speaking', on: false });
    await vi.advanceTimersByTimeAsync(2 * BOT_VOICE_REPLY_MS + 50);
    expect(said(a)).toHaveLength(2);
    const reply = said(a)[1];
    expect(reply?.line.key).toBe('yes');
    expect(reply?.id).not.toBe(greeter);

    await vi.advanceTimersByTimeAsync(BOT_VOICE_GAP_MS);
    a.send({ type: 'voice-speaking', on: true });
    await vi.advanceTimersByTimeAsync(6_000);
    a.send({ type: 'voice-speaking', on: false });
    await vi.advanceTimersByTimeAsync(2 * BOT_VOICE_REPLY_MS + 50);
    expect(said(a)[2]?.line.key).toBe('more');
    expect(said(a)[2]?.id).toBe(greeter);
  });

  it('never talk over a player: a line about to be said waits when she starts again', async () => {
    const { a } = await voiceWithBots();
    await vi.advanceTimersByTimeAsync(BOT_VOICE_HELLO_MS + BOT_VOICE_GAP_MS);
    const before = said(a).length;
    a.send({ type: 'voice-speaking', on: true });
    await vi.advanceTimersByTimeAsync(2_000);
    a.send({ type: 'voice-speaking', on: false });
    await vi.advanceTimersByTimeAsync(200);
    a.send({ type: 'voice-speaking', on: true });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(said(a)).toHaveLength(before);
  });

  it('say fresh lines in their own voice, never the same twice in a row', async () => {
    const { a } = await voiceWithBots(0.5);
    for (let i = 0; i < 6; i += 1) {
      await vi.advanceTimersByTimeAsync(BOT_VOICE_GAP_MS + 100);
      a.send({ type: 'voice-speaking', on: true });
      await vi.advanceTimersByTimeAsync(500);
      a.send({ type: 'voice-speaking', on: false });
      await vi.advanceTimersByTimeAsync(2 * BOT_VOICE_REPLY_MS + 50);
    }
    const lines = said(a);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) {
      expect(line.line.variant).toBeLessThan(VOICE_BOT_LINE_VARIANTS);
      expect(line.line.variant % VOICES).toBe(personaOf(line.id).voice);
    }
    const byBot = new Map<string, number[]>();
    for (const line of lines.filter((l) => l.line.key === 'yes')) byBot.set(line.id, [...(byBot.get(line.id) ?? []), line.line.variant]);
    for (const variants of byBot.values()) for (let i = 1; i < variants.length; i += 1) expect(variants[i]).not.toBe(variants[i - 1]);
  });

  it('stop when she leaves the voice', async () => {
    const { a } = await voiceWithBots();
    a.send({ type: 'voice-leave' });
    await vi.advanceTimersByTimeAsync(BOT_VOICE_HELLO_MS + 100);
    expect(said(a)).toEqual([]);
  });
});

describe('bot voices', () => {
  it('follow the persona: the same bot always sounds the same, within speech-synthesis bounds', () => {
    for (const id of ['bot-tt-1', 'bot-tt-2', 'bot-cp-1', 'bot-tt-1@p-home']) {
      const voice = botVoice(id);
      expect(voice).toEqual(botVoice(id.split('@')[0] ?? id));
      expect(voice.pitch).toBeGreaterThanOrEqual(0.5);
      expect(voice.pitch).toBeLessThanOrEqual(2);
      expect(voice.rate).toBeGreaterThanOrEqual(0.85);
      expect(voice.rate).toBeLessThanOrEqual(1.25);
    }
  });

  it('never sound alike in one channel', () => {
    const ids = ['bot-tt-1', 'bot-tt-2', 'bot-tt-3', 'bot-tt-4'];
    const voices = [...distinctVoices(ids).values()].map((v) => v.pitch);
    for (let i = 0; i < voices.length; i += 1) for (let j = i + 1; j < voices.length; j += 1) expect(Math.abs((voices[i] ?? 0) - (voices[j] ?? 0))).toBeGreaterThanOrEqual(0.2);
  });
});
