import { describe, it, expect, beforeEach } from 'vitest';
import { useLabelStore } from '@/stores/useLabelStore';

describe('useLabelStore', () => {
  beforeEach(() => {
    useLabelStore.setState(useLabelStore.getInitialState(), true);
  });

  it('hides nothing until the first declutter pass', () => {
    expect(useLabelStore.getState().hiddenNodeLabels.size).toBe(0);
    expect(useLabelStore.getState().hiddenEdgeLabels.size).toBe(0);
  });

  it('keeps the same set objects when the content is unchanged, so readers do not re-render', () => {
    const { setHidden } = useLabelStore.getState();
    setHidden(new Set(['a']), new Set(['p']));
    const first = useLabelStore.getState();
    setHidden(new Set(['a']), new Set(['p']));
    const second = useLabelStore.getState();
    expect(second.hiddenNodeLabels).toBe(first.hiddenNodeLabels);
    expect(second.hiddenEdgeLabels).toBe(first.hiddenEdgeLabels);
    setHidden(new Set(['a']), new Set());
    expect(useLabelStore.getState().hiddenNodeLabels).toBe(first.hiddenNodeLabels);
    expect(useLabelStore.getState().hiddenEdgeLabels.size).toBe(0);
  });
});
