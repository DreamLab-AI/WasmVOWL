import { describe, it, expect } from 'vitest';
import { nodeRadius, framingPoints, nodeLabelKind } from '@/lib/nodeGeometry';
import { graphBounds } from '@/lib/cameraFit';
import type { Node } from '@/types/graph';

const node = (type: Node['type'], properties: Node['properties'] = {}) => ({ type, properties });

describe('nodeGeometry', () => {
  it('sizes a node from its instance count and the scale', () => {
    expect(nodeRadius(node('class'))).toBe(20);
    expect(nodeRadius(node('class', { instances: 25 }))).toBe(30);
    expect(nodeRadius(node('class'), 1.5)).toBe(30);
  });

  it('treats named classes as class labels and the rest as minor', () => {
    expect(nodeLabelKind(node('class', { vowlType: 'owl:Class' }))).toBe('class');
    expect(nodeLabelKind(node('class', { vowlType: 'owl:Thing' }))).toBe('minor');
    expect(nodeLabelKind(node('class', { vowlType: 'owl:unionOf' }))).toBe('minor');
    expect(nodeLabelKind(node('datatype', { vowlType: 'rdfs:Datatype' }))).toBe('minor');
    expect(nodeLabelKind(node('literal'))).toBe('minor');
  });

  it('frames the disc and the whole wrapped label below it', () => {
    const long = { properties: {}, label: 'Location of sales or service provisioning', position: { x: 0, y: 0, z: 0 } };
    const bounds = graphBounds(framingPoints([long]))!;
    // Disc plus border reaches 22 above; the label wraps at 80 units into
    // several 16.8-unit lines centred 35 below the node.
    expect(bounds.maxY).toBe(22);
    expect(bounds.minY).toBeLessThan(-35 - 3 * 16.8 / 2);
    expect(bounds.maxX).toBe(40);
    const noLabels = graphBounds(framingPoints([long], 1, false))!;
    expect(noLabels.minY).toBe(-22);
  });
});
