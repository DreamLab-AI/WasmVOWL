/**
 * Drawn size and label placement of graph nodes, shared by the node
 * renderer, the camera fit and the label declutter so all three agree.
 */

import type { Node } from '../types/graph';
import { estimateLabelBox, type LabelKind } from './labelDeclutter';

export const BASE_NODE_RADIUS = 20;
export const NODE_LABEL_FONT = 14;
export const EDGE_LABEL_FONT = 10;
/** Gap between a node's disc and the centre of its label, world units. */
export const NODE_LABEL_OFFSET = 15;
export const EDGE_LABEL_MAX_WIDTH = 200;

/** Disc radius of `node` at `nodeScale`, before the 2-unit border. */
export function nodeRadius(node: Pick<Node, 'properties'>, nodeScale = 1): number {
  const instances = node.properties?.instances || 0;
  const radius = instances > 0 ? Math.sqrt(instances) * 2 + BASE_NODE_RADIUS : BASE_NODE_RADIUS;
  return radius * nodeScale;
}

/** Wrap width of a node label. */
export function nodeLabelMaxWidth(radius: number): number {
  return radius * 4;
}

/**
 * Corner points of everything drawn for each node: its disc (with border) and,
 * when labels are on, its label box, so a camera fit frames whole labels
 * including wrapped multi-line ones.
 */
export function framingPoints(
  nodes: Iterable<Pick<Node, 'properties' | 'position' | 'label'>>,
  nodeScale = 1,
  showLabels = true
): Array<{ position: { x: number; y: number } }> {
  const points: Array<{ position: { x: number; y: number } }> = [];
  const add = (x: number, y: number) => points.push({ position: { x, y } });
  for (const node of nodes) {
    const { x, y } = node.position;
    const r = nodeRadius(node, nodeScale) + 2;
    add(x - r, y - r);
    add(x + r, y + r);
    if (showLabels && node.label) {
      const box = estimateLabelBox(node.label, NODE_LABEL_FONT, nodeLabelMaxWidth(r - 2));
      const cy = y - (r - 2) - NODE_LABEL_OFFSET;
      add(x - box.width / 2, cy - box.height / 2);
      add(x + box.width / 2, cy + box.height / 2);
    }
  }
  return points;
}

const MINOR_TYPES = new Set([
  'owl:thing',
  'rdfs:literal',
  'rdfs:datatype',
  'owl:unionof',
  'owl:intersectionof',
  'owl:complementof',
  'owl:disjointunionof'
]);

/**
 * Declutter kind of a node's label: named classes are `class`; datatypes,
 * literals, owl:Thing and set operators are `minor`.
 */
export function nodeLabelKind(node: Pick<Node, 'type' | 'properties'>): LabelKind {
  if (node.type === 'datatype' || node.type === 'literal') return 'minor';
  const vowlType = String(node.properties?.vowlType ?? '').toLowerCase();
  return MINOR_TYPES.has(vowlType) ? 'minor' : 'class';
}
