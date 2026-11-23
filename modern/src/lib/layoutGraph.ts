/**
 * The normalised ontology as @dreamlab-ai/ontomark-graph layout input.
 *
 * Mapping (one rule each):
 *
 * - Nodes: every normalised node, in normaliser order, which is also the
 *   order the graph store inserts them. Classes, `owl:Thing`, set-operator
 *   classes (`owl:unionOf` and the rest), datatypes and literals (declared or
 *   synthesised per edge) are all nodes. Node `i` of the layout is `ids[i]`,
 *   and the driver reports positions as interleaved `x, y` in that order.
 * - Edges: every normalised edge (object and datatype properties, subclass,
 *   disjointness and generated set-operator edges), as `source -> target`.
 *   The layout treats each as an undirected spring of equal weight: the kind
 *   is carried for readers of the graph but the vowl-wasm adapter sends every
 *   edge with type 0. The driver drops self-loops and merges repeated and
 *   reversed pairs (an inverse property pair, say) into one spring; the store
 *   keeps and draws every edge.
 * - Labels are carried because the driver validates them; positions are not
 *   seeded here, so a new graph starts on the driver's deterministic spiral.
 */

import type { GraphData } from '@dreamlab-ai/ontomark-graph';
import type { NormalisedOntology } from './owl2vowl';

export interface LayoutGraph {
  graph: GraphData;
  /** Index-to-id map for the driver's position snapshots. */
  ids: string[];
}

export function toLayoutGraph(ontology: Pick<NormalisedOntology, 'nodes' | 'edges'>): LayoutGraph {
  const ids = ontology.nodes.map((n) => n.id);
  return {
    ids,
    graph: {
      nodes: ontology.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind })),
      edges: ontology.edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind }))
    }
  };
}
