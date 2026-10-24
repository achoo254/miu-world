// No textbook wording in the game. The first learning quests were built from two textbooks, word for word; they are
// being rewritten in our own words. This check refuses text that matches the textbooks' keyed fingerprints
// (tools/learning/textbook-fingerprints.ts) in every quest and topic, and tracks the quests still waiting to be
// rewritten in tools/content/textbook-copy-pending.json, a list that may only shrink (it stays within the 70 quests
// of tools/content/textbook-copy-baseline.ts):
//  - a quest outside the list may not match the fingerprints, nor keep a textbook link (`lesson`, `curriculumRef`, a
//    worksheet's `lessonId`, a passage's `author` or `section`), and each of its passages says where it comes from;
//  - a quest on the list that no longer matches and no longer keeps a textbook link must leave the list.
// Folk and public-domain passages are scanned too: a traditional verse may read the same as in a book, so a match is
// allowed only when tools/content/allowed-traditional-passages.json lists that passage with a reason a reviewer can
// read. A public-domain author must have died long enough ago: protection lasts 50 years after the year of death.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { QuestDefinition } from '../../packages/schema/src/content';
import type { Topic } from '../../packages/schema/src/learning';
import { fingerprintKey, readFingerprints, shingleHashes, SHINGLE_WORDS, KEY_FILE_IN_ICLOUD } from '../learning/textbook-fingerprints';
import { playerLines } from './content-variety';
import { TEXTBOOK_COPY_BASELINE } from './textbook-copy-baseline';

export const PENDING_FILE = path.join(import.meta.dirname, 'textbook-copy-pending.json');
export const COMMON_PHRASES_FILE = path.join(import.meta.dirname, 'allowed-common-phrases.json');
export const TRADITIONAL_PASSAGES_FILE = path.join(import.meta.dirname, 'allowed-traditional-passages.json');

/** A line matching this many textbook shingles or more is copied, not a common turn of phrase. */
export const COPY_THRESHOLD = 2;
/** Years of protection after the year the author died (Luật Sở hữu trí tuệ, Điều 27). */
const PROTECTION_YEARS = 50;

export interface CopyContext {
  key: Buffer;
  fingerprints: ReadonlySet<number>;
  /** Shingles of the allowed common phrases, never counted as copied outside passages. */
  allowed: ReadonlySet<number>;
  /** Quests still waiting to be rewritten. */
  pending: ReadonlySet<string>;
  /** Traditional passages allowed to match the textbooks, as "<quest id>/<text id>". */
  traditional: ReadonlySet<string>;
  /** The current year (protection ends on 31 December of the 50th year after death). */
  year: number;
  /** Quests the waiting list may name; the repo's 70 first learning quests by default. */
  baseline?: ReadonlySet<string>;
}

type Hashing = Pick<CopyContext, 'key' | 'fingerprints' | 'allowed'>;

/** Shingles of each allowed phrase; each entry gives the phrase and why it is allowed. */
export function commonPhraseShingles(raw: unknown, key: Buffer): { shingles: Set<number>; issues: string[] } {
  const issues: string[] = [];
  const shingles = new Set<number>();
  const list = (raw as { phrases?: unknown }).phrases;
  if (!Array.isArray(list)) return { shingles, issues: ['allowed-common-phrases.json: expected { "phrases": [{ "phrase", "reason" }] }'] };
  for (const entry of list as Array<{ phrase?: unknown; reason?: unknown }>) {
    if (typeof entry.phrase !== 'string' || typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      issues.push(`allowed-common-phrases.json: every phrase needs a reason (${JSON.stringify(entry)})`);
      continue;
    }
    const hashes = shingleHashes(entry.phrase, key);
    if (hashes.length === 0) issues.push(`allowed-common-phrases.json: "${entry.phrase}" is shorter than ${SHINGLE_WORDS} words and never counted anyway`);
    for (const h of hashes) shingles.add(h);
  }
  return { shingles, issues };
}

/** Allowed traditional passages, as "<quest id>/<text id>"; each entry gives the reason. */
export function traditionalPassages(raw: unknown): { passages: Set<string>; issues: string[] } {
  const issues: string[] = [];
  const passages = new Set<string>();
  const list = (raw as { passages?: unknown }).passages;
  if (!Array.isArray(list)) return { passages, issues: ['allowed-traditional-passages.json: expected { "passages": [{ "quest", "text", "reason" }] }'] };
  for (const entry of list as Array<{ quest?: unknown; text?: unknown; reason?: unknown }>) {
    if (typeof entry.quest !== 'string' || typeof entry.text !== 'string' || typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      issues.push(`allowed-traditional-passages.json: every passage names its quest, its text and a reason (${JSON.stringify(entry)})`);
      continue;
    }
    passages.add(`${entry.quest}/${entry.text}`);
  }
  return { passages, issues };
}

const isCopied = (h: number, context: Hashing, strict: boolean) => context.fingerprints.has(h) && (strict || !context.allowed.has(h));

/** How many of the line's shingles are textbook shingles (allowed phrases left out unless `strict`). */
export function copiedShingles(text: string, context: Hashing, strict = false): number {
  return shingleHashes(text, context.key).filter((h) => isCopied(h, context, strict)).length;
}

/**
 * The longest stretch of consecutive textbook shingles in the text: 2 means at least 8 words in a row. Used on a step's
 * lines read together, where single common phrases from separate lines would otherwise add up.
 */
export function longestCopiedRun(text: string, context: Hashing): number {
  let best = 0;
  let run = 0;
  for (const h of shingleHashes(text, context.key)) {
    run = isCopied(h, context, false) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

const preview = (text: string) => `"${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`;

/** The step a player line belongs to (`steps[3].prompt` → 3), or null for quest-level text. */
const stepIndex = (where: string): number | null => {
  const match = /^steps\[(\d+)\]/.exec(where);
  return match?.[1] ? Number(match[1]) : null;
};

/**
 * Lines of the quest that copy the textbooks, as "<where>: <start of the line>". A line is checked on its own, and each
 * step's lines are checked joined, so a sentence cut into short labels (a sort, a dialogue) is still caught; a sort is
 * also joined in its answer order. Joined lines count only a stretch of consecutive matches, not common phrases of
 * separate lines that happen to add up. Passages are listed apart (`copiedPassages`).
 */
export function copiedLines(quest: QuestDefinition, context: Hashing): string[] {
  if (quest.status === 'stub') return [];
  const lines = playerLines(quest);
  const found = lines.filter((l) => copiedShingles(l.text, context) >= COPY_THRESHOLD).map((l) => `${l.where}: ${preview(l.text)}`);
  const flagged = new Set(found.map((f) => stepIndex(f)));
  const byStep = new Map<number, string[]>();
  for (const l of lines) {
    const i = stepIndex(l.where);
    if (i !== null) byStep.set(i, [...(byStep.get(i) ?? []), l.text]);
  }
  for (const [i, texts] of byStep) {
    if (flagged.has(i)) continue;
    const step = quest.steps[i];
    const joined = [texts.join(' ')];
    if (step?.kind === 'challenge' && step.mechanic === 'sort') joined.push(step.answer.order.map((id) => step.items.find((it) => it.id === id)?.label ?? '').join(' '));
    if (joined.some((text) => longestCopiedRun(text, context) >= COPY_THRESHOLD)) found.push(`steps[${i}] (its lines read together): ${preview(texts.join(' '))}`);
  }
  for (const [id, text] of Object.entries(quest.texts)) {
    if (copiedShingles(text.title, context) >= COPY_THRESHOLD) found.push(`texts.${id}.title: ${preview(text.title)}`);
    const glossary = (text.glossary ?? []).map((g) => `${g.term} ${g.meaning}`).join(' ');
    if (copiedShingles(glossary, context) >= COPY_THRESHOLD) found.push(`texts.${id}.glossary: ${preview(glossary)}`);
  }
  return found;
}

/** Passages whose body matches the textbooks (allowed phrases do not apply to a whole passage). */
export function copiedPassages(quest: QuestDefinition, context: Hashing): string[] {
  if (quest.status === 'stub') return [];
  return Object.entries(quest.texts).filter(([, text]) => copiedShingles(text.body, context, true) >= COPY_THRESHOLD).map(([id]) => id);
}

/** Textbook links a quest still keeps: its lesson, inventory refs, a worksheet's lesson, passages' author or section. */
export function textbookLinks(quest: QuestDefinition): string[] {
  if (quest.status === 'stub') return [];
  const links: string[] = [];
  if (quest.lesson !== undefined) links.push('lesson');
  for (const step of quest.steps) {
    if ('curriculumRef' in step && step.curriculumRef !== undefined) links.push(`step ${step.id} curriculumRef`);
    if (step.kind === 'worksheet' && step.lessonId !== undefined) links.push(`step ${step.id} lessonId`);
  }
  for (const [id, text] of Object.entries(quest.texts)) {
    if (text.author !== undefined) links.push(`text ${id} author`);
    if (text.section !== undefined) links.push(`text ${id} section`);
  }
  return links;
}

/** Passage sources: a public-domain author's protection must have ended. */
function sourceIssues(quest: QuestDefinition, year: number): string[] {
  if (quest.status === 'stub') return [];
  return Object.entries(quest.texts).flatMap(([id, text]) => {
    const source = text.source;
    if (source?.kind !== 'public-domain') return [];
    const free = year - PROTECTION_YEARS - 1;
    return source.died <= free ? [] : [`quest ${quest.id} text ${id}: ${source.author} died in ${source.died}, so the work is protected until the end of ${source.died + PROTECTION_YEARS}`];
  });
}

/** Topic titles, summaries and objectives are shown on public pages: none may copy the textbooks. */
export function checkTopicCopy(topics: readonly Topic[], context: Hashing): string[] {
  return topics.flatMap((topic) =>
    [
      { where: 'title', text: topic.title },
      { where: 'summary', text: topic.summary },
      ...topic.objectives.map((o) => ({ where: `objective ${o.id}`, text: o.text })),
    ]
      .filter((l) => copiedShingles(l.text, context) >= COPY_THRESHOLD)
      .map((l) => `topic ${topic.id} ${l.where} copies textbook wording: ${preview(l.text)}: write it in our own words`),
  );
}

export function checkTextbookCopy(quests: readonly QuestDefinition[], context: CopyContext): string[] {
  const issues: string[] = [];
  const ids = new Set(quests.map((q) => q.id));
  const baseline = context.baseline ?? TEXTBOOK_COPY_BASELINE;
  for (const id of context.pending) {
    if (!baseline.has(id)) issues.push(`textbook-copy-pending.json lists ${id}, which is not one of the quests first built from the textbooks: the list may only shrink`);
    else if (!ids.has(id)) issues.push(`textbook-copy-pending.json lists ${id}, which is not a quest`);
  }
  const usedTraditional = new Set<string>();
  for (const quest of quests) {
    issues.push(...sourceIssues(quest, context.year));
    const copied = copiedLines(quest, context);
    const passages = copiedPassages(quest, context);
    const links = textbookLinks(quest);
    if (context.pending.has(quest.id)) {
      if (copied.length === 0 && passages.length === 0 && links.length === 0) issues.push(`quest ${quest.id} no longer copies the textbooks: remove it from tools/content/textbook-copy-pending.json`);
      continue;
    }
    for (const line of copied) issues.push(`quest ${quest.id} copies textbook wording at ${line}: write it in our own words`);
    for (const id of passages) {
      const text = quest.status === 'stub' ? undefined : quest.texts[id];
      const key = `${quest.id}/${id}`;
      const traditional = text?.source?.kind === 'folk' || text?.source?.kind === 'public-domain';
      if (traditional && context.traditional.has(key)) usedTraditional.add(key);
      else if (traditional) issues.push(`quest ${quest.id} text ${id} reads like the textbooks: a traditional passage that matches is listed in tools/content/allowed-traditional-passages.json with a reason, or retold in our own words`);
      else issues.push(`quest ${quest.id} text ${id} copies textbook wording: write it in our own words`);
    }
    for (const link of links) issues.push(`quest ${quest.id} keeps a textbook link (${link}): only quests waiting to be rewritten may (tools/content/textbook-copy-pending.json)`);
    if (quest.status !== 'stub') for (const [id, text] of Object.entries(quest.texts)) if (!text.source) issues.push(`quest ${quest.id} text ${id} needs its source ("source": folk, public-domain or original)`);
  }
  for (const key of context.traditional) if (!usedTraditional.has(key)) issues.push(`allowed-traditional-passages.json lists ${key}, which matches nothing (or is not a folk or public-domain passage of a rewritten quest): remove it`);
  return issues;
}

export function readPendingQuests(file: string = PENDING_FILE): Set<string> {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { quests?: unknown };
  if (!Array.isArray(raw.quests) || raw.quests.some((q) => typeof q !== 'string')) throw new Error('textbook-copy-pending.json: expected { "quests": ["<quest id>", …] }');
  return new Set(raw.quests as string[]);
}

/**
 * The check as `pnpm content:check` runs it, on the repo's fingerprints, allowed lists and waiting list. Without the
 * key it cannot run: on CI that is an error, on a machine without the owner's iCloud a warning.
 */
export function checkRepoTextbookCopy(
  quests: readonly QuestDefinition[],
  topics: readonly Topic[],
  { year = new Date().getFullYear(), env = process.env }: { year?: number; env?: NodeJS.ProcessEnv } = {},
): { issues: string[]; warnings: string[] } {
  const key = fingerprintKey(env);
  if (!key) {
    const line = `the textbook copy check needs its key (MIU_FINGERPRINT_KEY, or iCloud Drive ${KEY_FILE_IN_ICLOUD})`;
    return env.CI ? { issues: [line], warnings: [] } : { issues: [], warnings: [`${line}: skipped on this machine`] };
  }
  const common = commonPhraseShingles(JSON.parse(readFileSync(COMMON_PHRASES_FILE, 'utf8')), key);
  const traditional = traditionalPassages(JSON.parse(readFileSync(TRADITIONAL_PASSAGES_FILE, 'utf8')));
  const context: CopyContext = { key, fingerprints: readFingerprints(), allowed: common.shingles, pending: readPendingQuests(), traditional: traditional.passages, year };
  return { issues: [...common.issues, ...traditional.issues, ...checkTopicCopy(topics, context), ...checkTextbookCopy(quests, context)], warnings: [] };
}
