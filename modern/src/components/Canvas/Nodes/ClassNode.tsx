/**
 * Class node visualization component
 */

import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Circle, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../../stores/useGraphStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useLabelStore } from '../../../stores/useLabelStore';
import { NODE_LABEL_FONT, NODE_LABEL_OFFSET, nodeLabelMaxWidth, nodeRadius } from '../../../lib/nodeGeometry';
import type { Node } from '../../../types/graph';

interface ClassNodeProps {
  node: Node;
}

export function ClassNode({ node }: ClassNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const isSelected = useGraphStore((s) => s.selectedNode === node.id);
  const settings = useUIStore((s) => s.settings);
  const labelHidden = useLabelStore((s) => s.hiddenNodeLabels.has(node.id));

  const instanceCount = node.properties?.instances || 0;
  const scaledRadius = nodeRadius(node, settings.nodeScale);

  // Node colors, following the VOWL notation's fills: classes light blue,
  // datatypes and literals yellow, owl:Thing white, external classes dark blue.
  const vowlType = String(node.properties?.vowlType ?? '').toLowerCase();
  const baseColor = () => {
    if (node.type === 'datatype' || node.type === 'literal') return '#ffcc33';
    if (vowlType === 'owl:thing') return '#ffffff';
    if (vowlType === 'externalclass' || (node.properties?.attributes ?? []).includes('external')) return '#3366cc';
    return '#aaccee';
  };
  const getNodeColor = () => {
    if (isSelected) return '#67bc0f'; // Green when selected
    if (hovered) return '#8cd0f0';    // Light blue when hovered
    return baseColor();
  };

  // Event handlers
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(isSelected ? null : node.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    hoverNode(node.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    hoverNode(null);
    document.body.style.cursor = 'auto';
  };

  // Smooth position interpolation
  useFrame(() => {
    if (meshRef.current && !node.pinned) {
      const targetPos = new THREE.Vector3(
        node.position.x,
        node.position.y,
        node.position.z
      );

      meshRef.current.position.lerp(targetPos, 0.1);
    }
  });

  return (
    <group>
      {/* Node circle */}
      <Circle
        ref={meshRef}
        args={[scaledRadius, 32]}
        position={[node.position.x, node.position.y, node.position.z]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={node.opacity || 1}
        />
      </Circle>

      {/* Node border */}
      <Circle
        args={[scaledRadius + 2, 32]}
        position={[node.position.x, node.position.y, node.position.z - 0.1]}
      >
        <meshBasicMaterial
          color={isSelected ? '#67bc0f' : '#333'}
          transparent
          opacity={isSelected ? 0.5 : 0.2}
          side={THREE.DoubleSide}
        />
      </Circle>

      {/* Node label */}
      {/* Hidden by the declutter pass when it overlaps a more important
          label or is too small to read; the selected/hovered node always shows. */}
      {settings.showLabels && (!labelHidden || isSelected || hovered) && (
        <Text
          position={[
            node.position.x,
            node.position.y - scaledRadius - NODE_LABEL_OFFSET,
            node.position.z + 1
          ]}
          fontSize={NODE_LABEL_FONT}
          color="#333"
          anchorX="center"
          anchorY="middle"
          maxWidth={nodeLabelMaxWidth(scaledRadius)}
          textAlign="center"
        >
          {node.label}
        </Text>
      )}

      {/* Instance count indicator */}
      {settings.showNodeDetails && instanceCount > 0 && (
        <Text
          position={[node.position.x, node.position.y, node.position.z + 2]}
          fontSize={10}
          color="#666"
          anchorX="center"
          anchorY="middle"
        >
          {instanceCount}
        </Text>
      )}

      {/* Selection ring */}
      {isSelected && (
        <Circle
          args={[scaledRadius + 8, 32]}
          position={[node.position.x, node.position.y, node.position.z - 0.2]}
        >
          <meshBasicMaterial
            color="#67bc0f"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </Circle>
      )}

      {/* Hover effect */}
      {hovered && !isSelected && (
        <Circle
          args={[scaledRadius + 5, 32]}
          position={[node.position.x, node.position.y, node.position.z - 0.15]}
        >
          <meshBasicMaterial
            color="#8cd0f0"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </Circle>
      )}
    </group>
  );
}
