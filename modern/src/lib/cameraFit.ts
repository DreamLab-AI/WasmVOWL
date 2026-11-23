/**
 * Camera framing for the graph view.
 *
 * Pure geometry, kept free of three.js and React so it can be unit-tested:
 * the bounds of the laid-out graph, the camera distance at which a
 * perspective camera shows those bounds with padding, and the clamped
 * distance after a zoom step. `CameraController` applies the results.
 */

/** Axis-aligned bounds in layout (world) units, on the z = 0 plane. */
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Positioned {
  position: { x: number; y: number };
}

export interface FitOptions {
  /** Vertical field of view in degrees. */
  fovDeg: number;
  /** Viewport width / height. */
  aspect: number;
  /** Extra space around the bounds, as a fraction of their half-extent (default 0.1). */
  padding?: number;
  /** Closest the camera may get (default 50). */
  minDistance?: number;
  /** Farthest the camera may get (default 50 000). */
  maxDistance?: number;
  /** Canvas size in CSS pixels; needed with `insets`. */
  size?: { width: number; height: number };
  /**
   * Pixels along each canvas edge that are covered (menu bar, sidebar) or
   * off-screen; the graph is fitted into, and centred in, the rest.
   */
  insets?: Insets;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CameraFit {
  /** Point the camera looks at. */
  center: [number, number];
  /** Camera distance from `center` along the view direction. */
  distance: number;
}

export const DEFAULT_MIN_DISTANCE = 50;
export const DEFAULT_MAX_DISTANCE = 50_000;

/**
 * Bounds of every finite node position, grown by `margin` on each side (node
 * radius plus label room). Returns null when there is no finite position.
 */
export function graphBounds(nodes: Iterable<Positioned>, margin = 0): Bounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { position } of nodes) {
    const { x, y } = position;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return null;
  const m = Math.max(0, margin);
  return { minX: minX - m, maxX: maxX + m, minY: minY - m, maxY: maxY + m };
}

/** Half the visible width and height at `distance` for a perspective camera. */
export function visibleHalfExtent(distance: number, fovDeg: number, aspect: number) {
  const halfHeight = distance * Math.tan((fovDeg * Math.PI) / 360);
  return { halfWidth: halfHeight * aspect, halfHeight };
}

/**
 * Centre and distance at which a perspective camera looking straight at the
 * z = 0 plane shows all of `bounds`, plus padding, in both directions.
 */
export function fitCamera(bounds: Bounds, options: FitOptions): CameraFit {
  const {
    fovDeg,
    aspect,
    padding = 0.1,
    minDistance = DEFAULT_MIN_DISTANCE,
    maxDistance = DEFAULT_MAX_DISTANCE
  } = options;
  const center: [number, number] = [
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2
  ];
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const { size, insets } = options;
  if (size && insets && size.width > 0 && size.height > 0) {
    const freeWidth = Math.max(1, size.width - insets.left - insets.right);
    const freeHeight = Math.max(1, size.height - insets.top - insets.bottom);
    // World units per CSS pixel needed for the bounds to fill the free area.
    const wanted =
      Math.max((bounds.maxX - bounds.minX) / freeWidth, (bounds.maxY - bounds.minY) / freeHeight) *
      (1 + Math.max(0, padding));
    const distance = clamp((wanted * size.height) / 2 / tanHalf, minDistance, maxDistance);
    const unitsPerPx = (2 * distance * tanHalf) / size.height;
    // Shift the view so the bounds' centre lands on the free area's centre.
    const dx = (insets.left - insets.right) / 2;
    const dy = (insets.top - insets.bottom) / 2;
    return {
      center: [center[0] - dx * unitsPerPx, center[1] + dy * unitsPerPx],
      distance
    };
  }
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const halfWidth = (bounds.maxX - bounds.minX) / 2;
  const halfHeight = (bounds.maxY - bounds.minY) / 2;
  // The half-height the view must show so that the width also fits.
  const needed = Math.max(halfHeight, halfWidth / safeAspect) * (1 + Math.max(0, padding));
  const distance = needed / tanHalf;
  return { center, distance: clamp(distance, minDistance, maxDistance) };
}

/**
 * Insets of `canvas` (a client rect) that the user cannot see: the parts
 * outside the window, and overlays such as a menu bar or sidebar. An overlay
 * counts against an edge when it reaches that edge of the visible canvas and
 * spans at least half of it; smaller ones (badges, tooltips) are ignored.
 */
export function visibleInsets(
  canvas: Rect,
  viewport: { width: number; height: number },
  overlays: readonly Rect[]
): Insets {
  const insets: Insets = {
    top: Math.max(0, -canvas.top),
    left: Math.max(0, -canvas.left),
    bottom: Math.max(0, canvas.bottom - viewport.height),
    right: Math.max(0, canvas.right - viewport.width)
  };
  const vis: Rect = {
    left: canvas.left + insets.left,
    top: canvas.top + insets.top,
    right: canvas.right - insets.right,
    bottom: canvas.bottom - insets.bottom
  };
  const visWidth = vis.right - vis.left;
  const visHeight = vis.bottom - vis.top;
  for (const r of overlays) {
    const width = Math.min(r.right, vis.right) - Math.max(r.left, vis.left);
    const height = Math.min(r.bottom, vis.bottom) - Math.max(r.top, vis.top);
    if (width <= 0 || height <= 0) continue;
    if (width >= visWidth / 2) {
      if (r.top <= vis.top + 1) insets.top = Math.max(insets.top, r.bottom - canvas.top);
      if (r.bottom >= vis.bottom - 1) insets.bottom = Math.max(insets.bottom, canvas.bottom - r.top);
    }
    if (height >= visHeight / 2) {
      if (r.right >= vis.right - 1) insets.right = Math.max(insets.right, canvas.right - r.left);
      if (r.left <= vis.left + 1) insets.left = Math.max(insets.left, r.right - canvas.left);
    }
  }
  return insets;
}

/**
 * Distance after zooming by `factor` (> 1 moves closer), clamped to
 * `[min, max]`. A non-positive or non-finite factor leaves it unchanged.
 */
export function zoomedDistance(
  distance: number,
  factor: number,
  min = DEFAULT_MIN_DISTANCE,
  max = DEFAULT_MAX_DISTANCE
): number {
  if (!Number.isFinite(factor) || factor <= 0) return clamp(distance, min, max);
  return clamp(distance / factor, min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
