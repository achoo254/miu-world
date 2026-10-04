// NEW SCREEN (owner, 03/10/2026: "màn hình nhiệm vụ khó nhìn, ko thao tác di chuyển xem tự do bản đồ được.
// không hiển thị nhiệm vụ phụ và muốn click trên bản đồ sẽ di chuyển đến địa điểm theo những cái đã ghi"): the
// whole map, opened from the round minimap. It fills the screen over the game and its HUD; the map is dragged
// with a finger, zoomed with a pinch, the wheel, a double tap or the − / + buttons, and "Về chỗ bạn" brings the
// child back into view. Every place marked (the quest's place, the characters with minigames, home, the gates,
// the ride stations, the named places) can be tapped, on the map or in the list: a card names it and "Đi tới
// đây" closes the map and walks her there. The legend is a row of chips that also hide or show each group.
// Drawn on a 2D canvas only when something changed (a drag, a zoom, the child moving), never per frame.
import type { WalkGoal } from '../../game-bridge/game-store';
import { buttonClass } from '../../ui/kit/button';
import { UI_ICONS, assetUrl } from '../../ui/kit/ui-art';
import { t } from '../../ui/i18n/i18n';
import { drawMarker, drawPlayer } from './map-draw';
import { blendView, clampView, fitLabels, hitTest, overview, panBy, pinch, scaleLimits, toScreen, zoomAt, type Inset, type MapRect, type Point, type ScaleLimits, type SheetView, type Viewport } from './map-view';
import { MARKER_COLOURS, legendGroups, type MinimapMarker, type PlaceKind } from './minimap-model';
import './map-sheet.css';

/** Marker radius on the sheet (CSS px), and how near a tap must land to pick one. */
const MARKER_R = 11;
const TAP_SLOP = 26;
/** A press that moves less than this and lifts within TAP_MS is a tap; two taps within DOUBLE_TAP_MS zoom in. */
const TAP_MOVE = 8;
const TAP_MS = 450;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_ZOOM = 2;
const BUTTON_ZOOM = 1.8;
const WHEEL_ZOOM = 0.0018;
/** Zoom (px per block) a place picked from the list, or the child, is shown at (at least). */
const FOCUS_SCALE = 3;
const GLIDE_MS = 260;
/** From this zoom (px per block) each kind's names show on the map. */
const LABEL_FROM: Readonly<Record<PlaceKind, number>> = { quest: 0, home: 0, side: 0.8, gate: 0.8, stop: 1.6, place: 2.4 };
/** Drawing order, bottom first; labels are fitted the other way round, so the most important keep theirs. */
const DRAW_ORDER: readonly PlaceKind[] = ['place', 'stop', 'gate', 'side', 'home', 'quest'];

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, dataId?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (dataId) node.dataset.id = dataId;
  return node;
}

function button(className: string, dataId: string, label: string, text?: string): HTMLButtonElement {
  const b = el('button', className, dataId);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.textContent = text ?? label;
  return b;
}

export interface MapSheetInput {
  /** The map from above, `extent` blocks across, drawn from the world's corner (0, 0). */
  base: CanvasImageSource;
  extent: readonly [number, number];
  /** The part of the world the map shows (blocks): the view keeps to it. */
  rect: MapRect;
  /** The map's name, over the sheet. */
  title: string;
  colours: { meadow: string; outline: string; ink: string };
  /** "Đi tới đây": the sheet has closed itself; the game walks her there. */
  onGo(goal: WalkGoal): void;
  /** The sheet closed (✕, Escape, or a walk): focus goes back to the minimap. */
  onClosed(): void;
}

export interface MapSheetState {
  markers: readonly MinimapMarker[];
  player: { x: number; z: number; facing: number };
}

export interface MapSheet {
  readonly root: HTMLElement;
  readonly isOpen: boolean;
  show(state: MapSheetState): void;
  hide(): void;
  /** Where things are now; redrawn only when something moved or changed. */
  update(state: MapSheetState): void;
  dispose(): void;
}

/** The child on the sheet: tapping her says where she is (no walk). */
const PLAYER = 'player';
type Picked = MinimapMarker | typeof PLAYER;

export function createMapSheet(input: MapSheetInput): MapSheet {
  // Outside the game's layer (a fixed element of its own, under the HUD's): the sheet covers the HUD as well.
  const root = el('div', 'map-sheet', 'game-minimap-sheet');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', input.title ? t('map.label', { name: input.title }) : t('map.title'));
  // Focusable, so keys pressed after a tap on the map still reach the sheet (not the game or its pause menu).
  root.tabIndex = -1;
  // `minimap-sheet-canvas`: the class tests and tools use to tell the map's canvases from the game's.
  const canvas = el('canvas', 'minimap-sheet-canvas map-sheet-canvas');
  canvas.setAttribute('aria-hidden', 'true');

  const top = el('div', 'map-sheet-top');
  const title = el('h2', 'map-sheet-title');
  title.textContent = input.title || t('map.title');
  const close = button('map-sheet-close', 'game-minimap-close', t('map.close'), '✕');
  top.append(title, close);

  const bottom = el('div', 'map-sheet-bottom');
  const tools = el('div', 'map-sheet-tools');
  const recenter = button('map-sheet-recenter', 'game-map-recenter', t('map.recenter'));
  const you = el('span', 'map-sheet-you');
  you.setAttribute('aria-hidden', 'true');
  recenter.prepend(you);
  const zoomOut = button('map-sheet-zoom', 'game-map-zoom-out', t('map.zoomOut'), '−');
  const zoomIn = button('map-sheet-zoom', 'game-map-zoom-in', t('map.zoomIn'), '+');
  const zoom = el('div', 'map-sheet-zoom-group');
  zoom.append(zoomOut, zoomIn);
  tools.append(recenter, zoom);

  const card = el('section', 'map-sheet-card', 'game-map-card');
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');
  const cardHead = el('div', 'map-sheet-card-head');
  const cardSwatch = el('span', 'map-sheet-swatch');
  const cardTitle = el('p', 'map-sheet-card-title');
  const cardClose = button('map-sheet-card-close', 'game-map-card-close', t('map.deselect'), '✕');
  cardHead.append(cardSwatch, cardTitle, cardClose);
  const cardDetail = el('p', 'map-sheet-card-detail');
  const go = el('button', `${buttonClass('primary', { block: true })} map-sheet-go`, 'game-map-go');
  go.type = 'button';
  const shoe = el('img', 'map-sheet-go-icon');
  shoe.src = assetUrl(UI_ICONS.runningShoe);
  shoe.alt = '';
  shoe.draggable = false;
  go.append(shoe, document.createTextNode(t('map.goTo')));
  card.append(cardHead, cardDetail, go);

  const list = el('div', 'map-sheet-list', 'game-map-list');
  list.hidden = true;
  // "Danh sách" always in view at the start of the row; the chips after it scroll sideways when they do not fit.
  const legend = el('div', 'map-sheet-legend', 'game-map-legend');
  legend.setAttribute('role', 'toolbar');
  legend.setAttribute('aria-label', t('map.legend'));
  const chips = el('div', 'map-sheet-chips');
  bottom.append(tools, card, list, legend);
  root.append(canvas, top, bottom);
  document.body.append(root);

  const rect = input.rect;
  const ratio = (): number => Math.min(window.devicePixelRatio || 1, 2);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const font = `700 13px ${getComputedStyle(root).fontFamily || 'system-ui, sans-serif'}`;

  let state: MapSheetState = { markers: [], player: { x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2, facing: 0 } };
  let view: SheetView | null = null;
  let picked: Picked | null = null;
  const hiddenKinds = new Set<PlaceKind>();
  let legendFor = '';
  let frame = 0;
  let glide = 0;
  let drawn = { x: Number.NaN, z: Number.NaN, facing: Number.NaN, markers: state.markers };

  const viewport = (): Viewport => ({ width: canvas.clientWidth || window.innerWidth, height: canvas.clientHeight || window.innerHeight });
  /** Room for the title bar and the bottom tools: the map's edge stops there. */
  const inset = (vp: Viewport): Inset => ({ x: 16, y: Math.min(120, vp.height * 0.18) });
  const shown = (): MinimapMarker[] => state.markers.filter((m) => !hiddenKinds.has(m.kind));

  const draw = (): void => {
    frame = 0;
    if (root.hidden) return;
    const vp = viewport();
    const r = ratio();
    const w = Math.max(1, Math.round(vp.width * r));
    const h = Math.max(1, Math.round(vp.height * r));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    view = clampView(view ?? overview(rect, vp, inset(vp)), rect, vp, inset(vp));
    const v = view;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    // The land round the core is not in the horizon: a soft meadow under it.
    ctx.fillStyle = input.colours.meadow;
    ctx.fillRect(0, 0, vp.width, vp.height);
    ctx.imageSmoothingEnabled = false;
    const [x0, z0] = toScreen(v, vp, 0, 0);
    const [x1, z1] = toScreen(v, vp, input.extent[0], input.extent[1]);
    ctx.drawImage(input.base, x0, z0, x1 - x0, z1 - z0);

    const markers = shown();
    const onScreen = (px: number, py: number): boolean => px > -40 && py > -40 && px < vp.width + 40 && py < vp.height + 40;
    for (const kind of DRAW_ORDER) {
      for (const m of markers) {
        if (m.kind !== kind) continue;
        const [px, py] = toScreen(v, vp, m.x, m.z);
        if (onScreen(px, py)) drawMarker(ctx, kind, px, py, MARKER_R, m.colour, input.colours.outline);
      }
    }
    // The picked place: a ring round it.
    const pickedAt = picked === PLAYER ? state.player : picked;
    if (pickedAt) {
      const [px, py] = toScreen(v, vp, pickedAt.x, pickedAt.z);
      ctx.beginPath();
      ctx.arc(px, py, MARKER_R * 1.9, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = input.colours.ink;
      ctx.stroke();
    }
    const [cx, cy] = toScreen(v, vp, state.player.x, state.player.z);
    drawPlayer(ctx, cx, cy, 13, state.player.facing, MARKER_COLOURS.player, input.colours.outline);

    // Names, most important first, each left out where it would cover one already written.
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labels = [...DRAW_ORDER]
      .reverse()
      .flatMap((kind) => (v.scale >= LABEL_FROM[kind] ? markers.filter((m) => m.kind === kind) : []))
      .flatMap((m) => {
        const [px, py] = toScreen(v, vp, m.x, m.z);
        if (!onScreen(px, py)) return [];
        const width = ctx.measureText(m.label).width + 8;
        return [{ m, px, py: py + MARKER_R + 3, box: { x: px - width / 2, y: py + MARKER_R + 1, width, height: 18 } }];
      });
    const fits = fitLabels([{ x: cx - 14, y: cy - 14, width: 28, height: 28 }, ...labels.map((l) => l.box)]).slice(1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = input.colours.outline;
    ctx.fillStyle = input.colours.ink;
    labels.forEach((l, i) => {
      if (!fits[i]) return;
      ctx.strokeText(l.m.label, l.px, l.py);
      ctx.fillText(l.m.label, l.px, l.py);
    });
    drawn = { ...state.player, markers: state.markers };
  };
  const redraw = (): void => {
    if (!frame && !root.hidden) frame = requestAnimationFrame(draw);
  };

  const stopGlide = (): void => {
    if (glide) cancelAnimationFrame(glide);
    glide = 0;
  };
  const setView = (next: SheetView): void => {
    const vp = viewport();
    view = clampView(next, rect, vp, inset(vp));
    redraw();
  };
  /** Eases to a view (at once when the child asked for less motion). */
  const glideTo = (target: SheetView): void => {
    stopGlide();
    const vp = viewport();
    const to = clampView(target, rect, vp, inset(vp));
    const from = view ?? to;
    if (reducedMotion) return setView(to);
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      view = blendView(from, to, 1 - (1 - t) ** 3);
      draw();
      glide = t < 1 ? requestAnimationFrame(step) : 0;
    };
    glide = requestAnimationFrame(step);
  };
  const current = (): SheetView => {
    const vp = viewport();
    return view ?? overview(rect, vp, inset(vp));
  };
  const limits = (): ScaleLimits => {
    const vp = viewport();
    return scaleLimits(rect, vp, inset(vp));
  };
  const zoomBy = (factor: number): void => {
    const vp = viewport();
    glideTo(zoomAt(current(), vp, factor, vp.width / 2, vp.height / 2, limits()));
  };
  const focus = (x: number, z: number): void => {
    const v = current();
    glideTo({ cx: x, cz: z, scale: Math.max(v.scale, FOCUS_SCALE) });
  };

  // The card of the picked place.
  const showCard = (): void => {
    if (!picked) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    if (picked === PLAYER) {
      cardSwatch.className = 'map-sheet-swatch map-sheet-swatch--player';
      cardSwatch.style.setProperty('--swatch', MARKER_COLOURS.player);
      cardTitle.textContent = 'Bạn đang ở đây';
      cardDetail.hidden = true;
      go.hidden = true;
      return;
    }
    cardSwatch.className = `map-sheet-swatch map-sheet-swatch--${picked.kind}`;
    cardSwatch.style.setProperty('--swatch', picked.colour);
    cardTitle.textContent = picked.label;
    cardDetail.textContent = picked.detail ?? '';
    cardDetail.hidden = !picked.detail;
    go.hidden = false;
    card.dataset.kind = picked.kind;
  };
  const pick = (next: Picked | null): void => {
    picked = next;
    showCard();
    redraw();
  };

  // The legend's chips (a group each, tapping one hides or shows it) and the list of every shown place.
  const swatch = (kind: string, colour: string): HTMLSpanElement => {
    const s = el('span', `map-sheet-swatch map-sheet-swatch--${kind}`);
    s.style.setProperty('--swatch', colour);
    s.setAttribute('aria-hidden', 'true');
    return s;
  };
  const listToggle = button('map-sheet-chip map-sheet-chip--list', 'game-map-list-toggle', t('map.listToggle'), t('map.listTitle'));
  listToggle.setAttribute('aria-expanded', 'false');
  legend.append(listToggle, chips);
  const fillList = (): void => {
    if (list.hidden) return;
    const markers = shown();
    const groups = legendGroups(markers);
    list.replaceChildren(
      ...groups.flatMap((g) => [
        Object.assign(el('p', 'map-sheet-list-head'), { textContent: g.label }),
        ...markers
          .filter((m) => m.kind === g.kind)
          .map((m) => {
            const item = el('button', 'map-sheet-list-item', `game-map-place-${m.id}`);
            item.type = 'button';
            const text = el('span', 'map-sheet-list-text');
            const name = el('span', 'map-sheet-list-name');
            name.textContent = m.label;
            text.append(name);
            if (m.detail) {
              const detail = el('span', 'map-sheet-list-detail');
              detail.textContent = m.detail;
              text.append(detail);
            }
            item.append(swatch(m.kind, m.colour), text);
            item.addEventListener('click', () => {
              setList(false);
              pick(m);
              focus(m.x, m.z);
            });
            return item;
          }),
      ]),
    );
    if (!markers.length) list.append(Object.assign(el('p', 'map-sheet-list-head'), { textContent: t('map.noPlaces') }));
  };
  const setList = (open: boolean): void => {
    list.hidden = !open;
    listToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      pick(null);
      fillList();
    }
  };
  listToggle.addEventListener('click', () => setList(list.hidden !== false));
  const fillLegend = (): void => {
    const groups = legendGroups(state.markers);
    const key = groups.map((g) => `${g.kind}:${g.count}:${hiddenKinds.has(g.kind)}`).join('|');
    if (key === legendFor) return;
    legendFor = key;
    chips.replaceChildren(
      ...groups.map((g) => {
        const chip = el('button', 'map-sheet-chip', `game-map-chip-${g.kind}`);
        chip.type = 'button';
        chip.setAttribute('aria-pressed', String(!hiddenKinds.has(g.kind)));
        const chipLabel = g.label.toLocaleLowerCase();
        chip.setAttribute('aria-label', hiddenKinds.has(g.kind) ? t('map.chipToggleShow', { label: chipLabel }) : t('map.chipToggleHide', { label: chipLabel }));
        const count = el('span', 'map-sheet-chip-count');
        count.textContent = String(g.count);
        chip.append(swatch(g.kind, g.colour), document.createTextNode(g.label), count);
        chip.addEventListener('click', () => {
          if (hiddenKinds.has(g.kind)) hiddenKinds.delete(g.kind);
          else hiddenKinds.add(g.kind);
          if (picked && picked !== PLAYER && hiddenKinds.has(picked.kind)) pick(null);
          fillLegend();
          fillList();
          redraw();
        });
        return chip;
      }),
    );
  };

  // Gestures on the map: one finger drags, two pinch, a tap picks, a double tap zooms in; the wheel zooms.
  const pointers = new Map<number, Point>();
  let press: { x: number; y: number; t: number } | null = null;
  let dragged = false;
  let lastTap: { x: number; y: number; t: number } | null = null;
  let box = canvas.getBoundingClientRect();
  const pointOf = (e: { clientX: number; clientY: number }): Point => ({ x: e.clientX - box.left, y: e.clientY - box.top });
  const tap = (p: Point, t: number): void => {
    if (lastTap && t - lastTap.t < DOUBLE_TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
      lastTap = null;
      glideTo(zoomAt(current(), viewport(), DOUBLE_TAP_ZOOM, p.x, p.y, limits()));
      return;
    }
    lastTap = { ...p, t };
    const v = current();
    const vp = viewport();
    const place = hitTest(shown(), v, vp, p.x, p.y, TAP_SLOP);
    const child = hitTest([state.player], v, vp, p.x, p.y, TAP_SLOP);
    pick(place ?? (child ? PLAYER : null));
    if (!list.hidden) setList(false);
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
    box = canvas.getBoundingClientRect();
    stopGlide();
    const p = pointOf(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      press = { ...p, t: e.timeStamp };
      dragged = false;
    } else dragged = true; // a second finger: a pinch, not a tap
  });
  canvas.addEventListener('pointermove', (e) => {
    const before = pointers.get(e.pointerId);
    if (!before) return;
    const p = pointOf(e);
    if (pointers.size === 1) {
      if (!dragged && press && Math.hypot(p.x - press.x, p.y - press.y) < TAP_MOVE) return;
      dragged = true;
      setView(panBy(current(), p.x - before.x, p.y - before.y));
    } else if (pointers.size === 2) {
      const other = [...pointers].find(([id]) => id !== e.pointerId)?.[1];
      if (other) setView(pinch(current(), viewport(), [before, other], [p, other], limits()));
    }
    pointers.set(e.pointerId, p);
  });
  const release = (e: PointerEvent): void => {
    if (!pointers.delete(e.pointerId)) return;
    if (e.type === 'pointerup' && pointers.size === 0 && !dragged && press && e.timeStamp - press.t < TAP_MS) tap(pointOf(e), e.timeStamp);
    if (pointers.size === 0) press = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      stopGlide();
      box = canvas.getBoundingClientRect();
      const p = pointOf(e);
      // Lines (Firefox) are about 16 px each.
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * WHEEL_ZOOM);
      setView(zoomAt(current(), viewport(), factor, p.x, p.y, limits()));
    },
    { passive: false },
  );
  // iOS runs its long-press text selection and double-tap zoom off touches that are not cancelled.
  root.addEventListener(
    'touchstart',
    (e) => {
      if (e.target === canvas) e.preventDefault();
    },
    { passive: false },
  );

  const hide = (): void => {
    if (root.hidden) return;
    stopGlide();
    pointers.clear();
    root.hidden = true;
    setList(false);
    pick(null);
    input.onClosed();
  };
  close.addEventListener('click', hide);
  cardClose.addEventListener('click', () => pick(null));
  recenter.addEventListener('click', () => focus(state.player.x, state.player.z));
  zoomIn.addEventListener('click', () => zoomBy(BUTTON_ZOOM));
  zoomOut.addEventListener('click', () => zoomBy(1 / BUTTON_ZOOM));
  go.addEventListener('click', () => {
    if (!picked || picked === PLAYER) return;
    const goal = picked.goal;
    hide();
    input.onGo(goal);
  });
  // Keys stay on the sheet: the game under it neither walks nor zooms its camera.
  const PAN_KEYS: Readonly<Record<string, readonly [number, number]>> = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    const pan = PAN_KEYS[e.key];
    if (e.key === 'Escape') {
      if (picked) pick(null);
      else hide();
    } else if (e.key === '+' || e.key === '=') zoomBy(BUTTON_ZOOM);
    else if (e.key === '-' || e.key === '_') zoomBy(1 / BUTTON_ZOOM);
    else if (pan) setView(panBy(current(), pan[0], pan[1]));
    else return;
    e.preventDefault();
  };
  root.addEventListener('keydown', onKey);
  root.addEventListener('keyup', (e) => e.stopPropagation());
  const onResize = (): void => redraw();
  window.addEventListener('resize', onResize);

  return {
    root,
    get isOpen() {
      return !root.hidden;
    },
    show(next) {
      state = next;
      root.hidden = false;
      fillLegend();
      showCard();
      draw();
      close.focus({ preventScroll: true });
    },
    hide,
    update(next) {
      const markersChanged = next.markers !== state.markers;
      state = next;
      if (root.hidden) return;
      if (markersChanged) {
        if (picked && picked !== PLAYER) {
          const id = picked.id;
          pick(next.markers.find((m) => m.id === id) ?? null);
        }
        fillLegend();
        fillList();
      }
      const p = next.player;
      const moved = Math.abs(p.x - drawn.x) > 0.05 || Math.abs(p.z - drawn.z) > 0.05 || Math.abs(p.facing - drawn.facing) > 0.02;
      if (moved || next.markers !== drawn.markers) redraw();
    },
    dispose() {
      stopGlide();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      root.remove();
    },
  };
}
