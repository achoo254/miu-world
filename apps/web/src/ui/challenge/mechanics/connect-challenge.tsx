// Nối điểm: tap a point, then another, to draw the segment between them; tap the same pair again to
// rub it out. Lengths show when the step asks (grid units are centimetres). The server checks the set
// of segments, in any order and either direction.
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import './mechanics.css';

type ConnectStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'connect' }>;
type Edge = [string, string];

const sameEdge = (a: Edge, b: Edge) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

/** Adds the segment, or removes it when it is already drawn. */
export function toggleEdge(edges: readonly Edge[], edge: Edge): Edge[] {
  return edges.some((e) => sameEdge(e, edge)) ? edges.filter((e) => !sameEdge(e, edge)) : [...edges, edge];
}

export function ConnectChallenge({ step, context, onAnswer }: { step: ConnectStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const xs = step.points.map((p) => p.x);
  const ys = step.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(1, Math.max(...xs) - minX, Math.max(...ys) - minY);
  const at = (id: string) => {
    const p = step.points.find((q) => q.id === id);
    return p ? { x: 10 + ((p.x - minX) / span) * 80, y: 10 + ((p.y - minY) / span) * 80, raw: p } : null;
  };
  const tap = (id: string) => {
    if (from === null) setFrom(id);
    else if (from === id) setFrom(null);
    else {
      setEdges((prev) => toggleEdge(prev, [from, id]));
      setFrom(null);
    }
  };
  const label = (id: string) => step.points.find((p) => p.id === id)?.label ?? id;

  return (
    <ChallengeFrame context={context} prompt={context.fill(step.prompt)} onCheck={() => onAnswer({ edges })} canCheck={edges.length > 0} onReset={() => setEdges([])}>
      <div className="connect-wrap">
        <svg className="connect-board" viewBox="0 0 100 100" data-id="connect-board" aria-label={`Đã nối: ${edges.map(([a, b]) => label(a) + label(b)).join(', ') || 'chưa có đoạn nào'}`}>
          {edges.map(([a, b]) => {
            const p = at(a);
            const q = at(b);
            if (!p || !q) return null;
            const length = Math.round(Math.hypot(q.raw.x - p.raw.x, q.raw.y - p.raw.y) * 10) / 10;
            return (
              <g key={`${a}-${b}`} data-id={`edge-${a}-${b}`}>
                <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="connect-edge" />
                {step.showLengths ? (
                  <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 3} className="connect-length" textAnchor="middle">
                    {length} cm
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className="connect-points" role="group" aria-label="Chạm hai điểm để nối">
          {step.points.map((p) => {
            const pos = at(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`connect-point${from === p.id ? ' connect-point--from' : ''}`}
                style={{ left: `${pos?.x ?? 0}%`, top: `${pos?.y ?? 0}%` }}
                aria-pressed={from === p.id}
                aria-label={`Điểm ${p.label}`}
                data-id={`point-${p.id}`}
                onClick={() => tap(p.id)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </ChallengeFrame>
  );
}
