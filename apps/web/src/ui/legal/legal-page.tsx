// The layout the public legal pages share (Quyền riêng tư, Điều khoản sử dụng): a title, the date of the last wording
// change, the sections from content/legal/, the page's own closing section and the way back.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';

interface LegalText {
  title: string;
  /** `YYYY-MM-DD`. */
  updatedOn: string;
  sections: ReadonlyArray<{ heading: string; paragraphs: readonly string[] }>;
}

/** `2026-09-30` → `30/09/2026`. */
const vietnameseDate = (iso: string) => iso.split('-').reverse().join('/');

export function LegalPage({ text, dataId, children }: { text: LegalText; dataId: string; children: ReactNode }) {
  return (
    <SkyScene>
      <main className="scene-content" data-id={dataId}>
        <article className="panel consent-panel">
          <h1>{text.title}</h1>
          <p className="hint">Cập nhật ngày {vietnameseDate(text.updatedOn)}</p>
          {text.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          {children}
          <Link to="/" className={buttonClass('ghost')}>
            Về Miu World
          </Link>
        </article>
      </main>
    </SkyScene>
  );
}
