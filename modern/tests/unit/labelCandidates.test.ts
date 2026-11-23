import { describe, it, expect } from 'vitest';
import { buildLabelCandidates, hiddenLabelSets } from '@/lib/labelCandidates';
import { declutterLabels } from '@/lib/labelDeclutter';
import type { Node, Edge } from '@/types/graph';

function node(id: string, x: number, y: number, extra: Partial<Node> = {}): Node {
  return {
    id,
    type: 'class',
    label: id,
    position: { x, y, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    properties: { vowlType: 'owl:Class' },
    ...extra
  };
}
function edge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: 'objectProperty', label: id, properties: {} };
}

function input(nodes: Node[], edges: Edge[], extra = {}) {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    visibleNodes: new Set(nodes.map((n) => n.id)),
    visibleEdges: new Set(edges.map((e) => e.id)),
    nodeScale: 1,
    selectedNode: null,
    hoveredNode: null,
    selectedEdge: null,
    ...extra
  };
}

describe('buildLabelCandidates', () => {
  it('places node labels below the disc and edge labels at the midpoint', () => {
    const c = buildLabelCandidates(input([node('a', 0, 0), node('b', 200, 100)], [edge('p', 'a', 'b')]));
    const a = c.find((x) => x.id === 'n:a')!;
    expect([a.x, a.y]).toEqual([0, -35]);
    expect(a.weight).toBe(1);
    const p = c.find((x) => x.id === 'e:p')!;
    expect([p.x, p.y, p.kind]).toEqual([100, 50, 'edge']);
  });

  it('skips filtered-out nodes and edges', () => {
    const c = buildLabelCandidates(
      input([node('a', 0, 0), node('b', 200, 0)], [edge('p', 'a', 'b')], {
        visibleNodes: new Set(['a']),
        visibleEdges: new Set()
      })
    );
    expect(c.map((x) => x.id)).toEqual(['n:a']);
  });

  it('pins the selected node and its edges, and the hovered node', () => {
    const c = buildLabelCandidates(
      input([node('a', 0, 0), node('b', 200, 0), node('c', 400, 0)], [edge('p', 'a', 'b'), edge('q', 'b', 'c')], {
        selectedNode: 'a',
        hoveredNode: 'c'
      })
    );
    const pinned = c.filter((x) => x.pinned).map((x) => x.id).sort();
    expect(pinned).toEqual(['e:p', 'n:a', 'n:c']);
  });

  it('round-trips into hidden node and edge sets', () => {
    // Two nodes on top of each other: one label survives.
    const c = buildLabelCandidates(input([node('a', 0, 0), node('b', 3, 0)], [edge('p', 'a', 'b')]));
    const hidden = hiddenLabelSets(c, declutterLabels(c, 1));
    expect(hidden.nodes.size).toBe(1);
    expect(hidden.edges.has('p')).toBe(false);
  });
});
