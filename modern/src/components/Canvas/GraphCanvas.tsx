/**
 * Main R3F Canvas component
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { GraphScene } from './GraphScene';
import { useUIStore } from '../../stores/useUIStore';

export function GraphCanvas() {
  // Select only the mode: subscribing to the whole store re-rendered the
  // canvas on every notification and re-applied the camera's position prop.
  const is3D = useUIStore((s) => s.viewport.mode === '3d');
  // Initial placement only; CameraController frames the graph from here.
  const initialPosition = useMemo<[number, number, number]>(
    () => (is3D ? [0, 300, 500] : [0, 0, 500]),
    [is3D]
  );

  return (
    <div style={{ width: '100%', height: '100vh', background: '#f5f5f5' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
      >
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={initialPosition}
          fov={50}
          near={1}
          far={200000}
        />

        {/* Controls */}
        {/* makeDefault exposes the controls to CameraController via useThree */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={50000}
          enableRotate={is3D}
          enablePan
          mouseButtons={{
            LEFT: 2,    // Pan
            MIDDLE: 1,  // Zoom
            RIGHT: 0    // Rotate (only in 3D)
          }}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Grid helper (optional) */}
        {is3D && (
          <Grid
            args={[1000, 1000]}
            cellColor="#cccccc"
            sectionColor="#aaaaaa"
            fadeDistance={800}
            fadeStrength={1}
          />
        )}

        {/* Graph scene */}
        <GraphScene />
      </Canvas>
    </div>
  );
}
