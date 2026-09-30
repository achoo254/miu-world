// Tabs with the ARIA tabs pattern: arrow keys move between tabs, the active panel is labelled by its
// tab. Used by the learning support panel (Hướng dẫn · Gợi ý · Đáp án), later the Backpack.
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import './tabs.css';

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
}

export function Tabs<K extends string>({
  label,
  items,
  active,
  onChange,
  children,
  dataId,
}: {
  label: string;
  items: readonly TabItem<K>[];
  active: K | null;
  onChange: (key: K) => void;
  /** The active tab's panel (nothing while no tab is chosen). */
  children?: ReactNode;
  dataId?: string;
}) {
  const id = useId();
  const refs = useRef(new Map<K, HTMLButtonElement>());
  function onKey(e: KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = items[(index + step + items.length) % items.length];
    if (!next) return;
    onChange(next.key);
    refs.current.get(next.key)?.focus();
  }
  return (
    <div className="tabs" data-id={dataId}>
      <div className="tabs-list" role="tablist" aria-label={label}>
        {items.map((item, i) => (
          <button
            key={item.key}
            ref={(el) => {
              if (el) refs.current.set(item.key, el);
              else refs.current.delete(item.key);
            }}
            type="button"
            role="tab"
            id={`${id}-${item.key}`}
            aria-selected={active === item.key}
            aria-controls={`${id}-panel`}
            tabIndex={active === item.key || (active === null && i === 0) ? 0 : -1}
            className={`tabs-tab${active === item.key ? ' tabs-tab--active' : ''}`}
            data-id={dataId ? `${dataId}-${item.key}` : undefined}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active !== null ? (
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${active}`} className="tabs-panel">
          {children}
        </div>
      ) : null}
    </div>
  );
}
