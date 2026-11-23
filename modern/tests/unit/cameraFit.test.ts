import { describe, it, expect } from 'vitest';
import {
  graphBounds,
  fitCamera,
  visibleHalfExtent,
  zoomedDistance,
  visibleInsets,
  DEFAULT_MIN_DISTANCE,
  DEFAULT_MAX_DISTANCE
} from '@/lib/cameraFit';

const at = (x: number, y: number) => ({ position: { x, y } });

describe('graphBounds', () => {
  it('returns null for no nodes or only non-finite positions', () => {
    expect(graphBounds([])).toBeNull();
    expect(graphBounds([at(NaN, 0), at(0, Infinity)])).toBeNull();
  });

  it('spans the nodes and grows by the margin, skipping non-finite positions', () => {
    expect(graphBounds([at(-10, 5), at(30, -20), at(NaN, 1000)], 5)).toEqual({
      minX: -15,
      maxX: 35,
      minY: -25,
      maxY: 10
    });
  });
});

describe('fitCamera', () => {
  const fov = 50;

  it('centres on the bounds', () => {
    const fit = fitCamera({ minX: 100, maxX: 300, minY: -50, maxY: 150 }, { fovDeg: fov, aspect: 1 });
    expect(fit.center).toEqual([200, 50]);
  });

  it('shows the whole graph with padding in both directions', () => {
    // A wide graph in a square viewport: the width decides.
    const bounds = { minX: -600, maxX: 600, minY: -100, maxY: 100 };
    for (const aspect of [0.5, 1, 1920 / 993]) {
      const { distance } = fitCamera(bounds, { fovDeg: fov, aspect, padding: 0.1 });
      const { halfWidth, halfHeight } = visibleHalfExtent(distance, fov, aspect);
      expect(halfWidth).toBeGreaterThanOrEqual(600 * 1.1 - 1e-6);
      expect(halfHeight).toBeGreaterThanOrEqual(100 * 1.1 - 1e-6);
      // Tight: one of the two directions is exactly at the padded extent.
      const slack = Math.min(halfWidth / 660, halfHeight / 110);
      expect(slack).toBeCloseTo(1, 6);
    }
  });

  it('fits the settled foaf layout that the fixed 500-unit camera cropped', () => {
    // Extent measured in the 0.3.0 browser run: x -366..211, y -315..313.
    const bounds = graphBounds([at(-366, -315), at(211, 313)], 55)!;
    const { distance } = fitCamera(bounds, { fovDeg: fov, aspect: 1920 / 993 });
    expect(distance).toBeGreaterThan(500);
    expect(visibleHalfExtent(distance, fov, 1920 / 993).halfHeight).toBeGreaterThan(313 + 55);
  });

  it('clamps to the distance limits', () => {
    const tiny = fitCamera({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, { fovDeg: fov, aspect: 1 });
    expect(tiny.distance).toBe(DEFAULT_MIN_DISTANCE);
    const huge = fitCamera({ minX: -1e9, maxX: 1e9, minY: -1, maxY: 1 }, { fovDeg: fov, aspect: 1 });
    expect(huge.distance).toBe(DEFAULT_MAX_DISTANCE);
  });

  it('treats a degenerate aspect as square', () => {
    const bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    expect(fitCamera(bounds, { fovDeg: fov, aspect: 0 }).distance).toBeCloseTo(
      fitCamera(bounds, { fovDeg: fov, aspect: 1 }).distance
    );
  });
});

describe('zoomedDistance', () => {
  it('moves closer for a factor above 1 and away below 1', () => {
    expect(zoomedDistance(600, 1.2)).toBeCloseTo(500);
    expect(zoomedDistance(500, 1 / 1.2)).toBeCloseTo(600);
  });

  it('clamps and ignores bad factors', () => {
    expect(zoomedDistance(60, 10)).toBe(DEFAULT_MIN_DISTANCE);
    expect(zoomedDistance(40_000, 0.1)).toBe(DEFAULT_MAX_DISTANCE);
    expect(zoomedDistance(500, 0)).toBe(500);
    expect(zoomedDistance(500, NaN)).toBe(500);
  });
});

describe('visibleInsets', () => {
  const canvas = { left: 0, top: 77, right: 1920, bottom: 1070 };
  const viewport = { width: 1920, height: 993 };

  it('counts the part of the canvas below the window and an overlaid sidebar', () => {
    // The browser run: canvas 100vh tall under a 77 px menu, 350 px sidebar on the right.
    const sidebar = { left: 1570, top: 0, right: 1920, bottom: 993 };
    expect(visibleInsets(canvas, viewport, [sidebar])).toEqual({ top: 0, right: 350, bottom: 77, left: 0 });
  });

  it('counts a bar overlapping the top of the canvas', () => {
    const bar = { left: 0, top: 0, right: 1920, bottom: 120 };
    expect(visibleInsets(canvas, viewport, [bar]).top).toBe(43);
  });

  it('ignores overlays that do not touch the canvas or are small', () => {
    const badge = { left: 1600, top: 900, right: 1900, bottom: 980 };
    const elsewhere = { left: 0, top: 0, right: 1920, bottom: 50 };
    expect(visibleInsets(canvas, viewport, [badge, elsewhere])).toEqual({ top: 0, right: 0, bottom: 77, left: 0 });
  });
});

describe('fitCamera with insets', () => {
  const fov = 50;
  const bounds = { minX: -400, maxX: 200, minY: -350, maxY: 350 };
  const size = { width: 1920, height: 993 };
  const insets = { top: 0, right: 350, bottom: 77, left: 0 };

  it('fits the bounds inside the unobstructed part of the canvas', () => {
    const fit = fitCamera(bounds, { fovDeg: fov, aspect: size.width / size.height, padding: 0, size, insets });
    const { halfHeight } = visibleHalfExtent(fit.distance, fov, size.width / size.height);
    const unitsPerPx = (2 * halfHeight) / size.height;
    // Project the bounds' corners to canvas pixels.
    const toPx = (x: number, y: number) => [
      size.width / 2 + (x - fit.center[0]) / unitsPerPx,
      size.height / 2 - (y - fit.center[1]) / unitsPerPx
    ];
    const [left, top] = toPx(bounds.minX, bounds.maxY);
    const [right, bottom] = toPx(bounds.maxX, bounds.minY);
    expect(left).toBeGreaterThanOrEqual(insets.left - 1e-6);
    expect(top).toBeGreaterThanOrEqual(insets.top - 1e-6);
    expect(right).toBeLessThanOrEqual(size.width - insets.right + 1e-6);
    expect(bottom).toBeLessThanOrEqual(size.height - insets.bottom + 1e-6);
    // Centred in the free area.
    expect((left + right) / 2).toBeCloseTo((size.width - insets.right) / 2, 6);
    expect((top + bottom) / 2).toBeCloseTo((size.height - insets.bottom) / 2, 6);
  });

  it('equals the plain fit when there are no insets', () => {
    const plain = fitCamera(bounds, { fovDeg: fov, aspect: size.width / size.height });
    const zero = fitCamera(bounds, {
      fovDeg: fov,
      aspect: size.width / size.height,
      size,
      insets: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    expect(zero.distance).toBeCloseTo(plain.distance, 9);
    expect(zero.center[0]).toBeCloseTo(plain.center[0], 9);
    expect(zero.center[1]).toBeCloseTo(plain.center[1], 9);
  });
});
