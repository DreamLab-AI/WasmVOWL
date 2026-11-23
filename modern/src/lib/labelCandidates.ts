/**
 * Turn the graph store's nodes and edges into declutter candidates, placed
 * where `ClassNode` and `PropertyEdge` draw their labels.
 */

import type { Node, Edge } from '../types/graph';
import { estimateLabelBox, type LabelCandidate } from './labelDeclutter';
import {
  EDGE_LABEL_FONT,
  EDGE_LABEL_MAX_WIDTH,
  NODE_LABEL_FONT,
  NODE_LABEL_OFFSET,
  nodeLabelKind,
  nodeLabelMaxWidth,
  nodeRadius
} from './nodeGeometry';

export interface CandidateInput {
  nodes: ReadonlyMap<string, Node>;
  edges: ReadonlyMap<string, Edge>;
  visibleNodes: ReadonlySet<string>;
  visibleEdges: ReadonlySet<string>;
  nodeScale: number;
  selectedNode: string | null;
  hoveredNode: string | null;
  selectedEdge: string | null;
}

/** Node and edge label candidates. Ids are prefixed `n:` and `e:` so the two never collide. */
export function buildLabelCandidates(input: CandidateInput): LabelCandidate[] {
  const { nodes, edges, visibleNodes, visibleEdges, nodeScale, selectedNode, hoveredNode, selectedEdge } = input;

  const degree = new Map<string, number>();
  for (const edge of edges.values()) {
    if (!visibleEdges.has(edge.id)) continue;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const out: LabelCandidate[] = [];
  for (const node of nodes.values()) {
    if (!visibleNodes.has(node.id) || !node.label) continue;
    const radius = nodeRadius(node, nodeScale);
    const box = estimateLabelBox(node.label, NODE_LABEL_FONT, nodeLabelMaxWidth(radius));
    out.push({
      id: `n:${node.id}`,
      kind: nodeLabelKind(node),
      x: node.position.x,
      y: node.position.y - radius - NODE_LABEL_OFFSET,
      ...box,
      fontSize: NODE_LABEL_FONT,
      weight: degree.get(node.id) ?? 0,
      pinned: node.id === selectedNode || node.id === hoveredNode
    });
  }

  for (const edge of edges.values()) {
    if (!visibleEdges.has(edge.id) || !edge.label) continue;
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const box = estimateLabelBox(edge.label, EDGE_LABEL_FONT, EDGE_LABEL_MAX_WIDTH);
    out.push({
      id: `e:${edge.id}`,
      kind: 'edge',
      x: (source.position.x + target.position.x) / 2,
      y: (source.position.y + target.position.y) / 2,
      ...box,
      fontSize: EDGE_LABEL_FONT,
      weight: 0,
      pinned:
        edge.id === selectedEdge ||
        (selectedNode !== null && (edge.source === selectedNode || edge.target === selectedNode))
    });
  }
  return out;
}

/** Split the shown ids back into hidden node and edge id sets. */
export function hiddenLabelSets(candidates: readonly LabelCandidate[], shown: ReadonlySet<string>) {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const c of candidates) {
    if (shown.has(c.id)) continue;
    if (c.id.startsWith('n:')) nodes.add(c.id.slice(2));
    else edges.add(c.id.slice(2));
  }
  return { nodes, edges };
}
