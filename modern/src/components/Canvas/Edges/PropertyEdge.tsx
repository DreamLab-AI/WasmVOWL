/**
 * Property edge visualization component
 */

import { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../../stores/useGraphStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { Edge } from '../../../types/graph';

interface PropertyEdgeProps {
  edge: Edge;
}

export function PropertyEdge({ edge }: PropertyEdgeProps) {
  const sourceNode = useGraphStore((s) => s.nodes.get(edge.source));
  const targetNode = useGraphStore((s) => s.nodes.get(edge.target));
  const isSelected = useGraphStore((s) => s.selectedEdge === edge.id);
  const settings = useUIStore((s) => s.settings);

  // Line end points, label midpoint and arrow direction. Computed before any
  // early return so the hooks run in the same order on every render.
  const geometry = useMemo(() => {
    if (!sourceNode || !targetNode) return null;
    const from = new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z);
    const to = new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z);
    return {
      points: [from, to],
      midpoint: new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2 + 1),
      direction: new THREE.Vector3().subVectors(to, from).normalize()
    };
  }, [sourceNode, targetNode]);

  if (!geometry || !sourceNode || !targetNode) return null;
  const { points, midpoint, direction: arrowDirection } = geometry;

  // Edge styling based on type
  const getEdgeColor = () => {
    if (isSelected) return '#67bc0f';

    switch (edge.type) {
      case 'subclass':
        return '#444';
      case 'objectProperty':
        return '#999';
      case 'datatypeProperty':
        return '#666';
      case 'disjoint':
        return '#ff6666';
      default:
        return '#999';
    }
  };

  const getLineWidth = () => {
    const base = edge.type === 'subclass' ? 3 : 2;
    return base * settings.edgeWidth;
  };

  // Get line dash pattern for different edge types
  const getLineDash = () => {
    switch (edge.type) {
      case 'disjoint':
        return [5, 5];  // Dashed
      case 'setOperator':
        return [3, 3];  // Dashed (VOWL set-operator link)
      default:
        return undefined;
    }
  };

  return (
    <group>
      {/* Main edge line */}
      <Line
        points={points}
        color={getEdgeColor()}
        lineWidth={getLineWidth()}
        transparent
        opacity={edge.opacity || 0.6}
        dashed={!!getLineDash()}
        dashSize={getLineDash()?.[0]}
        gapSize={getLineDash()?.[1]}
      />

      {/* Edge label */}
      {settings.showLabels && edge.label && (
        <Text
          position={midpoint}
          fontSize={10}
          color="#666"
          anchorX="center"
          anchorY="middle"
          maxWidth={200}
          textAlign="center"
          outlineWidth={2}
          outlineColor="#ffffff"
        >
          {edge.label}
        </Text>
      )}

      {/* Arrow indicator for directed edges */}
      {edge.type !== 'disjoint' && (
        <mesh
          position={[
            targetNode.position.x - arrowDirection.x * 25,
            targetNode.position.y - arrowDirection.y * 25,
            targetNode.position.z
          ]}
          rotation={[0, 0, Math.atan2(arrowDirection.y, arrowDirection.x)]}
        >
          <coneGeometry args={[5, 10, 8]} />
          <meshBasicMaterial
            color={getEdgeColor()}
            transparent
            opacity={edge.opacity || 0.6}
          />
        </mesh>
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Line
          points={points}
          color="#67bc0f"
          lineWidth={getLineWidth() + 4}
          transparent
          opacity={0.3}
        />
      )}
    </group>
  );
}
