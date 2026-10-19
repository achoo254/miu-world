// Logic steps must show the player everything they are solved with. The challenge screen draws a step's elements
// and grid by the shared table `LOGIC_SHOWS`; a step whose clues or grid that table would hide cannot be solved
// without opening the answer. A maze draws S, G, # and empty cells only, and no two quests share a maze.
import { LOGIC_SHOWS, isUnknownElement, type QuestDefinition } from '../../packages/schema/src/content';

const MAZE_CELLS = new Set(['S', 'G', '#', '.']);

/** Problems with how the screen would show a single logic step, or `[]`. */
export function logicStepIssues(step: { logicType: keyof typeof LOGIC_SHOWS; elements: ReadonlyArray<{ label: string }>; grid?: string[][] }): string[] {
  const issues: string[] = [];
  const shows = LOGIC_SHOWS[step.logicType];
  if (step.elements.length > 0 && !shows.elements) issues.push(`carries ${step.elements.length} element(s) that a ${step.logicType} step does not show: put the clues in the prompt`);
  if (step.grid && !shows.grid) issues.push(`carries a grid that a ${step.logicType} step does not draw`);
  if (step.logicType === 'pattern' && step.elements.filter((e) => isUnknownElement(e.label)).length > 1) issues.push('shows more than one unknown («?») element: a pattern asks for one item');
  if (step.logicType === 'maze') {
    if (!step.grid || step.grid.length === 0) issues.push('is a maze with no grid to draw');
    else {
      const cells = step.grid.flat();
      if (step.grid.some((row) => row.length !== step.grid?.[0]?.length)) issues.push('has a maze grid whose rows differ in length');
      const unknown = [...new Set(cells.filter((c) => !MAZE_CELLS.has(c)))];
      if (unknown.length > 0) issues.push(`has maze cells the screen does not draw (${unknown.join(', ')}): use S, G, # or .`);
      if (cells.filter((c) => c === 'S').length !== 1 || cells.filter((c) => c === 'G').length !== 1) issues.push('needs exactly one start (S) and one goal (G) in its maze grid');
    }
  }
  return issues;
}

/** Every logic step of every quest, held to what the screen shows; no maze grid used by two steps. */
export function checkLogicSteps(quests: Iterable<QuestDefinition>): string[] {
  const issues: string[] = [];
  const mazes = new Map<string, string>();
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    for (const step of quest.steps) {
      if (step.kind !== 'challenge' || step.mechanic !== 'logic') continue;
      const where = `quest ${quest.id} step ${step.id}`;
      for (const issue of logicStepIssues(step)) issues.push(`${where} ${issue}`);
      if (step.logicType !== 'maze' || !step.grid) continue;
      const key = JSON.stringify(step.grid);
      const first = mazes.get(key);
      if (first) issues.push(`${where} draws the same maze as ${first}: give every maze its own grid`);
      else mazes.set(key, where);
    }
  }
  return issues;
}
