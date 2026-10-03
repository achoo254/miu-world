// NEW SCREEN (Master Plan §6; owner, 03/10/2026). The notebook page: after a right answer, the question and its answer on a strip of vở
// ô li with "copy it into your notebook", and at the quest's end every one of them again. The child taps
// "Con chép xong rồi" once she has written it down.
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import type { NotebookEntry } from './notebook';
import './notebook.css';

/** The question and answer lines, as on a page of the child's vở. */
export function NotebookLines({ entries }: { entries: readonly NotebookEntry[] }) {
  return (
    <ol className="notebook-page" data-id="notebook-lines">
      {entries.map((e, i) => (
        <li key={e.step} className="notebook-entry" data-id={`notebook-entry-${e.step}`}>
          <p className="notebook-question">
            {entries.length > 1 ? <span className="notebook-number">Câu {i + 1}. </span> : null}
            {e.question}
          </p>
          <p className="notebook-answer">
            <span className="notebook-answer-label">Đáp án: </span>
            {e.answer}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** After a right answer: the line to copy, then on with the quest. */
export function NotebookCard({ entry, name, onDone }: { entry: NotebookEntry; name: string; onDone: () => void }) {
  return (
    <Modal title="Chép vào vở" onClose={onDone} dataId="notebook" size="wide" variant="scene" className="scene-modal--pinned">
      <p className="parchment notebook-ask" data-id="notebook-ask">
        <Icon name="books" size={32} />
        Đúng rồi! {name} hãy chép câu hỏi và đáp án vào vở nhé.
      </p>
      <div className="challenge-area">
        <NotebookLines entries={[entry]} />
      </div>
      <div className="parchment scene-bar notebook-bar">
        <button type="button" className={buttonClass('primary')} data-id="notebook-done" onClick={onDone}>
          <Icon name="checkMark" size={28} />
          Con chép xong rồi
        </button>
      </div>
    </Modal>
  );
}
