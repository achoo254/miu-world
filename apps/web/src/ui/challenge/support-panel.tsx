// M2.8 learning support: Hướng dẫn (step by step) · Gợi ý · Đáp án (with the explanation). Each layer
// comes from the server only when asked (POST …/support, counted there). The child tries first: the
// guide is always there, the hint after one wrong try, the answer after two. Seeing the answer never
// blocks the step: the child can still finish it, for a little less XP (validation decision
// `support_answer_penalty`), said kindly. The open layer floats over the play area and closes with its
// "Đóng" button or a second tap on its tab (owner, 03/10/2026: once open it could not be closed).
import { useEffect, useState } from 'react';
import { SupportResponse, type SupportLayer } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';
import { mapBoth, pairOf, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Tabs } from '../kit/tabs';
import { Say, twin } from '../quest/content-text';
import { useDraftState } from '../quest/step-draft';

const LAYERS: ReadonlyArray<{ key: SupportLayer; label: TextKey }> = [
  { key: 'guide', label: 'support.guide' },
  { key: 'hint', label: 'support.hint' },
  { key: 'answer', label: 'support.answer' },
];

/** Wrong tries before each layer is offered. */
const OPENS_AFTER: Record<SupportLayer, number> = { guide: 0, hint: 1, answer: 2 };

export function SupportPanel({ questId, stepId, fill, wrongTries }: { questId: string; stepId: string; fill: (text: string) => string; wrongTries: number }) {
  // The layer open is kept with the step's draft; after a reload it is asked for again.
  const [active, setActive] = useDraftState<SupportLayer | null>('support', null, (v): v is SupportLayer | null => v === null || LAYERS.some((l) => l.key === v));
  const [loaded, setLoaded] = useState<Partial<Record<SupportLayer, SupportResponse>>>({});
  const [error, setError] = useState<string | null>(null);
  const { t } = useT();

  function open(layer: SupportLayer) {
    // Its own tab again folds it away.
    if (active === layer) {
      setActive(null);
      return;
    }
    setActive(layer);
    void fetchLayer(layer);
  }

  async function fetchLayer(layer: SupportLayer) {
    if (loaded[layer]) return;
    try {
      const response = await api('POST', `/quests/${questId}/steps/${stepId}/support`, SupportResponse, { layer });
      setLoaded((prev) => ({ ...prev, [layer]: response }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    if (active) void fetchLayer(active);
    // Only on mount: a layer restored from the draft is fetched once; later opens fetch in `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = active ? loaded[active] : undefined;
  return (
    <Tabs
      label={t('support.label')}
      items={LAYERS.filter((l) => wrongTries >= OPENS_AFTER[l.key]).map((l) => ({ key: l.key, label: <T k={l.label} /> }))}
      active={active}
      onChange={open}
      dataId="support"
    >
      <button type="button" className="support-close" data-id="support-close" aria-label={t('support.closeLabel')} onClick={() => setActive(null)}>
        <T k="support.close" />
      </button>
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!shown ? (
        !error ? (
          <p role="status">
            <T k="common.opening" />
          </p>
        ) : null
      ) : shown.layer === 'guide' ? (
        <ol className="support-guide" data-id="support-guide-steps">
          {shown.steps.map((s, i) => (
            <li key={s}>
              <Say text={twin(s, shown.stepsEn?.[i])} fill={fill} />
            </li>
          ))}
        </ol>
      ) : shown.layer === 'hint' ? (
        <p data-id="support-hint-text">
          <Say text={twin(shown.text, shown.textEn)} fill={fill} />
        </p>
      ) : (
        <div data-id="support-answer-text">
          <p>
            <strong>
              <Say text={twin(shown.text, shown.textEn)} fill={fill} />
            </strong>
          </p>
          <p>
            <Say text={twin(shown.explanation, shown.explanationEn)} fill={fill} />
          </p>
          <p className="hint">
            <Bi {...mapBoth(pairOf('support.answerNote'), fill)} />
          </p>
        </div>
      )}
    </Tabs>
  );
}
