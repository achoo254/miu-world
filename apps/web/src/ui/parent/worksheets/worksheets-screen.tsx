// Parent area → Phiếu viết: the writing parts of each textbook lesson (capital letters, copying,
// dictation, paragraphs) and the at-home activities, printed on A4. Built by the server from the
// textbook inventory, so every line is the book's own wording; nothing written comes back to the game.
// Behind the parent PIN like the rest of the parent area.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Worksheet, WorksheetListResponse, type WorksheetBlock } from '@miu/schema/worksheet';
import { useAccount } from '../../account/account-context';
import { ParentGate } from '../../account/parent-gate';
import { api, errorMessage } from '../../api-client';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { SkyScene } from '../../kit/sky-scene';
import './worksheets.css';

const BOOK_NAMES: Record<string, string> = { 'tv2-t1': 'Tiếng Việt 2, tập một', 'toan2-t1': 'Toán 2, tập một' };

/** Books list in the order above (Tiếng Việt first); a book not named there yet goes last. */
function bookOrder(book: string): number {
  const index = Object.keys(BOOK_NAMES).indexOf(book);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

/** Loads a parent-only resource once the PIN gate is open; null until then. */
function useParentData<T>(load: () => Promise<T>, key: string): { data: T | null; error: string | null; gateOpen: boolean } {
  const { state } = useAccount();
  const gateOpen = state.status === 'signed-in' && state.me.parentGateOpen;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!gateOpen) return;
    let live = true;
    load().then(
      (value) => live && setData(value),
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
    // `load` changes identity every render; `key` names what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateOpen, key]);
  return { data, error, gateOpen };
}

function GateOrContent({ gateOpen, children }: { gateOpen: boolean; children: React.ReactNode }) {
  if (gateOpen) return <>{children}</>;
  return (
    <SkyScene>
      <main className="gate-layout" data-id="worksheets-gate">
        <h1 className="visually-hidden">Phiếu viết</h1>
        <ParentGate />
      </main>
    </SkyScene>
  );
}

export function WorksheetListScreen() {
  const { data, error, gateOpen } = useParentData(() => api('GET', '/worksheets', WorksheetListResponse), 'list');
  const books = data ? [...new Set(data.worksheets.map((w) => w.bookId))].sort((a, b) => bookOrder(a) - bookOrder(b)) : [];
  return (
    <GateOrContent gateOpen={gateOpen}>
      <SkyScene>
        <main className="scene-content" data-id="worksheets">
          <header className="page-header">
            <Icon name="scroll" size={48} />
            <h1>Phiếu viết</h1>
            <span className="spacer" />
            <Link to="/parent" className={buttonClass('ghost')}>
              Về khu phụ huynh
            </Link>
          </header>
          <p className="hint">Phần viết của mỗi bài (chữ hoa, câu ứng dụng, nghe – viết, viết đoạn) và việc làm cùng bố mẹ ở nhà. In ra để bé viết tay; bài viết không cần gửi lại vào game.</p>
          {error ? <p role="alert" className="error">{error}</p> : null}
          {!data && !error ? <p role="status">Đang tải phiếu…</p> : null}
          <div className="worksheet-books">
            {books.map((book) => {
              const sheets = data?.worksheets.filter((w) => w.bookId === book) ?? [];
              return (
                <section key={book} className="panel" aria-labelledby={`book-${book}`} data-id={`worksheets-${book}`}>
                  <h2 id={`book-${book}`}>{BOOK_NAMES[book] ?? book}</h2>
                  <ul className="worksheet-rows">
                    {sheets.map((sheet) => (
                      <li key={sheet.lessonId}>
                        <Link to={`/parent/worksheets/${sheet.lessonId}`} data-id={`worksheet-link-${sheet.lessonId}`}>
                          {sheet.week ? <span className="badge">Tuần {sheet.week}</span> : null}
                          <span className="worksheet-row-title">{sheet.title}</span>
                          <span className="hint">
                            tr. {sheet.pages[0]}–{sheet.pages[1]} · {sheet.blockCount} phần
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </main>
      </SkyScene>
    </GateOrContent>
  );
}

/** Ruled rows in the grade 1–2 handwriting grid (four lines per row), for copying letters and sentences. */
function Ruled({ rows, grid = true }: { rows: number; grid?: boolean }) {
  return (
    <div className={grid ? 'ruled ruled--grid' : 'ruled'} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ruled-row" />
      ))}
    </div>
  );
}

function Block({ block }: { block: WorksheetBlock }) {
  switch (block.kind) {
    case 'letter':
      return (
        <section className="sheet-block" data-id="block-letter">
          <h3>{block.prompt}</h3>
          <p className="sheet-note">Tô theo mẫu chữ hoa trang {block.page} SGK hoặc vở Tập viết, rồi viết tiếp.</p>
          <Ruled rows={3} />
        </section>
      );
    case 'copy-line':
      return (
        <section className="sheet-block" data-id="block-copy-line">
          <h3>{block.text}</h3>
          <Ruled rows={2} />
        </section>
      );
    case 'dictation':
      return (
        <section className="sheet-block" data-id="block-dictation">
          <h3>{block.prompt}</h3>
          <p className="sheet-note">Bố mẹ đọc chậm từng cụm từ, bé nghe rồi viết.</p>
          {block.text ? (
            <div className="sheet-read-aloud">
              <p className="sheet-label">Đoạn bố mẹ đọc{block.title ? ` · ${block.title}` : ''}</p>
              <p className="sheet-passage">{block.text}</p>
            </div>
          ) : null}
          <Ruled rows={6} />
        </section>
      );
    case 'paragraph-prompt':
      return (
        <section className="sheet-block" data-id="block-paragraph">
          <h3>{block.prompt}</h3>
          {block.hints.length ? (
            <ul className="sheet-hints">
              {block.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
          <Ruled rows={block.lines} grid={false} />
        </section>
      );
    case 'activity':
      return <ActivityBlock prompt={block.prompt} page={block.page} parts={[block.media]} />;
  }
}

/**
 * At-home activity. Where the book asks one thing of several pictures (a, b, c…), the prompt prints once
 * and each picture — named as the inventory describes it, with its page — gets its own answer line.
 */
function ActivityBlock({ prompt, page, parts }: { prompt: string; page: number; parts: ReadonlyArray<readonly string[]> }) {
  const pictured = parts.filter((media) => media.length > 0);
  return (
    <section className="sheet-block" data-id="block-activity">
      <h3>{prompt}</h3>
      <p className="sheet-note">Làm cùng bố mẹ ở nhà, ghi lại kết quả vào đây.</p>
      {pictured.length ? (
        <ol className="sheet-parts" type="a">
          {pictured.map((media, i) => (
            <li key={i}>
              <p className="sheet-label">
                Hình trang {page} SGK: {media.join('; ')}
              </p>
              <Ruled rows={1} grid={false} />
            </li>
          ))}
        </ol>
      ) : (
        <Ruled rows={3} grid={false} />
      )}
    </section>
  );
}

interface ActivityGroup {
  kind: 'activity-group';
  prompt: string;
  page: number;
  parts: string[][];
}

/** Runs of activities that share the book's prompt become one block (see ActivityBlock). */
function groupBlocks(blocks: readonly WorksheetBlock[]): Array<WorksheetBlock | ActivityGroup> {
  const out: Array<WorksheetBlock | ActivityGroup> = [];
  for (const block of blocks) {
    const last = out.at(-1);
    const joinsLast = block.kind === 'activity' && (last?.kind === 'activity' || last?.kind === 'activity-group') && last.prompt === block.prompt;
    if (!joinsLast || !last || block.kind !== 'activity') {
      out.push(block);
    } else if (last.kind === 'activity-group') {
      last.parts.push(block.media);
    } else if (last.kind === 'activity') {
      out[out.length - 1] = { kind: 'activity-group', prompt: last.prompt, page: last.page, parts: [last.media, block.media] };
    }
  }
  return out;
}

export function WorksheetSheetScreen() {
  const { lessonId = '' } = useParams();
  const { data: sheet, error, gateOpen } = useParentData(() => api('GET', `/worksheets/${encodeURIComponent(lessonId)}`, Worksheet), lessonId);
  return (
    <GateOrContent gateOpen={gateOpen}>
      <main className="worksheet-page" data-id="worksheet">
        <nav className="worksheet-toolbar no-print" aria-label="Phiếu viết">
          <Link to="/parent/worksheets" className={buttonClass('ghost')}>
            Danh sách phiếu
          </Link>
          <button type="button" className={buttonClass('primary')} data-id="worksheet-print" disabled={!sheet} onClick={() => window.print()}>
            <Icon name="scroll" size={28} />
            In phiếu
          </button>
        </nav>
        {error ? <p role="alert" className="error no-print">{error}</p> : null}
        {!sheet && !error ? <p role="status" className="no-print">Đang tải phiếu…</p> : null}
        {sheet ? (
          <article className="worksheet-sheet" aria-labelledby="sheet-title">
            <header className="sheet-header">
              <p className="sheet-label">
                {BOOK_NAMES[sheet.bookId] ?? sheet.bookId}
                {sheet.week ? ` · Tuần ${sheet.week}` : ''} · trang {sheet.pages[0]}–{sheet.pages[1]}
              </p>
              <h1 id="sheet-title">{sheet.title}</h1>
              <p className="sheet-fields">
                <span>Họ và tên: ........................................</span>
                <span>Ngày: ..../..../........</span>
              </p>
            </header>
            {groupBlocks(sheet.blocks).map((block, i) =>
              block.kind === 'activity-group' ? <ActivityBlock key={i} prompt={block.prompt} page={block.page} parts={block.parts} /> : <Block key={i} block={block} />,
            )}
          </article>
        ) : null}
      </main>
    </GateOrContent>
  );
}
