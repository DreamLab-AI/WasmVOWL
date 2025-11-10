# WebVOWL Modernization Plan: React Three Fiber + TypeScript

## Executive Summary

Transform WebVOWL from D3.js v3 + vanilla JavaScript to a modern stack:

**Target Architecture:**
- **React 18** - Modern UI framework with concurrent features
- **React Three Fiber (R3F)** - Declarative 3D/2D graphics with Three.js
- **TypeScript** - Type safety and better DX
- **Zustand** - Lightweight state management
- **Vite** - Fast build tool and dev server
- **Rust/WASM** - High-performance layout engine (already built)

**Benefits:**
- 🚀 10x faster dev server (Vite vs Grunt/Webpack 1)
- ✨ Declarative 3D rendering (R3F vs imperative D3)
- 🔒 Type safety with TypeScript
- ⚡ Hardware-accelerated rendering (WebGL)
- 🧩 Component-based architecture
- 📦 Modern dependency management
- 🎨 Better UI framework (shadcn/ui or MUI)

## Phase 1: Foundation Setup

### 1.1 Create Modern Project Structure

```
webvowl-modern/
├── src/
│   ├── app/                    # Application entry
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── components/             # React components
│   │   ├── Canvas/
│   │   │   ├── GraphCanvas.tsx       # R3F canvas wrapper
│   │   │   ├── GraphScene.tsx        # 3D scene setup
│   │   │   ├── Nodes/
│   │   │   │   ├── ClassNode.tsx     # OWL class visualization
│   │   │   │   ├── DatatypeNode.tsx  # Datatype visualization
│   │   │   │   └── SpecialNode.tsx   # Special nodes
│   │   │   ├── Edges/
│   │   │   │   ├── PropertyEdge.tsx  # Property connections
│   │   │   │   └── SubclassEdge.tsx  # Subclass relations
│   │   │   └── Effects/
│   │   │       ├── ForceSimulation.tsx
│   │   │       └── CameraControls.tsx
│   │   ├── UI/
│   │   │   ├── Sidebar/
│   │   │   │   ├── NodeDetails.tsx
│   │   │   │   └── FilterPanel.tsx
│   │   │   ├── Menu/
│   │   │   │   ├── OntologyMenu.tsx
│   │   │   │   ├── ExportMenu.tsx
│   │   │   │   └── SettingsMenu.tsx
│   │   │   └── Controls/
│   │   │       ├── ZoomControls.tsx
│   │   │       └── NavigationControls.tsx
│   │   └── Loaders/
│   │       ├── FileDropZone.tsx
│   │       └── LoadingProgress.tsx
│   ├── stores/                 # Zustand state management
│   │   ├── useGraphStore.ts
│   │   ├── useUIStore.ts
│   │   └── useSimulationStore.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── useWasmSimulation.ts
│   │   ├── useOntologyLoader.ts
│   │   └── useGraphInteraction.ts
│   ├── lib/                    # Core logic
│   │   ├── wasm/
│   │   │   ├── WasmAdapter.ts        # WASM integration
│   │   │   └── types.ts
│   │   ├── ontology/
│   │   │   ├── parser.ts
│   │   │   └── validator.ts
│   │   └── graph/
│   │       ├── filters.ts
│   │       └── transformers.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── graph.ts
│   │   ├── ontology.ts
│   │   └── ui.ts
│   └── utils/
│       ├── colors.ts
│       └── math.ts
├── public/
│   ├── ontologies/            # Sample ontologies
│   └── assets/
├── rust-wasm/                 # Existing WASM module
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 1.2 Initial Dependencies

```json
{
  "name": "webvowl-modern",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.100.0",
    "three": "^0.160.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "immer": "^10.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.160.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-wasm": "^3.3.0",
    "vitest": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

## Phase 2: Core Graph Rendering

### 2.1 State Management (Zustand)

```typescript
// src/stores/useGraphStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Node {
  id: string;
  type: 'class' | 'datatype' | 'literal';
  label: string;
  position: [number, number, number];
  velocity: [number, number, number];
  properties: Record<string, any>;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: 'objectProperty' | 'datatypeProperty' | 'subclass';
  label: string;
}

interface GraphState {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  selectedNode: string | null;
  hoveredNode: string | null;

  // Actions
  loadOntology: (data: OntologyData) => void;
  updateNodePosition: (id: string, position: [number, number, number]) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  applyFilter: (filter: GraphFilter) => void;
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    nodes: new Map(),
    edges: new Map(),
    selectedNode: null,
    hoveredNode: null,

    loadOntology: (data) => set((state) => {
      // Parse and populate nodes/edges
    }),

    updateNodePosition: (id, position) => set((state) => {
      const node = state.nodes.get(id);
      if (node) {
        node.position = position;
      }
    }),

    selectNode: (id) => set({ selectedNode: id }),
    hoverNode: (id) => set({ hoveredNode: id }),

    applyFilter: (filter) => set((state) => {
      // Filter logic
    })
  }))
);
```

### 2.2 WASM Integration Hook

```typescript
// src/hooks/useWasmSimulation.ts
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import init, { WebVowl } from '../../rust-wasm/pkg/webvowl_wasm';
import { useGraphStore } from '../stores/useGraphStore';

export function useWasmSimulation() {
  const wasmRef = useRef<WebVowl | null>(null);
  const { nodes, edges, updateNodePosition } = useGraphStore();

  // Initialize WASM
  useEffect(() => {
    let mounted = true;

    async function initWasm() {
      await init();
      if (mounted) {
        wasmRef.current = new WebVowl();

        // Load graph data
        const graphData = {
          nodes: Array.from(nodes.values()).map(n => ({
            id: n.id,
            type: n.type
          })),
          edges: Array.from(edges.values()).map(e => ({
            source: e.source,
            target: e.target
          }))
        };

        wasmRef.current.loadOntology(JSON.stringify(graphData));
        wasmRef.current.setCenter(0, 0);
        wasmRef.current.setLinkDistance(100);
        wasmRef.current.setChargeStrength(-300);
        wasmRef.current.initSimulation();
      }
    }

    initWasm();
    return () => { mounted = false; };
  }, [nodes, edges]);

  // Run simulation on each frame
  useFrame(() => {
    const wasm = wasmRef.current;
    if (!wasm || wasm.isFinished()) return;

    wasm.tick();

    // Update React state with new positions
    const graphData = wasm.getGraphData();
    graphData.nodes.forEach((node: any) => {
      updateNodePosition(node.id, [node.x, node.y, 0]);
    });
  });

  return {
    isRunning: wasmRef.current ? !wasmRef.current.isFinished() : false,
    alpha: wasmRef.current?.getAlpha() ?? 0
  };
}
```

### 2.3 R3F Graph Rendering

```typescript
// src/components/Canvas/GraphCanvas.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GraphScene } from './GraphScene';

export function GraphCanvas() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100vh' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 500]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={1000}
      />

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      <GraphScene />
    </Canvas>
  );
}
```

```typescript
// src/components/Canvas/GraphScene.tsx
import { useGraphStore } from '../../stores/useGraphStore';
import { useWasmSimulation } from '../../hooks/useWasmSimulation';
import { ClassNode } from './Nodes/ClassNode';
import { PropertyEdge } from './Edges/PropertyEdge';

export function GraphScene() {
  const { nodes, edges } = useGraphStore();
  const { isRunning } = useWasmSimulation();

  return (
    <group>
      {/* Render edges first (below nodes) */}
      {Array.from(edges.values()).map(edge => (
        <PropertyEdge key={edge.id} edge={edge} />
      ))}

      {/* Render nodes */}
      {Array.from(nodes.values()).map(node => (
        <ClassNode key={node.id} node={node} />
      ))}

      {/* Simulation status */}
      {isRunning && (
        <Html position={[0, 200, 0]}>
          <div style={{ color: 'white' }}>Simulation running...</div>
        </Html>
      )}
    </group>
  );
}
```

```typescript
// src/components/Canvas/Nodes/ClassNode.tsx
import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Circle } from '@react-three/drei';
import { useGraphStore } from '../../../stores/useGraphStore';
import type { Node } from '../../../types/graph';

interface ClassNodeProps {
  node: Node;
}

export function ClassNode({ node }: ClassNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectNode, hoverNode, selectedNode } = useGraphStore();
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedNode === node.id;
  const radius = node.properties.instanceCount
    ? Math.sqrt(node.properties.instanceCount) * 2 + 10
    : 20;

  const color = isSelected ? '#67bc0f' : hovered ? '#8cd0f0' : '#aaccee';

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(node.id);
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

  // Smooth animation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(
        new THREE.Vector3(...node.position),
        0.1
      );
    }
  });

  return (
    <group>
      {/* Node circle */}
      <Circle
        ref={meshRef}
        args={[radius, 32]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshBasicMaterial color={color} />
      </Circle>

      {/* Node label */}
      <Text
        position={[node.position[0], node.position[1] - radius - 10, 0]}
        fontSize={12}
        color="#333"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>

      {/* Selection ring */}
      {isSelected && (
        <Circle args={[radius + 5, 32]}>
          <meshBasicMaterial
            color="#67bc0f"
            transparent
            opacity={0.3}
          />
        </Circle>
      )}
    </group>
  );
}
```

```typescript
// src/components/Canvas/Edges/PropertyEdge.tsx
import { useMemo } from 'react';
import { useGraphStore } from '../../../stores/useGraphStore';
import { Line } from '@react-three/drei';
import type { Edge } from '../../../types/graph';

interface PropertyEdgeProps {
  edge: Edge;
}

export function PropertyEdge({ edge }: PropertyEdgeProps) {
  const { nodes } = useGraphStore();

  const points = useMemo(() => {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);

    if (!source || !target) return null;

    return [
      new THREE.Vector3(...source.position),
      new THREE.Vector3(...target.position)
    ];
  }, [nodes, edge]);

  if (!points) return null;

  const color = edge.type === 'subclass' ? '#444' : '#999';
  const lineWidth = edge.type === 'subclass' ? 3 : 2;

  return (
    <>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
      />

      {/* Edge label */}
      {edge.label && (
        <Text
          position={[
            (points[0].x + points[1].x) / 2,
            (points[0].y + points[1].y) / 2,
            1
          ]}
          fontSize={10}
          color="#666"
          anchorX="center"
          anchorY="middle"
        >
          {edge.label}
        </Text>
      )}
    </>
  );
}
```

## Phase 3: UI Components

### 3.1 Main Application

```typescript
// src/app/App.tsx
import { GraphCanvas } from '../components/Canvas/GraphCanvas';
import { Sidebar } from '../components/UI/Sidebar/Sidebar';
import { MenuBar } from '../components/UI/Menu/MenuBar';
import { FileDropZone } from '../components/Loaders/FileDropZone';
import { useUIStore } from '../stores/useUIStore';

export function App() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="app">
      <MenuBar />

      <div className="main-content">
        <GraphCanvas />
        <FileDropZone />

        {sidebarOpen && <Sidebar />}
      </div>
    </div>
  );
}
```

### 3.2 File Loading

```typescript
// src/components/Loaders/FileDropZone.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useGraphStore } from '../../stores/useGraphStore';

export function FileDropZone() {
  const { loadOntology } = useGraphStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const text = await file.text();
    const data = JSON.parse(text);

    loadOntology(data);
  }, [loadOntology]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false
  });

  if (!isDragActive) return null;

  return (
    <div
      {...getRootProps()}
      className="dropzone-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(103, 188, 15, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2>Drop ontology file here</h2>
        <p>Supported format: JSON</p>
      </div>
    </div>
  );
}
```

## Phase 4: Migration Strategy

### 4.1 Parallel Development

Keep existing app running while building new version:

```
webvowl/
├── src/              # Old D3.js app (keep running)
├── modern/           # New R3F app (in development)
├── rust-wasm/        # Shared WASM module
└── package.json      # Root config
```

Add scripts:
```json
{
  "scripts": {
    "dev:legacy": "grunt webserver",
    "dev:modern": "cd modern && npm run dev",
    "build:legacy": "grunt release",
    "build:modern": "cd modern && npm run build"
  }
}
```

### 4.2 Feature Parity Checklist

Port features incrementally:

- [ ] **Core Rendering**
  - [ ] Class nodes
  - [ ] Datatype nodes
  - [ ] Property edges
  - [ ] Subclass relations

- [ ] **Interactivity**
  - [ ] Node selection
  - [ ] Node hover
  - [ ] Drag nodes
  - [ ] Pan/zoom camera

- [ ] **File I/O**
  - [ ] Load from URL
  - [ ] Load from file
  - [ ] Drag & drop
  - [ ] Export SVG
  - [ ] Export JSON

- [ ] **Filters**
  - [ ] Degree filter
  - [ ] Datatype filter
  - [ ] Subclass filter
  - [ ] Disjoint filter

- [ ] **UI Features**
  - [ ] Sidebar details
  - [ ] Search
  - [ ] Statistics
  - [ ] Settings

### 4.3 Performance Targets

| Metric | D3.js v3 | R3F Target | Expected |
|--------|----------|------------|----------|
| Initial load | ~2s | <500ms | 4x faster |
| Frame rate (100 nodes) | 30fps | 60fps | 2x faster |
| Frame rate (1000 nodes) | 5fps | 30fps+ | 6x faster |
| Layout computation | 100ms | 25ms | 4x faster (WASM) |
| Bundle size | 800KB | 500KB | Smaller |
| Dev server start | 15s | 200ms | 75x faster |

## Phase 5: Advanced Features

### 5.1 3D Mode (Unique to R3F)

```typescript
// src/components/Canvas/GraphScene3D.tsx
export function GraphScene3D() {
  const { nodes, edges } = useGraphStore();
  const { mode } = useUIStore();

  if (mode !== '3d') return <GraphScene />; // 2D fallback

  return (
    <group>
      {Array.from(nodes.values()).map(node => (
        <Sphere
          key={node.id}
          position={node.position}
          args={[20, 32, 32]}
        >
          <meshStandardMaterial color={getNodeColor(node)} />
        </Sphere>
      ))}

      {Array.from(edges.values()).map(edge => (
        <Cylinder
          key={edge.id}
          args={[2, 2, getEdgeLength(edge), 8]}
          position={getEdgeMidpoint(edge)}
          rotation={getEdgeRotation(edge)}
        >
          <meshStandardMaterial color="#999" />
        </Cylinder>
      ))}
    </group>
  );
}
```

### 5.2 WebGL Post-Processing

```typescript
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';

export function GraphCanvas() {
  return (
    <Canvas>
      {/* ... scene ... */}

      <EffectComposer>
        <Bloom luminanceThreshold={0.9} intensity={0.5} />
        <SSAO radius={5} intensity={20} />
      </EffectComposer>
    </Canvas>
  );
}
```

### 5.3 VR/AR Support (Future)

```typescript
import { VRCanvas } from '@react-three/xr';

export function GraphCanvasVR() {
  return (
    <VRCanvas>
      <GraphScene />
    </VRCanvas>
  );
}
```

## Timeline Estimate

| Phase | Tasks | Time | Dependencies |
|-------|-------|------|--------------|
| 1. Foundation | Setup, config, boilerplate | 1 week | None |
| 2. Core Rendering | R3F scene, WASM integration | 2 weeks | Phase 1 |
| 3. UI Components | Sidebar, menus, controls | 2 weeks | Phase 2 |
| 4. Feature Parity | Filters, export, search | 3 weeks | Phase 3 |
| 5. Polish | Performance, tests, docs | 2 weeks | Phase 4 |
| **Total** | | **10 weeks** | |

## Success Criteria

✅ **Performance:** 60fps with 500+ nodes
✅ **Bundle:** <500KB gzipped
✅ **Dev Experience:** <1s HMR, full TypeScript
✅ **Features:** 100% parity with D3.js version
✅ **Tests:** >80% coverage
✅ **Accessibility:** WCAG 2.1 AA compliant

## Next Steps

1. **Initialize Vite project** in `modern/` directory
2. **Set up TypeScript** with strict mode
3. **Install R3F** and core dependencies
4. **Create basic Canvas** with test cube
5. **Integrate WASM** module with simple test
6. **Build first node** rendering component

Ready to start? Let's begin with Phase 1! 🚀
