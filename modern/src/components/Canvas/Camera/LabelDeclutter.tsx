/**
 * Recomputes which labels to hide (see `lib/labelDeclutter.ts`) as the
 * layout moves and the camera zooms, and writes the result to
 * `useLabelStore`. Runs at most every `INTERVAL_MS`, and only when node
 * positions, the selection or the camera distance changed since the last
 * pass.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { useGraphStore } from '../../../stores/useGraphStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useLabelStore } from '../../../stores/useLabelStore';
import { declutterLabels, pixelsPerUnit } from '../../../lib/labelDeclutter';
import { buildLabelCandidates, hiddenLabelSets } from '../../../lib/labelCandidates';

const INTERVAL_MS = 250;

interface ControlsLike {
  target: THREE.Vector3;
}

export function LabelDeclutter() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const last = useRef({ at: 0, key: '' });
  const lastNodes = useRef<unknown>(null);

  useFrame(({ camera, size, clock }) => {
    const now = clock.elapsedTime * 1000;
    if (now - last.current.at < INTERVAL_MS) return;

    const graph = useGraphStore.getState();
    const { settings } = useUIStore.getState();
    const distance = controls ? camera.position.distanceTo(controls.target) : Math.abs(camera.position.z);
    const pxPerUnit = pixelsPerUnit(distance, (camera as THREE.PerspectiveCamera).fov ?? 50, size.height);

    // Anything that changes the answer: the node map identity (Immer replaces
    // it on every position update), filters, selection, scale and zoom.
    const key = [
      graph.graphVersion,
      graph.nodes.size,
      graph.filteredNodes.size,
      graph.filteredEdges.size,
      graph.selectedNode,
      graph.hoveredNode,
      graph.selectedEdge,
      settings.nodeScale,
      pxPerUnit.toFixed(3)
    ].join('|');
    const nodesRef = graph.nodes;
    if (key === last.current.key && nodesRef === lastNodes.current) return;
    last.current = { at: now, key };
    lastNodes.current = nodesRef;

    const candidates = buildLabelCandidates({
      nodes: graph.nodes,
      edges: graph.edges,
      visibleNodes: graph.filteredNodes,
      visibleEdges: graph.filteredEdges,
      nodeScale: settings.nodeScale,
      selectedNode: graph.selectedNode,
      hoveredNode: graph.hoveredNode,
      selectedEdge: graph.selectedEdge
    });
    const hidden = hiddenLabelSets(candidates, declutterLabels(candidates, pxPerUnit));
    useLabelStore.getState().setHidden(hidden.nodes, hidden.edges);
  });

  return null;
}
