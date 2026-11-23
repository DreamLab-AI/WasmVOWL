/**
 * Label decluttering for the graph view.
 *
 * Labels are drawn in world units, so on screen they shrink as the camera
 * pulls back, and in a dense layout they pile on top of each other. This
 * module decides which labels to draw:
 *
 * 1. A label whose on-screen font size falls below its kind's minimum is
 *    hidden (edge labels and minor node labels go first; class labels have no
 *    minimum and stay as long as they do not collide).
 * 2. The rest are placed greedily by priority (class labels, then minor node
 *    labels, then edge labels; higher degree first within a kind). A label
 *    whose box overlaps an already placed one is hidden.
 *
 * Pinned labels (the selected or hovered node, and the selected node's edges)
 * are always drawn and placed first.
 *
 * Pure functions, no three.js or React; `LabelDeclutter` feeds them from the
 * store and the camera.
 */

export type LabelKind = 'class' | 'minor' | 'edge';

export interface LabelCandidate {
  id: string;
  kind: LabelKind;
  /** Centre of the label box, world units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** World-unit font size. */
  fontSize: number;
  /** Tie-breaker within a kind; higher is placed first (e.g. degree). */
  weight: number;
  /** Always drawn and placed first (selection, hover). */
  pinned?: boolean;
}

/** Smallest on-screen font size, in CSS pixels, at which each kind is drawn. */
export const MIN_FONT_PX: Record<LabelKind, number> = {
  class: 0,
  minor: 7,
  edge: 8
};

const KIND_RANK: Record<LabelKind, number> = { class: 2, minor: 1, edge: 0 };

/** Average glyph advance as a fraction of the font size (a sans-serif estimate). */
const GLYPH_WIDTH = 0.6;
const LINE_HEIGHT = 1.2;

/**
 * Estimated box of `text` drawn at `fontSize`, wrapped at `maxWidth` when
 * given (troika-three-text wraps on word boundaries; this treats the text as
 * evenly divisible, which is close enough for overlap tests).
 */
export function estimateLabelBox(text: string, fontSize: number, maxWidth?: number) {
  const natural = Math.max(1, text.length) * fontSize * GLYPH_WIDTH;
  if (maxWidth && maxWidth > 0 && natural > maxWidth) {
    const lines = Math.ceil(natural / maxWidth);
    return { width: maxWidth, height: lines * fontSize * LINE_HEIGHT };
  }
  return { width: natural, height: fontSize * LINE_HEIGHT };
}

/**
 * CSS pixels per world unit on the z = 0 plane, for a perspective camera at
 * `distance` with vertical field of view `fovDeg` in a viewport `heightPx`
 * tall.
 */
export function pixelsPerUnit(distance: number, fovDeg: number, heightPx: number): number {
  const visibleHeight = 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
  return visibleHeight > 0 ? heightPx / visibleHeight : 0;
}

/**
 * Ids of the labels to draw. `gap` is extra world-unit spacing required
 * between two placed labels.
 */
export function declutterLabels(
  candidates: readonly LabelCandidate[],
  pxPerUnit: number,
  options: { minFontPx?: Partial<Record<LabelKind, number>>; gap?: number } = {}
): Set<string> {
  const minFontPx = { ...MIN_FONT_PX, ...options.minFontPx };
  const gap = options.gap ?? 2;
  const legible = candidates.filter(
    (c) => c.pinned || c.fontSize * pxPerUnit >= minFontPx[c.kind]
  );
  legible.sort(
    (a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) ||
      KIND_RANK[b.kind] - KIND_RANK[a.kind] ||
      b.weight - a.weight ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );

  const placed: LabelCandidate[] = [];
  const shown = new Set<string>();
  for (const c of legible) {
    if (c.pinned || !placed.some((p) => overlaps(p, c, gap))) {
      placed.push(c);
      shown.add(c.id);
    }
  }
  return shown;
}

function overlaps(a: LabelCandidate, b: LabelCandidate, gap: number): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width + 2 * gap &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height + 2 * gap
  );
}

/** Whether two id sets hold the same ids. */
export function sameIdSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
