/**
 * Which labels the declutter pass hides. Written by `LabelDeclutter`, read
 * by each node and edge. Hidden rather than shown sets, so that before the
 * first pass (and in tests that render a node alone) every label is drawn.
 */

import { create } from 'zustand';
import { sameIdSet } from '../lib/labelDeclutter';

interface LabelStore {
  hiddenNodeLabels: ReadonlySet<string>;
  hiddenEdgeLabels: ReadonlySet<string>;
  /** Replace the hidden sets; a no-op when neither changed, so readers do not re-render. */
  setHidden: (nodes: ReadonlySet<string>, edges: ReadonlySet<string>) => void;
}

export const useLabelStore = create<LabelStore>((set, get) => ({
  hiddenNodeLabels: new Set(),
  hiddenEdgeLabels: new Set(),
  setHidden: (nodes, edges) => {
    const state = get();
    const nodesSame = sameIdSet(state.hiddenNodeLabels, nodes);
    const edgesSame = sameIdSet(state.hiddenEdgeLabels, edges);
    if (nodesSame && edgesSame) return;
    set({
      hiddenNodeLabels: nodesSame ? state.hiddenNodeLabels : nodes,
      hiddenEdgeLabels: edgesSame ? state.hiddenEdgeLabels : edges
    });
  }
}));
