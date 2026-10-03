// Temporary score probe (removed before hand-off): PROBE=id1,id2 prints bot and idle scores.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { arenaFor, REFERENCE_SCREENS } from '../../round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { playRound } from '../../testing/play-round';

const ids = (process.env.PROBE ?? '').split(',').filter(Boolean);
it.skipIf(ids.length === 0)('probe', async () => {
  for (const id of ids) {
    const spec = MINIGAME_SPECS.get(id);
    if (!spec) throw new Error(id);
    const game = await loadMinigame(id);
    const parts: string[] = [];
    for (const screen of REFERENCE_SCREENS) {
      const { arena } = arenaFor(screen.width, screen.height);
      const bot = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => playRound(game, spec, { arena, seed, player: 'bot' }));
      const idle = [1, 2, 3].map((seed) => playRound(game, spec, { arena, seed, player: 'idle' }).score);
      const s = bot.map((r) => r.score);
      parts.push(`${screen.name}: bot ${Math.min(...s)}-${Math.max(...s)}${bot.some((r) => r.endedEarly) ? '!' : ''} idle ${Math.max(...idle)}`);
    }
    appendFileSync('/private/tmp/claude-501/-Users-hoandat-inet-gitlab-miu-world/51070a80-962b-4736-8834-dd97764a344e/scratchpad/probe.txt', `PROBE ${id} goal ${spec.goal}: ${parts.join(' | ')}` + '\n');
  }
}, 600_000);
