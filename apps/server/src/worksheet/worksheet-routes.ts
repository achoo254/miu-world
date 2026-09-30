import { Router } from 'express';
import { ContentId } from '@miu/schema/content';
import { BookId } from '@miu/schema/curriculum';
import { Worksheet, WorksheetListResponse } from '@miu/schema/worksheet';
import { requireParent, requireParentGate } from '../auth/auth-context';
import { HttpError } from '../http-error';

export interface WorksheetRouteDeps {
  worksheets: ReadonlyMap<string, Worksheet>;
  clock: () => Date;
}

/** Parent area, read only: worksheets are printed at home and nothing written on them comes back. */
export function worksheetRoutes({ worksheets, clock }: WorksheetRouteDeps): Router {
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

  router.get('/worksheets/:lessonId', requireParent, gate, (req, res) => {
    const id = ContentId.safeParse(req.params.lessonId);
    const sheet = id.success ? worksheets.get(id.data) : undefined;
    if (!sheet) throw new HttpError(404, 'worksheet-not-found');
    res.json(Worksheet.parse(sheet));
  });

  return router;
}
