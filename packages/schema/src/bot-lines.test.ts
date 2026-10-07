import { describe, expect, it } from 'vitest';
import { BOT_LINES, BOT_LINE_VARIANTS, BOT_LINE_VOICES, BotLine } from './bot-lines';
import { ServerWsMessage } from './multiplayer';

describe('companion bot lines on the wire', () => {
  it('has ten kinds of line, each worded as often in every voice', () => {
    expect(BOT_LINES).toHaveLength(10);
    expect(new Set(BOT_LINES).size).toBe(BOT_LINES.length);
    expect(BOT_LINE_VARIANTS % BOT_LINE_VOICES).toBe(0);
  });

  it('carries a line kind and a wording, nothing else', () => {
    for (const key of BOT_LINES) {
      expect(BotLine.safeParse({ key, variant: 0 }).success, key).toBe(true);
      expect(BotLine.safeParse({ key, variant: BOT_LINE_VARIANTS - 1 }).success, key).toBe(true);
    }
    expect(BotLine.safeParse({ key: 'hello', variant: BOT_LINE_VARIANTS }).success).toBe(false);
    expect(BotLine.safeParse({ key: 'hello', variant: -1 }).success).toBe(false);
    expect(BotLine.safeParse({ key: 'hello', variant: 1.5 }).success).toBe(false);
    expect(BotLine.safeParse({ key: 'hi there', variant: 0 }).success).toBe(false);
    expect(BotLine.safeParse({ key: 'hello', variant: 0, text: 'free words' }).success).toBe(false);
  });

  it('parses a bot saying a line, to one player or to everyone around', () => {
    expect(ServerWsMessage.parse({ type: 'bot-say', id: 'bot-tt-1', key: 'hello', variant: 3 })).toEqual({ type: 'bot-say', id: 'bot-tt-1', key: 'hello', variant: 3 });
    expect(ServerWsMessage.safeParse({ type: 'bot-say', id: 'bot-tt-1', key: 'invite', variant: 11, to: 'p-abc' }).success).toBe(true);
  });

  it('refuses a line out of range, of an unknown kind, with words of its own, or from someone not a bot', () => {
    expect(ServerWsMessage.safeParse({ type: 'bot-say', id: 'bot-tt-1', key: 'hello', variant: 12 }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'bot-say', id: 'bot-tt-1', key: 'shout', variant: 0 }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'bot-say', id: 'bot-tt-1', key: 'hello', variant: 0, text: 'hi' }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'bot-say', id: 'p-abc', key: 'hello', variant: 0 }).success).toBe(false);
  });

  it('parses what quest a bot is busy with, or none', () => {
    expect(ServerWsMessage.parse({ type: 'bot-doing', id: 'bot-tt-1', quest: 'tv-bai-1-ngay-hom-qua' })).toEqual({ type: 'bot-doing', id: 'bot-tt-1', quest: 'tv-bai-1-ngay-hom-qua' });
    expect(ServerWsMessage.safeParse({ type: 'bot-doing', id: 'bot-tt-1', quest: null }).success).toBe(true);
    expect(ServerWsMessage.safeParse({ type: 'bot-doing', id: 'bot-tt-1' }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'bot-doing', id: 'bot-tt-1', quest: 'Not An Id' }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'bot-doing', id: 'p-abc', quest: null }).success).toBe(false);
  });
});
