// Pictures for textbook exercises, drawn at run time from the step's `IllustrationRef` (no scanned
// book images): clock faces, number lines, rulers, scales, jugs, shapes, polylines and picture cards.
// Colours come from the design tokens so every picture follows the theme.
import type { IllustrationRef } from '@miu/schema/content';
import { Icon } from '../../kit/art';
import { UI_ICONS, type UiIcon } from '../../kit/ui-art';
import './illustration.css';

type Params = Extract<IllustrationRef, { kind: 'diagram' }>['params'];

const num = (params: Params, key: string, fallback: number): number => {
  const v = params[key];
  return typeof v === 'number' ? v : fallback;
};
const list = (params: Params, key: string): number[] => {
  const v = params[key];
  return Array.isArray(v) ? v : [];
};
const text = (params: Params, key: string): string | null => {
  const v = params[key];
  return typeof v === 'string' ? v : null;
};

/** Hand angle in degrees, clockwise from 12. */
export function handAngles(hour: number, minute: number): { hour: number; minute: number } {
  return { hour: ((hour % 12) + minute / 60) * 30, minute: minute * 6 };
}

const polar = (cx: number, cy: number, r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

export function ClockFace({ hour, minute, label }: { hour: number; minute: number; label: string }) {
  const angles = handAngles(hour, minute);
  const h = polar(50, 50, 24, angles.hour);
  const m = polar(50, 50, 36, angles.minute);
  return (
    <svg className="illustration illustration-clock" viewBox="0 0 100 100" role="img" aria-label={label} data-id="clock-face">
      <circle cx="50" cy="50" r="46" className="ill-fill ill-line" />
      {Array.from({ length: 12 }, (_, i) => {
        const p = polar(50, 50, 37, (i + 1) * 30);
        return (
          <text key={i} x={p.x} y={p.y} className="ill-number" textAnchor="middle" dominantBaseline="central">
            {i + 1}
          </text>
        );
      })}
      <line x1="50" y1="50" x2={h.x} y2={h.y} className="ill-hand ill-hand-hour" data-id="clock-hand-hour" />
      <line x1="50" y1="50" x2={m.x} y2={m.y} className="ill-hand ill-hand-minute" data-id="clock-hand-minute" />
      <circle cx="50" cy="50" r="3" className="ill-dot" />
    </svg>
  );
}

function NumberLine({ params }: { params: Params }) {
  const from = num(params, 'from', 0);
  const to = num(params, 'to', 10);
  const step = Math.max(1, num(params, 'step', 1));
  const marks = new Set(list(params, 'marks'));
  const ticks = Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  const x = (v: number) => 5 + ((v - from) / Math.max(1, to - from)) * 90;
  return (
    <svg className="illustration" viewBox="0 0 100 24" role="img" aria-label={`Tia số từ ${from} đến ${to}`} data-id="number-line">
      <line x1="3" y1="10" x2="98" y2="10" className="ill-line" />
      {ticks.map((v) => (
        <g key={v} data-id={`tick-${v}`}>
          <line x1={x(v)} y1="6" x2={x(v)} y2="14" className="ill-line" />
          <text x={x(v)} y="21" className={`ill-small${marks.has(v) ? ' ill-mark' : ''}`} textAnchor="middle">
            {marks.has(v) ? '?' : v}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Ruler({ params }: { params: Params }) {
  const length = Math.max(1, Math.min(30, num(params, 'length', 10)));
  const unit = 90 / length;
  return (
    <svg className="illustration" viewBox="0 0 100 22" role="img" aria-label={`Thước dài ${length} cm`} data-id="ruler">
      <rect x="4" y="2" width="92" height="18" rx="2" className="ill-fill ill-line" />
      {Array.from({ length: length + 1 }, (_, i) => (
        <g key={i} data-id={`ruler-cm-${i}`}>
          <line x1={5 + i * unit} y1="2" x2={5 + i * unit} y2="9" className="ill-line" />
          <text x={5 + i * unit} y="16" className="ill-small" textAnchor="middle">
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Scale({ params }: { params: Params }) {
  const left = num(params, 'left', 0);
  const right = num(params, 'right', 0);
  // The heavier pan sits lower, a little, like the book's pictures.
  const tilt = Math.max(-6, Math.min(6, (left - right) * 2));
  return (
    <svg className="illustration" viewBox="0 0 100 60" role="img" aria-label={`Cân đĩa: bên trái ${left} kg, bên phải ${right} kg`} data-id="scale">
      <line x1="50" y1="55" x2="50" y2="18" className="ill-line" />
      <line x1="20" y1={18 + tilt} x2="80" y2={18 - tilt} className="ill-line" />
      <path d={`M8 ${28 + tilt} Q20 ${38 + tilt} 32 ${28 + tilt} Z`} className="ill-fill ill-line" data-id="scale-left" />
      <path d={`M68 ${28 - tilt} Q80 ${38 - tilt} 92 ${28 - tilt} Z`} className="ill-fill ill-line" data-id="scale-right" />
      <text x="20" y={24 + tilt} className="ill-small" textAnchor="middle">
        {left} kg
      </text>
      <text x="80" y={24 - tilt} className="ill-small" textAnchor="middle">
        {right} kg
      </text>
    </svg>
  );
}

function Jug({ params }: { params: Params }) {
  const litres = num(params, 'litres', 1);
  const capacity = Math.max(litres, num(params, 'capacity', litres));
  const level = 55 - (litres / capacity) * 40;
  return (
    <svg className="illustration illustration-small" viewBox="0 0 60 64" role="img" aria-label={`Ca ${litres} lít`} data-id="jug">
      <rect x="12" y={level} width="30" height={55 - level} className="ill-water" />
      <path d="M12 12 L12 55 L42 55 L42 12 M42 20 Q54 24 42 40" className="ill-line ill-open" />
      <text x="27" y="62" className="ill-small" textAnchor="middle">
        {litres} l
      </text>
    </svg>
  );
}

/** Flat list [x1, y1, x2, y2, …] of points, in centimetres, drawn to fit. */
function pointsOf(params: Params): Array<{ x: number; y: number }> {
  const flat = list(params, 'points');
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) points.push({ x: flat[i] ?? 0, y: flat[i + 1] ?? 0 });
  return points;
}

function fit(points: ReadonlyArray<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(1, Math.max(...xs) - minX, Math.max(...ys) - minY);
  return (p: { x: number; y: number }) => ({ x: 8 + ((p.x - minX) / span) * 84, y: 8 + ((p.y - minY) / span) * 84 });
}

function Shapes({ params, closed }: { params: Params; closed: boolean }) {
  const points = pointsOf(params);
  if (points.length < 2) return null;
  const at = fit(points);
  const lengths = list(params, 'lengths');
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${at(p).x} ${at(p).y}`).join(' ') + (closed ? ' Z' : '');
  return (
    <svg className="illustration" viewBox="0 0 100 100" role="img" aria-label={closed ? `Hình ${points.length} cạnh` : `Đường gấp khúc ${points.length - 1} đoạn`} data-id={closed ? 'shapes' : 'polyline'}>
      <path d={path} className={`ill-line${closed ? ' ill-fill' : ' ill-open'}`} />
      {points.slice(0, -1).map((p, i) => {
        const q = points[i + 1];
        const length = lengths[i];
        if (!q || length === undefined) return null;
        const mid = at({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
        return (
          <text key={i} x={mid.x} y={mid.y - 3} className="ill-small" textAnchor="middle" data-id={`segment-length-${i}`}>
            {length} cm
          </text>
        );
      })}
    </svg>
  );
}

function PictureCard({ params }: { params: Params }) {
  const n = num(params, 'n', 0);
  const caption = text(params, 'caption');
  const icon = text(params, 'icon');
  return (
    <figure className="picture-card" data-id="picture-card">
      {icon && icon in UI_ICONS ? <Icon name={icon as UiIcon} size={56} /> : null}
      <figcaption>{caption ?? (n > 0 ? `Tranh ${n}` : '')}</figcaption>
    </figure>
  );
}

export function Illustration({ picture, label }: { picture: IllustrationRef; label?: string }) {
  if (picture.kind === 'icon') {
    return picture.id in UI_ICONS ? <Icon name={picture.id as UiIcon} size={56} label={label} /> : null;
  }
  const { params } = picture;
  switch (picture.type) {
    case 'clock':
      return <ClockFace hour={num(params, 'hour', 12)} minute={num(params, 'minute', 0)} label={label ?? 'Đồng hồ'} />;
    case 'number-line':
      return <NumberLine params={params} />;
    case 'ruler':
      return <Ruler params={params} />;
    case 'scale':
      return <Scale params={params} />;
    case 'jug':
      return <Jug params={params} />;
    case 'shapes':
      return <Shapes params={params} closed />;
    case 'polyline':
      return <Shapes params={params} closed={false} />;
    case 'picture-card':
      return <PictureCard params={params} />;
  }
}
