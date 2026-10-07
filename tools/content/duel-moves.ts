// `pnpm exec tsx tools/content/duel-moves.ts`: gives every boss question in content/quests that has no `move` yet the
// move of the rotation below, written into the file in place (one `"move"` line after the question's `"skill"` line,
// so the rest of the file keeps its layout). Re-runnable: a move already there, set by hand or by a generator, stays.
// The zone guardians' generator (build-guardian-quests.ts) writes the same rotation itself.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DUEL_MOVES, type DuelMove } from '../../packages/schema/src/content';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';

/** FNV-1a of the boss id: the same boss starts on the same move whoever builds the content. */
function hashOf(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * The moves of a boss's questions, in play order: from a start picked by the boss id, one step round the four moves
 * each question, forward or backward (also picked by the id). Two questions in a row never share a move, any four in a
 * row use all four, and different bosses open on different moves.
 */
export function duelMovesFor(bossId: string, count: number): DuelMove[] {
  const h = hashOf(bossId);
  const start = h % DUEL_MOVES.length;
  const step = (h >>> 2) % 2 === 0 ? 1 : DUEL_MOVES.length - 1;
  return Array.from({ length: count }, (_, i) => DUEL_MOVES[(start + step * i) % DUEL_MOVES.length] ?? 'fling');
}

interface RawBossStep {
  kind: string;
  bossId?: string;
  turns?: Array<{ id: string; move?: string }>;
}

/**
 * The file's text with a `"move"` line after the `"skill"` line of each boss question that has none. Questions are
 * found in order from their boss step's `"turns"`, so an id used elsewhere in the file (a choice's `a`) is never taken
 * for one. Returns the text unchanged when every question has its move.
 */
export function withDuelMoves(text: string): string {
  const quest = JSON.parse(text) as { steps?: RawBossStep[] };
  let out = text;
  let cursor = 0;
  for (const step of quest.steps ?? []) {
    if (step.kind !== 'boss' || !step.bossId || !step.turns) continue;
    const moves = duelMovesFor(step.bossId, step.turns.length);
    const turnsAt = out.indexOf('"turns"', out.indexOf(`"bossId": "${step.bossId}"`, cursor));
    if (turnsAt < 0) throw new Error(`boss ${step.bossId}: no "turns" after its id`);
    cursor = turnsAt;
    step.turns.forEach((turn, i) => {
      const idAt = out.indexOf(`"id": "${turn.id}"`, cursor);
      if (idAt < 0) throw new Error(`boss ${step.bossId}: turn ${turn.id} not found in order`);
      cursor = idAt;
      if (turn.move !== undefined) return;
      const skill = /\n([ \t]*)"skill": "[^"]*",?\n/.exec(out.slice(idAt));
      if (!skill) throw new Error(`boss ${step.bossId}: turn ${turn.id} has no "skill" line`);
      const lineEnd = idAt + skill.index + skill[0].length;
      const indent = skill[1] ?? '';
      // The skill line is never a question's last key (choices follow it): it already ends with a comma.
      out = `${out.slice(0, lineEnd)}${indent}"move": "${moves[i] ?? 'fling'}",\n${out.slice(lineEnd)}`;
      cursor = lineEnd;
    });
  }
  return out;
}

function main(): void {
  const dir = path.join(CONTENT_DIR, 'quests');
  let written = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const at = path.join(dir, file);
    const text = readFileSync(at, 'utf8');
    const next = withDuelMoves(text);
    if (next === text) continue;
    writeFileSync(at, next);
    written++;
  }
  console.log(`${written} quest files given their boss moves`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
