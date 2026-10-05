// A made-up voice for Chromium's fake microphone in the voice E2E: syllable-like bursts of a few harmonics for 1.5 s,
// then a 1 s pause, looped by Chromium. Its own beep is too short to count as talking. Generated (deterministic),
// so no audio file lives in the repo.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const RATE = 16_000;
const TALK_S = 1.5;
const PAUSE_S = 1;

/** 16-bit mono PCM WAV of one talk-and-pause cycle. */
export function fakeVoiceWav(): Buffer {
  const samples = Math.round((TALK_S + PAUSE_S) * RATE);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / RATE;
    // Four syllables a second, each rising and falling; nothing in the pause.
    const envelope = t < TALK_S ? 0.5 - 0.5 * Math.cos(2 * Math.PI * 4 * t) : 0;
    const voice = 0.5 * Math.sin(2 * Math.PI * 180 * t) + 0.3 * Math.sin(2 * Math.PI * 360 * t) + 0.2 * Math.sin(2 * Math.PI * 720 * t);
    data.writeInt16LE(Math.round(0.6 * envelope * voice * 32_767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Writes the made-up voice to the OS temp folder and returns its path (for `--use-file-for-fake-audio-capture`). */
export function writeFakeVoice(): string {
  const file = path.join(tmpdir(), 'miu-e2e-fake-voice.wav');
  writeFileSync(file, fakeVoiceWav());
  return file;
}
