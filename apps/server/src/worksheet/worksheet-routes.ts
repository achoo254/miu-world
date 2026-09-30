import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { ContentId } from '@miu/schema/content';
import { BookId } from '@miu/schema/curriculum';
import { Worksheet, WorksheetListResponse } from '@miu/schema/worksheet';
import { requireParent, requireParentGate } from '../auth/auth-context';
import { HttpError } from '../http-error';

export interface WorksheetRouteDeps {
  worksheets: ReadonlyMap<string, Worksheet>;
  clock: () => Date;
  /** Folder with the handwriting font files; null uses `.data/fonts` in the repo. */
  fontDir?: string | null;
}

/**
 * The primary-school model hand (HP001, HP Design) has no open license, so it is not in git or the
 * asset manifest: whoever runs the server drops these files into the font folder. Missing files are a
 * 404 and the printed sheet leaves the model letters out rather than show a different hand.
 */
export const HANDWRITING_FONT_FILES = ['chu-mau-tieu-hoc.woff2', 'chu-mau-tieu-hoc-dam.woff2'] as const;
const DEFAULT_FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.data/fonts');

/** Parent area, read only: worksheets are printed at home and nothing written on them comes back. */
export function worksheetRoutes({ worksheets, clock, fontDir }: WorksheetRouteDeps): Router {
  const router = Router();
  const gate = requireParentGate(clock);

  router.get('/worksheets', requireParent, gate, (req, res) => {
    const book = req.query.book === undefined ? undefined : BookId.safeParse(req.query.book);
    if (book && !book.success) throw new HttpError(400, 'invalid-book');
    const list = [...worksheets.values()]
      .filter((w) => !book || w.bookId === book.data)
      .map(({ blocks, ...summary }) => ({ ...summary, blockCount: blocks.length }));
    res.json(WorksheetListResponse.parse({ worksheets: list }));
  });

  router.get('/worksheets/fonts/:file', requireParent, (req, res) => {
    const file = HANDWRITING_FONT_FILES.find((name) => name === req.params.file);
    const full = file ? path.join(fontDir ?? DEFAULT_FONT_DIR, file) : null;
    if (!full || !existsSync(full)) throw new HttpError(404, 'font-not-found');
    // The default folder is under `.data/`, which `send` treats as a dotfile path unless allowed.
    res.type('font/woff2').set('Cache-Control', 'private, max-age=86400').sendFile(full, { dotfiles: 'allow' });
  });

  router.get('/worksheets/:lessonId', requireParent, gate, (req, res) => {
    const id = ContentId.safeParse(req.params.lessonId);
    const sheet = id.success ? worksheets.get(id.data) : undefined;
    if (!sheet) throw new HttpError(404, 'worksheet-not-found');
    res.json(Worksheet.parse(sheet));
  });

  return router;
}
