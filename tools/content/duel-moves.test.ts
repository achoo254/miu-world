import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { DUEL_MOVES, duelMoveIssues, type DuelMove } from '../../packages/schema/src/content';
import { duelMovesFor, withDuelMoves } from './duel-moves';

interface BossStep {
  kind: string;
  bossId: string;
  turns: Array<{ id: string; move: DuelMove }>;
}

/** Every boss step of the content (its moves only: the answers are not read). */
const BOSSES: BossStep[] = readdirSync(path.join(CONTENT_DIR, 'quests'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(path.join(CONTENT_DIR, 'quests', f), 'utf8')) as { steps?: BossStep[] }).steps ?? [])
  .filter((s) => s.kind === 'boss');

describe('the moves of a boss fight', () => {
  it('never repeats a move in a row, and any four questions in a row use all four', () => {
    for (const id of ['voi-gac-san', 'trum-ld-hiep-si-da', 'x']) {
      for (const count of [2, 4, 5, 7]) {
        const moves = duelMovesFor(id, count);
        expect(moves).toHaveLength(count);
        moves.forEach((m, i) => i > 0 && expect(m, `${id} #${i}`).not.toBe(moves[i - 1]));
        for (let i = 0; i + 4 <= count; i++) expect(new Set(moves.slice(i, i + 4)).size).toBe(4);
      }
    }
  });

  it('gives the same boss the same moves every time', () => {
    expect(duelMovesFor('canh-cut-dua-thu', 5)).toEqual(duelMovesFor('canh-cut-dua-thu', 5));
  });

  it('gives every boss of the content its moves, by the rules content:check holds', () => {
    expect(BOSSES.length).toBeGreaterThanOrEqual(59);
    for (const boss of BOSSES) expect(duelMoveIssues(boss.turns), boss.bossId).toEqual([]);
  });

  it('opens different bosses on different moves: each move opens at least ten fights', () => {
    for (const move of DUEL_MOVES) expect(BOSSES.filter((b) => b.turns[0]?.move === move).length, move).toBeGreaterThanOrEqual(10);
  });

  it('writes a move line after each question\'s skill line, leaving moves already there and the rest of the file alone', () => {
    const text = [
      '{',
      '  "id": "q",',
      '  "steps": [',
      '    { "id": "a", "kind": "dialogue" },',
      '    {',
      '      "id": "dau",',
      '      "kind": "boss",',
      '      "bossId": "trum-thu",',
      '      "turns": [',
      '        {',
      '          "id": "a",',
      '          "skill": "cong-tru",',
      '          "choices": [{ "id": "a", "text": "1" }]',
      '        },',
      '        {',
      '          "id": "b",',
      '          "skill": "cong-tru",',
      '          "move": "gem",',
      '          "choices": [{ "id": "a", "text": "1" }]',
      '        }',
      '      ]',
      '    }',
      '  ]',
      '}',
      '',
    ].join('\n');
    const written = withDuelMoves(text);
    const parsed = JSON.parse(written) as { steps: BossStep[] };
    expect(parsed.steps[1]?.turns.map((t) => t.move)).toEqual([duelMovesFor('trum-thu', 2)[0], 'gem']);
    expect(written.split('\n')).toHaveLength(text.split('\n').length + 1);
    expect(withDuelMoves(written)).toBe(written);
  });
});
