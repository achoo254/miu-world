// Modal dialog: dimmed backdrop over the game, focus moved in and kept inside (Tab cycles), Esc
// closes, focus returns to what was focused before. Screens: Pause, Offline, Backpack. The `scene`
// variant is for quest screens: no white panel, the paused game stays visible behind a light scrim,
// and the title sits on a banner (mock "quest screens").
import { useEffect, useId, useRef, type ReactNode } from 'react';
import './modal.css';
import './scene.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  onClose,
  children,
  dataId,
  placement = 'center',
  size = 'normal',
  variant = 'panel',
  titleClass,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  dataId?: string;
  /** `bottom` docks the panel at the bottom edge (NPC dialogue over the game). */
  placement?: 'center' | 'bottom';
  /** `wide` fits a challenge close-up. */
  size?: 'normal' | 'wide';
  /** `scene`: themed materials over the paused game instead of a white panel. */
  variant?: 'panel' | 'scene';
  /** Class of the title element (`ribbon` banner by default in the scene variant). */
  titleClass?: string;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Latest onClose without re-running the focus effect on every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (focusables()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && close.current) {
        e.preventDefault();
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      before?.focus();
    };
  }, []);

  return (
    <div className={`modal-backdrop modal-backdrop--${placement}${variant === 'scene' ? ' modal-backdrop--scene' : ''}`} data-id={dataId ? `${dataId}-backdrop` : undefined}>
      <div
        ref={dialog}
        className={variant === 'scene' ? `modal scene-modal modal--${size}` : `panel modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-id={dataId}
      >
        <h2 id={titleId} className={titleClass ?? (variant === 'scene' ? 'ribbon' : 'modal-title')}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
