# WasmVOWL

> High-performance ontology visualization with React Three Fiber and Rust/WASM
>
> DreamLab-AI's WASM-native rebuild of [VisualDataWeb/WebVOWL](https://github.com/VisualDataWeb/WebVOWL).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

## Overview

WebVOWL Modern is a complete modernization of the WebVOWL ontology visualization tool, rebuilt from the ground up with:

- **React Three Fiber** - Declarative WebGL rendering
- **Rust/WASM** - High-performance force-directed layout engine
- **TypeScript** - Full type safety
- **Vite** - Lightning-fast development experience

## Quick Start

```bash
# Clone repository
git clone https://github.com/DreamLab-AI/WasmVOWL.git
cd WasmVOWL/modern

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

## Features

### Core Capabilities

- ⚡ **High Performance** - Rust/WASM physics engine (4x faster than JavaScript)
- 🎨 **WebGL Rendering** - Hardware-accelerated 60fps+ graphics
- 📊 **Interactive Graphs** - Click, drag, zoom, and filter ontologies
- 🔍 **Real-time Search** - Find and highlight nodes instantly
- 📤 **Export** - SVG, PNG, and JSON export
- 🎯 **Type Safe** - Full TypeScript coverage

### Technical Highlights

- React 18 with concurrent features
- React Three Fiber for declarative 3D
- Zustand for lightweight state management
- Immer for immutable updates
- Vite for sub-second builds

## Architecture

### Technology Stack

```
┌─────────────────────────────────────┐
│   React 18 + TypeScript             │
│   Component-based UI                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   React Three Fiber (R3F)           │
│   Declarative WebGL rendering       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Rust/WASM Layout Engine           │
│   Force-directed graph algorithm    │
└─────────────────────────────────────┘
```

### Project Structure

```
modern/
├── src/
│   ├── components/       # React components
│   │   ├── Canvas/       # R3F rendering layer
│   │   ├── UI/           # Interface components
│   │   └── Loaders/      # Data loading
│   ├── stores/           # State management
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Core utilities
│   └── types/            # TypeScript definitions
├── public/               # Static assets
└── rust-wasm/            # WASM module
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Rust (for WASM development)

### Development Workflow

```bash
# Start dev server (with HMR)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### WASM Development

```bash
cd rust-wasm

# Build WASM module
npm run build

# Run tests
npm test

# Run benchmarks
npm run bench
```

## Usage

### Loading Ontologies

**From File:**
```typescript
import { useGraphStore } from '@/stores/useGraphStore';

const { loadOntology } = useGraphStore();

// Load JSON ontology
const response = await fetch('/ontologies/example.json');
const data = await response.json();
loadOntology(data);
```

**Drag & Drop:**
```tsx
import { FileDropZone } from '@/components/Loaders/FileDropZone';

<FileDropZone />
```

### Simulation Control

```typescript
import { useWasmSimulation } from '@/hooks/useWasmSimulation';

const { isRunning, alpha, start, stop, reset } = useWasmSimulation({
  autoStart: true
});

// Control simulation
start();  // Start physics
stop();   // Pause simulation
reset();  // Reset positions
```

### Graph Filtering

```typescript
const { addFilter, clearFilters } = useGraphStore();

// Filter by node type
addFilter({
  type: 'nodeType',
  config: { nodeType: 'class' }
});

// Filter by degree
addFilter({
  type: 'degree',
  config: { min: 2, max: 10 }
});

// Clear all filters
clearFilters();
```

## Configuration

### Graph Settings

```typescript
import { useUIStore } from '@/stores/useUIStore';

const { updateSettings } = useUIStore();

updateSettings({
  linkDistance: 150,      // Node spacing
  chargeStrength: -400,   // Repulsion force
  nodeScale: 1.2,         // Visual size multiplier
  showLabels: true,       // Display labels
  lodEnabled: true        // Level of detail optimization
});
```

### Viewport Controls

```typescript
const { setZoom, toggleViewMode } = useUIStore();

setZoom(1.5);           // Set zoom level
toggleViewMode();       // Switch 2D/3D
```

## Performance

### Benchmarks

| Operation | Time | FPS |
|-----------|------|-----|
| Parse ontology (100 classes) | ~500μs | - |
| Layout tick (100 nodes) | ~150μs | 60 |
| Render frame (100 nodes) | ~16ms | 60 |
| Full simulation (100 nodes, 50 iter) | ~8ms | - |

### Comparison with Legacy

| Metric | Legacy (D3.js) | Modern (R3F) | Improvement |
|--------|----------------|--------------|-------------|
| Dev server start | 15s | 240ms | **62x** |
| HMR update | 2-3s | <100ms | **20x** |
| Layout computation | 100ms | 25ms | **4x** |
| Bundle size | 800KB | 500KB | **37%** smaller |

## Deployment

### Production Build

```bash
npm run build
```

Output directory: `dist/`

### Docker

```dockerfile
# Build
docker build -t webvowl:modern .

# Run
docker run -p 8080:80 webvowl:modern
```

### Static Hosting

Deploy `dist/` to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static host

## Documentation

- [Development Guide](./CLAUDE.md) - Setup and architecture
- [API Reference](./docs/api/) - Type definitions and interfaces
- [Examples](./docs/examples/) - Usage examples
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## Troubleshooting

### WASM Not Loading

Ensure WASM plugin is configured in `vite.config.ts`:

```typescript
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()]
});
```

### Poor Performance

Enable optimizations:

```typescript
updateSettings({
  lodEnabled: true,
  maxFPS: 30
});
```

### Memory Issues

Reduce simulation complexity:

```typescript
updateSettings({
  linkDistance: 200,
  chargeStrength: -200
});
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see [license.txt](./license.txt)

## Credits

- **Original WebVOWL** - VisualDataWeb team
- **Rust/WASM Engine** - Modern performance layer
- **React Three Fiber** - Declarative 3D rendering

## Support

- **Issues**: [GitHub Issues](https://github.com/DreamLab-AI/WasmVOWL/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DreamLab-AI/WasmVOWL/discussions)

---

**Made with ❤️ using React Three Fiber and Rust/WASM**

## Current verification and closeout — 2026-09-04

The inspected modern manifest uses React 19.2. Local validation found 47 passing native Rust tests and 19 passing / 60 failing frontend tests, including Map initialisation failures. The React hook and Rust parser also disagree on the input schema. Earlier performance and completion claims are not re-certified by these checks. See the [proposed consumer-contract ADR](docs/adr/ADR-001-explorer-consumer-contract-closeout.md) for evidence, publisher-lineage limits and release acceptance conditions.
