// The picture of an olympiad question (mocks 34–44 of the practice screens): one drawing per kind of problem, from the
// question's data only (packages/schema olympiad.ts `OlympiadVisual`), so a new question of a known kind needs no
// code. The choice the player has picked stands in the `?` of the picture (the balance's empty pan, the row's gap,
// the machine's input), as in the mocks. Drawn in DOM and inline SVG with the design tokens: no image files.
import type { ReactNode } from 'react';
import type { OlympiadVisual } from '@miu/schema/olympiad';
import { linesOf, mapBoth, type Bilingual } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';

/** The `?` of a picture: the player's pick when there is one. */
function Slot({ filled }: { filled: Bilingual | null }) {
  return <span className={`olympiad-slot${filled ? ' olympiad-slot--filled' : ''}`}>{filled ? <Bi {...filled} /> : '?'}</span>;
}

/** A side of an equation with its `?` replaced by the slot. */
function WithSlot({ text, filled }: { text: string; filled: Bilingual | null }) {
  const parts = text.split('?');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <Slot filled={filled} /> : null}
        </span>
      ))}
    </>
  );
}

/** Weekday (0 = Monday) of the first of a month: plain calendar arithmetic (Zeller), no clock involved. */
export function firstWeekday(month: number, year: number): number {
  const m = month < 3 ? month + 12 : month;
  const y = month < 3 ? year - 1 : year;
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h = (1 + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7; // 0 = Saturday
  return (h + 5) % 7;
}

const daysIn = (month: number, year: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

function Figure({ figure }: { figure: Extract<OlympiadVisual, { type: 'figure' }>['figure'] }) {
  const lines: Record<typeof figure, ReactNode> = {
    'triangle-split': (
      <>
        <polygon points="100,10 20,110 180,110" />
        <line x1="100" y1="10" x2="90" y2="110" />
      </>
    ),
    'rect-split-2': (
      <>
        <rect x="20" y="25" width="160" height="70" />
        <line x1="100" y1="25" x2="100" y2="95" />
      </>
    ),
    'rect-split-3': (
      <>
        <rect x="10" y="35" width="180" height="60" />
        <line x1="70" y1="35" x2="70" y2="95" />
        <line x1="130" y1="35" x2="130" y2="95" />
      </>
    ),
    'square-cross': (
      <>
        <rect x="50" y="10" width="100" height="100" />
        <line x1="50" y1="10" x2="150" y2="110" />
        <line x1="150" y1="10" x2="50" y2="110" />
      </>
    ),
    'two-triangles': (
      <>
        <polygon points="50,10 150,10 50,110" />
        <polygon points="150,10 150,110 50,110" className="olympiad-figure-alt" />
      </>
    ),
    rectangle: <rect x="20" y="25" width="160" height="70" />,
  };
  return (
    <svg className="olympiad-figure" viewBox="0 0 200 120" role="img" aria-hidden="true">
      {lines[figure]}
    </svg>
  );
}

function Segment({ points }: { points: readonly string[] }) {
  const gap = 180 / Math.max(points.length - 1, 1);
  return (
    <svg className="olympiad-figure" viewBox="0 0 200 60" role="img" aria-label={points.join(' — ')}>
      <line x1="10" y1="30" x2="190" y2="30" />
      {points.map((p, i) => (
        <g key={p}>
          <circle cx={10 + i * gap} cy="30" r="5" className="olympiad-figure-point" />
          <text x={10 + i * gap} y="54" textAnchor="middle">
            {p}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Cubes({ layers, single }: { layers?: readonly number[]; single?: boolean }) {
  const { t } = useT();
  if (single || !layers) {
    return (
      <svg className="olympiad-figure olympiad-cube" viewBox="0 0 120 120" role="img" aria-label={t('olympiad.visual.cube')}>
        <polygon points="30,40 70,40 70,100 30,100" />
        <polygon points="30,40 50,20 90,20 70,40" className="olympiad-figure-alt" />
        <polygon points="70,40 90,20 90,80 70,100" className="olympiad-figure-shade" />
      </svg>
    );
  }
  // Layers drawn from the top down, each a row of cubes centred over the one below.
  return (
    <div className="olympiad-cubes" role="img" aria-label={layers.map((count, i) => t('olympiad.visual.layer', { n: i + 1, count })).join(', ')}>
      {[...layers].reverse().map((count, i) => (
        <div key={i} className="olympiad-cube-row">
          {Array.from({ length: count }, (_, j) => (
            <span key={j} className="olympiad-cube-face" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Share({ visual }: { visual: Extract<OlympiadVisual, { type: 'share' }> }) {
  const groups = visual.groups ?? (visual.per ? Math.floor(visual.total / visual.per) : 1);
  const per = visual.per ?? Math.floor(visual.total / Math.max(groups, 1));
  const left = visual.total - groups * per;
  const label = visual.groups ? 'olympiad.visual.shareGroups' : 'olympiad.visual.sharePer';
  return (
    <figure className="olympiad-share">
      <div className="olympiad-share-groups">
        {Array.from({ length: groups }, (_, g) => (
          <span key={g} className="olympiad-share-group">
            {Array.from({ length: per }, (_, d) => (
              <span key={d} className="olympiad-dot" />
            ))}
          </span>
        ))}
        {left > 0 ? (
          <span className="olympiad-share-left">
            {Array.from({ length: left }, (_, d) => (
              <span key={d} className="olympiad-dot olympiad-dot--left" />
            ))}
          </span>
        ) : null}
      </div>
      <figcaption>
        <T k={label} params={{ total: visual.total, groups: visual.groups ?? groups, per: visual.per ?? per, thing: visual.thing }} />
      </figcaption>
    </figure>
  );
}

const COLOUR_KEY = {
  red: 'olympiad.colour.red',
  blue: 'olympiad.colour.blue',
  yellow: 'olympiad.colour.yellow',
  green: 'olympiad.colour.green',
  purple: 'olympiad.colour.purple',
  orange: 'olympiad.colour.orange',
} as const;

export function QuestionVisual({ visual, filled = null, fill }: { visual: OlympiadVisual; filled?: Bilingual | null; fill: (text: string) => string }) {
  const { t } = useT();
  switch (visual.type) {
    case 'scale':
      return (
        <div className="olympiad-scales" role="img" aria-label={t('olympiad.visual.balance')}>
          {visual.pans.map((pan, i) => {
            const right = pan.right.vi.includes('?') ? null : pan.right;
            return (
              <div key={i} className="olympiad-scale">
                <span className="olympiad-pan">
                  <Bi {...mapBoth(pan.left, fill)} />
                </span>
                <span className="olympiad-beam" aria-hidden="true" />
                <span className="olympiad-pan">{right ? <Bi {...mapBoth(right, fill)} /> : <Slot filled={filled} />}</span>
              </div>
            );
          })}
        </div>
      );
    case 'sequence':
      return (
        <ol className="olympiad-row">
          {visual.items.map((item, i) => (
            <li key={i} className="olympiad-tile">
              {item === '?' ? (
                <Slot filled={filled} />
              ) : typeof item === 'number' ? (
                item
              ) : (
                <span className={`olympiad-swatch olympiad-swatch--${item}`} role="img" aria-label={t(COLOUR_KEY[item])} />
              )}
            </li>
          ))}
        </ol>
      );
    case 'calendar': {
      const offset = firstWeekday(visual.month, visual.year);
      const days = daysIn(visual.month, visual.year);
      return (
        <div className="olympiad-calendar" role="table" aria-label={`${visual.month}/${visual.year}`}>
          <div className="olympiad-calendar-head" role="row">
            {linesOf('olympiad.weekdays').map((d) => (
              <span key={d.vi} role="columnheader">
                <Bi {...d} />
              </span>
            ))}
          </div>
          <div className="olympiad-calendar-days" role="row">
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <span key={i} role="cell" className={visual.marked.includes(i + 1) ? 'olympiad-day--marked' : undefined}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case 'equation':
      return (
        <p className="olympiad-equation">
          <WithSlot text={visual.left} filled={filled} /> = <WithSlot text={visual.right} filled={filled} />
        </p>
      );
    case 'numbers':
      return (
        <ul className="olympiad-row">
          {visual.numbers.map((n) => (
            <li key={n} className="olympiad-tile">
              {n}
            </li>
          ))}
        </ul>
      );
    case 'share':
      return <Share visual={visual} />;
    case 'segment':
      return <Segment points={visual.points} />;
    case 'figure':
      return <Figure figure={visual.figure} />;
    case 'cubes':
      return <Cubes layers={visual.layers} single={visual.single} />;
    case 'digits':
      return (
        <ul className="olympiad-row" aria-label={t('olympiad.visual.digits')}>
          {visual.digits.map((d, i) => (
            <li key={i} className="olympiad-tile olympiad-tile--card">
              {d}
            </li>
          ))}
        </ul>
      );
    case 'pairs':
      return (
        <div className="olympiad-pairs">
          <ul>
            {visual.left.map((item) => (
              <li key={item.vi} className="olympiad-chip">
                <Bi {...item} />
              </li>
            ))}
          </ul>
          <span className="olympiad-times" aria-hidden="true">
            ×
          </span>
          <ul>
            {visual.right.map((item) => (
              <li key={item.vi} className="olympiad-chip">
                <Bi {...item} />
              </li>
            ))}
          </ul>
        </div>
      );
    case 'people':
      return (
        <ul className="olympiad-row">
          {visual.names.map((name) => (
            <li key={name} className="olympiad-chip">
              {fill(name)}
            </li>
          ))}
        </ul>
      );
    case 'machine':
      return (
        <ol className="olympiad-machine">
          <li className="olympiad-machine-end">
            <span className="hint">
              <T k="olympiad.visual.in" />
            </span>
            {visual.input === '?' ? <Slot filled={filled} /> : visual.input}
          </li>
          {visual.steps.map((step, i) => (
            <li key={i} className="olympiad-machine-step">
              {step}
            </li>
          ))}
          <li className="olympiad-machine-end">
            <span className="hint">
              <T k="olympiad.visual.out" />
            </span>
            {visual.output === '?' ? <Slot filled={filled} /> : visual.output}
          </li>
        </ol>
      );
  }
}
