// M2.8 learning support: Hướng dẫn (step by step) · Gợi ý · Đáp án (with the explanation). Each layer
// comes from the server only when asked (POST …/support, counted there). Seeing the answer never
// blocks the step: the child can still finish it, for a little less XP (validation decision
// `support_answer_penalty`), said kindly.
import { useState } from 'react';
import { SupportResponse, type SupportLayer } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';
import { Tabs } from '../kit/tabs';

const LAYERS: ReadonlyArray<{ key: SupportLayer; label: string }> = [
  { key: 'guide', label: 'Hướng dẫn' },
  { key: 'hint', label: 'Gợi ý' },
  { key: 'answer', label: 'Đáp án' },
];

export function SupportPanel({ questId, stepId, fill }: { questId: string; stepId: string; fill: (text: string) => string }) {
  const [active, setActive] = useState<SupportLayer | null>(null);
  const [loaded, setLoaded] = useState<Partial<Record<SupportLayer, SupportResponse>>>({});
  const [error, setError] = useState<string | null>(null);

  async function open(layer: SupportLayer) {
    setActive(layer);
    if (loaded[layer]) return;
    try {
      const response = await api('POST', `/quests/${questId}/steps/${stepId}/support`, SupportResponse, { layer });
      setLoaded((prev) => ({ ...prev, [layer]: response }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const shown = active ? loaded[active] : undefined;
  return (
    <Tabs label="Hỗ trợ học" items={LAYERS} active={active} onChange={(layer) => void open(layer)} dataId="support">
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!shown ? (
        !error ? <p role="status">Đang mở…</p> : null
      ) : shown.layer === 'guide' ? (
        <ol className="support-guide" data-id="support-guide-steps">
          {shown.steps.map((s) => (
            <li key={s}>{fill(s)}</li>
          ))}
        </ol>
      ) : shown.layer === 'hint' ? (
        <p data-id="support-hint-text">{fill(shown.text)}</p>
      ) : (
        <div data-id="support-answer-text">
          <p>
            <strong>{fill(shown.text)}</strong>
          </p>
          <p>{fill(shown.explanation)}</p>
          <p className="hint">Hiểu cách làm rồi thì bé làm lại nhé, vẫn hoàn thành được bước này.</p>
        </div>
      )}
    </Tabs>
  );
}
