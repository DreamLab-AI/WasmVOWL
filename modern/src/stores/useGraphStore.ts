/**
 * Graph state management with Zustand
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Node, Edge, GraphFilter, GraphStatistics } from '../types/graph';
import type { OntologyData } from '../types/ontology';
import { isNormalisedOntology, normaliseOwl2Vowl, type NormalisedOntology } from '../lib/owl2vowl';

// The state holds Maps and Sets. Immer drafts them only once its MapSet plugin
// is enabled; without it every `set()` on this store throws "[Immer] The plugin
// for 'MapSet' has not been loaded" (minified as "[Immer] minified error nr: 0").
// Enabled here, where the Map/Set state is declared, so that anything importing
// the store gets a working one.
enableMapSet();

interface GraphState {
  // Data
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  filteredNodes: Set<string>;
  filteredEdges: Set<string>;

  // Selection
  selectedNode: string | null;
  selectedEdge: string | null;
  hoveredNode: string | null;
  hoveredEdge: string | null;

  // Filters
  activeFilters: GraphFilter[];

  // Statistics
  statistics: GraphStatistics | null;

  /** The normalised ontology the graph was built from. The layout hook maps
   *  the same object onto the layout input (`toLayoutGraph`), so the store and
   *  the layout agree on nodes and their order. Null when nothing is loaded. */
  ontology: NormalisedOntology | null;

  /** Bumped by `loadOntology` and `clear` only, never by position or
   *  selection updates. The layout hook keys its engine (re)load on it. */
  graphVersion: number;

  // Actions
  /** Load an owl2vowl / WebVOWL document (normalised here) or an already
   *  normalised ontology. Throws on a document that cannot be normalised. */
  loadOntology: (data: OntologyData | NormalisedOntology | unknown) => void;
  clear: () => void;

  // Node actions
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: [number, number, number]) => void;
  /** Apply one simulation frame: `positions` is interleaved x, y in the order
   *  of `ids` (the engine's getNodeIds / getNodePositions contract). One
   *  store update for the whole frame. */
  updateNodePositions: (ids: readonly string[], positions: ArrayLike<number>) => void;

  // Edge actions
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  removeEdge: (id: string) => void;

  // Selection actions
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;

  // Filter actions
  addFilter: (filter: GraphFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // Statistics
  updateStatistics: () => void;
}

/**
 * Recompute `filteredNodes` / `filteredEdges` from `activeFilters`, on the
 * draft the caller is already editing.
 *
 * This is a plain function, not a store action, on purpose: an action that is
 * called from inside another action's `set(...)` runs against the last
 * committed state, and the outer `set` then overwrites its result with the
 * outer draft. Filters were therefore applied one step late (or never) and
 * `loadOntology` left `statistics` null.
 */
function recomputeFilters(state: GraphState): void {
  const { nodes, edges, activeFilters } = state;

  // Start with all nodes and edges
  const visibleNodes = new Set(nodes.keys());
  const visibleEdges = new Set(edges.keys());

  // Apply each filter
  activeFilters.forEach((filter) => {
    switch (filter.type) {
      case 'nodeType':
        nodes.forEach((node, id) => {
          if (node.type !== filter.config.nodeType) {
            visibleNodes.delete(id);
          }
        });
        break;

      case 'degree': {
        const minDegree = filter.config.min || 0;
        const maxDegree = filter.config.max || Infinity;

        nodes.forEach((_node, id) => {
          const degree = Array.from(edges.values()).filter(
            (e) => e.source === id || e.target === id
          ).length;

          if (degree < minDegree || degree > maxDegree) {
            visibleNodes.delete(id);
          }
        });
        break;
      }

      case 'edgeType':
        edges.forEach((edge, id) => {
          if (edge.type !== filter.config.edgeType) {
            visibleEdges.delete(id);
          }
        });
        break;
    }
  });

  // Remove edges with invisible nodes
  edges.forEach((edge, id) => {
    if (!visibleNodes.has(edge.source) || !visibleNodes.has(edge.target)) {
      visibleEdges.delete(id);
    }
  });

  state.filteredNodes = visibleNodes;
  state.filteredEdges = visibleEdges;
}

/** Recompute `statistics` on the caller's draft; see [`recomputeFilters`]. */
function recomputeStatistics(state: GraphState): void {
  const { nodes, edges } = state;

  const nodeCounts: Record<string, number> = {};
  const edgeCounts: Record<string, number> = {};
  const degrees: number[] = [];

  nodes.forEach((node) => {
    nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;

    const degree = Array.from(edges.values()).filter(
      (e) => e.source === node.id || e.target === node.id
    ).length;
    degrees.push(degree);
  });

  edges.forEach((edge) => {
    edgeCounts[edge.type] = (edgeCounts[edge.type] || 0) + 1;
  });

  state.statistics = {
    nodeCount: nodes.size,
    edgeCount: edges.size,
    classCounts: nodeCounts,
    propertyCounts: edgeCounts,
    maxDegree: Math.max(...degrees, 0),
    avgDegree: degrees.length > 0
      ? degrees.reduce((a, b) => a + b, 0) / degrees.length
      : 0
  };
}

/** Log what normalisation dropped or synthesised, once per load. */
function logNormalisationReport(ontology: NormalisedOntology): void {
  const { dropped, thingFallbacks, inverseResolved, expanded } = ontology.report;
  if (dropped.length > 0) {
    console.warn(`[owl2vowl] dropped ${dropped.length} record(s):`, dropped);
  }
  if (thingFallbacks.length > 0) {
    console.info(`[owl2vowl] ${thingFallbacks.length} propert(y/ies) without domain or range attached to owl:Thing:`, thingFallbacks);
  }
  if (inverseResolved.length > 0) {
    console.info(`[owl2vowl] ${inverseResolved.length} propert(y/ies) took endpoints from their inverse:`, inverseResolved);
  }
  if (expanded.length > 0) {
    console.info(`[owl2vowl] ${expanded.length} multi-valued domain/range propert(y/ies) expanded into one edge per pair:`, expanded);
  }
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    // Initial state
    nodes: new Map(),
    edges: new Map(),
    filteredNodes: new Set(),
    filteredEdges: new Set(),
    selectedNode: null,
    selectedEdge: null,
    hoveredNode: null,
    hoveredEdge: null,
    activeFilters: [],
    statistics: null,
    ontology: null,
    graphVersion: 0,

    // Load ontology data
    loadOntology: (data) => {
      // Normalise outside the draft: a malformed document throws before any
      // state changes, and the caller reports the error.
      const ontology = isNormalisedOntology(data) ? data : normaliseOwl2Vowl(data);
      logNormalisationReport(ontology);

      set((state) => {
        state.nodes.clear();
        state.edges.clear();
        state.filteredNodes.clear();
        state.filteredEdges.clear();
        state.selectedNode = null;
        state.selectedEdge = null;
        state.hoveredNode = null;
        state.hoveredEdge = null;

        for (const n of ontology.nodes) {
          const node: Node = {
            id: n.id,
            type: n.kind,
            label: n.label,
            iri: n.iri,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            properties: {
              vowlType: n.vowlType,
              comment: n.comment,
              instances: n.instances,
              individuals: n.individuals,
              attributes: n.attributes,
              equivalent: n.equivalent,
              superClasses: n.superClasses,
              subClasses: n.subClasses,
              synthetic: n.synthetic
            }
          };
          state.nodes.set(node.id, node);
        }

        for (const e of ontology.edges) {
          const edge: Edge = {
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.kind,
            label: e.label,
            properties: {
              propertyId: e.propertyId,
              vowlType: e.vowlType,
              iri: e.iri,
              comment: e.comment,
              attributes: e.attributes,
              functional: e.characteristics.functional,
              inverseFunctional: e.characteristics.inverseFunctional,
              transitive: e.characteristics.transitive,
              symmetric: e.characteristics.symmetric,
              inverse: e.inverse,
              cardinality: e.cardinality,
              endpoints: e.endpoints,
              generated: e.generated
            }
          };
          state.edges.set(edge.id, edge);
        }

        // Kept outside Immer's drafting: it is replaced whole, never edited.
        state.ontology = ontology;
        state.graphVersion += 1;

        // Filters and statistics, on this same draft
        recomputeFilters(state);
        recomputeStatistics(state);
      });
    },

    clear: () => set((state) => {
      state.nodes.clear();
      state.edges.clear();
      state.filteredNodes.clear();
      state.filteredEdges.clear();
      state.selectedNode = null;
      state.selectedEdge = null;
      state.hoveredNode = null;
      state.hoveredEdge = null;
      state.activeFilters = [];
      state.statistics = null;
      state.ontology = null;
      state.graphVersion += 1;
    }),

    // Node operations
    addNode: (node) => set((state) => {
      state.nodes.set(node.id, node);
      state.filteredNodes.add(node.id);
    }),

    updateNode: (id, updates) => set((state) => {
      const node = state.nodes.get(id);
      if (node) {
        Object.assign(node, updates);
      }
    }),

    removeNode: (id) => set((state) => {
      state.nodes.delete(id);
      state.filteredNodes.delete(id);
    }),

    updateNodePosition: (id, position) => set((state) => {
      const node = state.nodes.get(id);
      if (node) {
        node.position = { x: position[0], y: position[1], z: position[2] };
      }
    }),

    updateNodePositions: (ids, positions) => set((state) => {
      const count = Math.min(ids.length, Math.floor(positions.length / 2));
      for (let i = 0; i < count; i++) {
        const node = state.nodes.get(ids[i]);
        if (node) {
          node.position = { x: positions[2 * i], y: positions[2 * i + 1], z: 0 };
        }
      }
    }),

    // Edge operations
    addEdge: (edge) => set((state) => {
      state.edges.set(edge.id, edge);
      state.filteredEdges.add(edge.id);
    }),

    updateEdge: (id, updates) => set((state) => {
      const edge = state.edges.get(id);
      if (edge) {
        Object.assign(edge, updates);
      }
    }),

    removeEdge: (id) => set((state) => {
      state.edges.delete(id);
      state.filteredEdges.delete(id);
    }),

    // Selection operations
    selectNode: (id) => set({ selectedNode: id, selectedEdge: null }),
    selectEdge: (id) => set({ selectedEdge: id, selectedNode: null }),
    hoverNode: (id) => set({ hoveredNode: id }),
    hoverEdge: (id) => set({ hoveredEdge: id }),

    // Filter operations
    addFilter: (filter) => set((state) => {
      state.activeFilters.push(filter);
      recomputeFilters(state);
    }),

    removeFilter: (index) => set((state) => {
      state.activeFilters.splice(index, 1);
      recomputeFilters(state);
    }),

    clearFilters: () => set((state) => {
      state.activeFilters = [];
      // Show all nodes and edges
      state.nodes.forEach((_, id) => state.filteredNodes.add(id));
      state.edges.forEach((_, id) => state.filteredEdges.add(id));
    }),

    applyFilters: () => set((state) => {
      recomputeFilters(state);
    }),

    // Statistics
    updateStatistics: () => set((state) => {
      recomputeStatistics(state);
    })
  }))
);
