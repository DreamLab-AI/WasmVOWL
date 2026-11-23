import { describe, it, expect } from 'vitest';
import {
  declutterLabels,
  estimateLabelBox,
  pixelsPerUnit,
  sameIdSet,
  type LabelCandidate
} from '@/lib/labelDeclutter';

function label(id: string, kind: LabelCandidate['kind'], x: number, y: number, extra: Partial<LabelCandidate> = {}): LabelCandidate {
  const fontSize = kind === 'edge' ? 10 : 14;
  return { id, kind, x, y, width: 60, height: fontSize * 1.2, fontSize, weight: 0, ...extra };
}

describe('pixelsPerUnit', () => {
  it('is the viewport height over the visible height', () => {
    // At z = 500 with a 50 degree fov the view shows about 466 units.
    expect(pixelsPerUnit(500, 50, 993)).toBeCloseTo(993 / (2 * 500 * Math.tan((25 * Math.PI) / 180)));
    expect(pixelsPerUnit(0, 50, 993)).toBe(0);
  });
});

describe('estimateLabelBox', () => {
  it('grows with the text and wraps at maxWidth', () => {
    const short = estimateLabelBox('Agent', 14);
    expect(short.width).toBeCloseTo(5 * 14 * 0.6);
    expect(short.height).toBeCloseTo(14 * 1.2);
    const wrapped = estimateLabelBox('Location of sales or service provisioning', 14, 80);
    expect(wrapped.width).toBe(80);
    expect(wrapped.height).toBeGreaterThan(14 * 1.2 * 3);
  });
});

describe('declutterLabels', () => {
  it('shows every label when nothing overlaps and fonts are legible', () => {
    const shown = declutterLabels(
      [label('a', 'class', 0, 0), label('b', 'minor', 200, 0), label('e', 'edge', 0, 200)],
      1
    );
    expect([...shown].sort()).toEqual(['a', 'b', 'e']);
  });

  it('hides edge labels first, then minor node labels, as the camera pulls back; class labels stay', () => {
    const all = [label('a', 'class', 0, 0), label('b', 'minor', 200, 0), label('e', 'edge', 0, 200)];
    // Edge font 10 world units: below 8 px at 0.7 px/unit; minor 14 units: 9.8 px, kept.
    expect([...declutterLabels(all, 0.7)].sort()).toEqual(['a', 'b']);
    // At 0.4 px/unit the minor label is 5.6 px: hidden too.
    expect([...declutterLabels(all, 0.4)]).toEqual(['a']);
    expect([...declutterLabels(all, 0.01)]).toEqual(['a']);
  });

  it('drops the lower-priority label of an overlapping pair', () => {
    const shown = declutterLabels(
      [label('edge', 'edge', 5, 0), label('minor', 'minor', 0, 5), label('cls', 'class', 0, 0)],
      1
    );
    expect([...shown]).toEqual(['cls']);
  });

  it('prefers the heavier class label when two class labels collide', () => {
    const shown = declutterLabels(
      [label('leaf', 'class', 0, 0, { weight: 1 }), label('hub', 'class', 10, 0, { weight: 9 })],
      1
    );
    expect([...shown]).toEqual(['hub']);
  });

  it('always shows pinned labels, even tiny or overlapping', () => {
    const shown = declutterLabels(
      [label('hub', 'class', 0, 0, { weight: 9 }), label('picked', 'edge', 1, 0, { pinned: true })],
      0.1
    );
    expect(shown.has('picked')).toBe(true);
    expect(shown.has('hub')).toBe(false);
  });

  it('is deterministic for equal priorities', () => {
    const a = [label('x', 'class', 0, 0), label('y', 'class', 1, 0)];
    expect([...declutterLabels(a, 1)]).toEqual(['x']);
    expect([...declutterLabels([...a].reverse(), 1)]).toEqual(['x']);
  });
});

describe('sameIdSet', () => {
  it('compares membership', () => {
    expect(sameIdSet(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameIdSet(new Set(['a']), new Set(['b']))).toBe(false);
    expect(sameIdSet(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });
});
