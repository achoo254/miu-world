// Recording one step of one player's quest, in its own transaction: the server grades the answer, keeps per-step
// counters (never the answer itself), moves her progress, opens the step's knowledge gates and pays the run on the
// last step from the catalogue. The step route calls it for the player herself; a party's run of a quest calls it
// for the other members when a step they share was done by one of them (`serverSide`: it names the next run itself).
import { and, eq } from "drizzle-orm";
import {
  stepTargets,
  type ActiveQuest,
  type QuestStep,
} from "@miu/schema/content";
import type { QuestCompletion, StepCompleteRequest } from "@miu/schema/game";
import {
  completeStep,
  isAnswerable,
  type StepError,
} from "@miu/quest/quest-progress";
import type { ContentCatalog } from "../content/content-catalog";
import type { Db } from "../db/client";
import { questProgress } from "../db/schema";
import { HttpError } from "../http-error";
import { paidRuns, questSource, recordedReward } from "../reward/reward-ledger";
import { runFinished } from "./quest-access";
import { openGates, type OpenedGate } from "./knowledge-gate";
import { finishQuest } from "./quest-completion";
import { countAttempt, wrongAnswers } from "./step-attempts";
import type { RewardSpec } from "@miu/schema/content";

type ProgressRow = typeof questProgress.$inferSelect;

export interface RecordedStep {
  correct: boolean;
  feedback: { vi: string; en: string | null } | null;
  row: ProgressRow | undefined;
  paid: number;
  reward: RewardSpec | null;
  repeated: boolean;
  completion: QuestCompletion | null;
  gates: OpenedGate[];
}

const STEP_ERRORS: Record<
  Exclude<StepError, "already-completed" | "wrong-answer">,
  readonly [number, string]
> = {
  "unknown-step": [404, "step-not-found"],
  "out-of-order": [409, "out-of-order"],
  "answer-required": [400, "answer-required"],
  "target-required": [400, "target-required"],
  "unknown-target": [400, "unknown-target"],
};

/**
 * The step's line for this attempt: the n-th wrong answer hears the n-th wrong line, a right answer after
 * n mistakes hears the n-th right line, cycling, so two tries in a row never get the same line. A boss with its own
 * lines rotates its blow lines over the blows landed (`landed`) and its miss lines over the misses, and says its win
 * line on the last blow.
 */
function feedbackLine(
  step: QuestStep | undefined,
  kind: "right" | "wrong",
  attempt: number,
  choice?: string,
  boss?: { landed: number; won: boolean },
): { vi: string; en: string | null } | null {
  if (step?.kind === "decision" && choice) {
    const index = step.choices.findIndex((c) => c.id === choice);
    const found = step.choices[index];
    if (found)
      return {
        vi: found.consequence,
        en: step.en?.choices[index]?.consequence ?? null,
      };
  }
  if (step?.kind === "boss") {
    if (step.feedback) {
      if (kind === "right" && boss?.won) return { vi: step.winDialogue, en: step.en?.winDialogue ?? null };
      // Blows rotate on the blows landed, misses on the misses: the next line of a kind is always another one.
      const lines = step.feedback[kind];
      const at = (kind === "right" ? Math.max(0, (boss?.landed ?? 1) - 1) : attempt) % lines.length;
      return { vi: lines[at] ?? "", en: step.feedback.en?.[kind][at] ?? null };
    }
    // A boss without lines of its own says only its win line, on the blow that wins.
    if (kind === "right") return boss?.won ? { vi: step.winDialogue, en: step.en?.winDialogue ?? null } : null;
    return { vi: "Suýt đúng rồi! Bé thử suy nghĩ lại một chút nhé!", en: null };
  }
  const feedback = step && isAnswerable(step) ? step.feedback : undefined;
  const lines = feedback?.[kind];
  if (!lines || lines.length === 0) return null;
  const at = attempt % lines.length;
  return { vi: lines[at] ?? "", en: feedback?.en?.[kind][at] ?? null };
}

export async function recordStep(
  {
    db,
    content,
    clock,
  }: { db: Db; content: ContentCatalog; clock: () => Date },
  childId: string,
  quest: ActiveQuest,
  stepId: string,
  input: StepCompleteRequest,
  serverSide = false,
): Promise<RecordedStep> {
  const questId = quest.id;
  const stepDef: QuestStep | undefined = quest.steps.find(
    (s) => s.id === stepId,
  );
  const now = clock();
  const thisProgressRow = and(
    eq(questProgress.childId, childId),
    eq(questProgress.questId, questId),
  );
  return db.transaction(async (tx) => {
    // Create-then-lock the progress row so concurrent calls for the same quest run one after another.
    await tx
      .insert(questProgress)
      .values({ childId, questId })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(questProgress)
      .where(thisProgressRow)
      .for("update");
    const paid = await paidRuns(tx, childId, questId);
    let current = {
      completedSteps: row?.completedSteps ?? [],
      completed: false,
      found: row?.found ?? {},
    };
    const repeated = async () => ({
      correct: true,
      feedback: null,
      row,
      paid,
      reward:
        paid > 0
          ? await recordedReward(tx, childId, questSource(questId, paid))
          : null,
      repeated: true,
      completion: null,
      gates: [],
    });
    if (row?.completedAt) {
      // Finished before: every run pays again (owner, 03/10/2026), but only a request naming the next run
      // moves it. A request resent from a paid run (or one without a run) changes nothing.
      if ((serverSide ? paid + 1 : input.run) !== paid + 1) return repeated();
      // The next run starts from the first step, with nothing found yet.
      if (runFinished(row, quest))
        current = { completedSteps: [], completed: false, found: {} };
    }
    const run = paid + 1;
    const result = completeStep(quest, current, stepId, input);
    if (!result.ok) {
      if (result.error === "already-completed") return repeated();
      if (result.error === "wrong-answer") {
        // Try again as often as needed; only the count is kept, never the answer.
        const wrong = await countAttempt(
          tx,
          { childId, questId, stepId },
          "wrongCount",
        );
        return {
          correct: false,
          feedback: feedbackLine(stepDef, "wrong", wrong - 1),
          row,
          paid,
          reward: null,
          repeated: false,
          completion: null,
          gates: [] as OpenedGate[],
        };
      }
      const [status, code] = STEP_ERRORS[result.error];
      throw new HttpError(status, code);
    }
    const [updated] = await tx
      .update(questProgress)
      // The first finish is kept as the quest's finish date: a replay under way never unfinishes it.
      .set({
        completedSteps: result.progress.completedSteps,
        found: result.progress.found,
        completedAt:
          row?.completedAt ?? (result.progress.completed ? now : null),
      })
      .where(thisProgressRow)
      .returning();
    // Read before finishing: scoring the quest clears its counters.
    const choice =
      input.answer && "choice" in input.answer
        ? input.answer.choice
        : undefined;
    const feedback = feedbackLine(
      stepDef,
      "right",
      await wrongAnswers(tx, { childId, questId, stepId }),
      choice,
      stepDef?.kind === "boss"
        ? {
            landed: (result.progress.found[stepId] ?? []).length,
            won: result.progress.completedSteps.includes(stepId),
          }
        : undefined,
    );
    // The step's knowledge gates pay their treasure once per run: a search pays for the target just found, any
    // other step for its own target; a target the client names outside the step opens nothing.
    // A boss opens its gate once won, not on its first right turn.
    const own = stepDef ? stepTargets(stepDef) : [];
    const searching =
      stepDef?.kind === "search" || stepDef?.kind === "find-object";
    const stepDone = result.progress.completedSteps.includes(stepId);
    const reached = searching
      ? own.filter((target) => target === input.target)
      : stepDone
        ? own
        : [];
    const gates: OpenedGate[] = await openGates(
      tx,
      content,
      childId,
      reached,
      questSource(questId, run),
      now,
    );
    if (!result.reward)
      return {
        correct: true,
        feedback,
        row: updated,
        paid,
        reward: null,
        repeated: false,
        completion: null,
        gates,
      };
    const finished = await finishQuest(tx, content, childId, quest, now, run);
    const [scored] = await tx
      .select()
      .from(questProgress)
      .where(thisProgressRow);
    return {
      correct: true,
      feedback,
      row: scored,
      paid: run,
      reward: finished.reward,
      repeated: false,
      completion: finished.completion,
      gates,
    };
  });
}
