// Content text in both languages (docs/i18n.md): a quest, a step, a minigame or a shop item carries its English
// twin in `en`; what has none (textbook wording, text not translated yet) shows in Vietnamese in every mode.
import type { QuestStepPublic } from '@miu/schema/content';
import { mapBoth, type Bilingual } from '../i18n/i18n';
import { Bi } from '../i18n/use-t';

/** A line with its English twin; without one, the same line in both languages (shown once, in Vietnamese). */
export const twin = (vi: string, en: string | null | undefined): Bilingual => ({ vi, en: en && en.trim() !== '' ? en : vi });

/** A quest's (or a story's) title in both languages. */
export const titleOf = (quest: { title: string; en?: { title: string } | undefined }): Bilingual => twin(quest.title, quest.en?.title);

/** A quest's summary in both languages. */
export const summaryOf = (quest: { summary: string; en?: { summary: string } | undefined }): Bilingual => twin(quest.summary, quest.en?.summary);

/** A step's English title and directions (textbook-only kinds have none). */
const enOf = (step: QuestStepPublic): { title?: string | undefined; goTo?: string | undefined } | undefined => ('en' in step ? step.en : undefined);

/** A step's own title in both languages. */
export const stepTitleOf = (step: QuestStepPublic): Bilingual => twin(step.title, enOf(step)?.title);

/** Where the tracker sends the child for a step (its `goTo`, else its title), in both languages. */
export const stepLineOf = (step: QuestStepPublic): Bilingual => (step.goTo ? twin(step.goTo, enOf(step)?.goTo) : stepTitleOf(step));

/** The `i`-th English twin of a list the step translates (choices, items, elements), if any. */
export const nthEn = (list: readonly string[] | undefined, i: number): string | undefined => list?.[i];

/** Content text on screen: both languages filled with the player's name (`{name}`), shown by the current mode. */
export function Say({ text, fill }: { text: Bilingual; fill: (line: string) => string }) {
  const filled = mapBoth(text, fill);
  return <Bi vi={filled.vi} en={filled.en} />;
}
