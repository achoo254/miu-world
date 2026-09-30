import { z } from 'zod';
import { ContentId } from './content';
import { BookId } from './curriculum';

// Printable worksheets for the writing parts of a lesson (handwriting, dictation, paragraphs) and the
// hands-on activities done at home. Built from the textbook inventory when asked for, never stored;
// the game only points at them and nothing written on them comes back.

const refs = { curriculumRef: z.array(ContentId).min(1) };

export const WorksheetBlock = z.discriminatedUnion('kind', [
  /** Capital letter practice: the child traces the model in the book or the handwriting notebook. */
  z.object({ kind: z.literal('letter'), prompt: z.string(), page: z.number().int(), ...refs }),
  /** Sentence to copy, as printed. */
  z.object({ kind: z.literal('copy-line'), text: z.string(), page: z.number().int(), ...refs }),
  /** Passage a parent reads aloud slowly while the child writes it. */
  z.object({ kind: z.literal('dictation'), prompt: z.string(), title: z.string().optional(), text: z.string().optional(), page: z.number().int(), ...refs }),
  /** Paragraph to write, with the book's hints and blank ruled lines. */
  z.object({ kind: z.literal('paragraph-prompt'), prompt: z.string(), hints: z.array(z.string()), lines: z.number().int().min(1), page: z.number().int(), ...refs }),
  /** Something to do with a parent: weigh, pour, read a clock or calendar, fold and cut, retell a story. */
  z.object({ kind: z.literal('activity'), prompt: z.string(), media: z.array(z.string()), page: z.number().int(), ...refs }),
]);
export type WorksheetBlock = z.infer<typeof WorksheetBlock>;

export const Worksheet = z.object({
  lessonId: ContentId,
  bookId: BookId,
  title: z.string(),
  week: z.number().int().optional(),
  pages: z.tuple([z.number().int(), z.number().int()]),
  blocks: z.array(WorksheetBlock).min(1),
});
export type Worksheet = z.infer<typeof Worksheet>;

export const WorksheetSummary = Worksheet.pick({ lessonId: true, bookId: true, title: true, week: true, pages: true }).extend({
  blockCount: z.number().int().min(1),
});
export const WorksheetListResponse = z.object({ worksheets: z.array(WorksheetSummary) });
export type WorksheetListResponse = z.infer<typeof WorksheetListResponse>;
