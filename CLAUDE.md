# Development Guide - WebVOWL Modern

> Internal guide for Claude Code when working in this repository

## Project Overview

WebVOWL Modern is a high-performance ontology visualization tool built with React Three Fiber and Rust/WASM. Complete modernization from the legacy D3.js v3 implementation.

### Technology Stack

- **React 18.3** - UI framework
- **React Three Fiber 9.4** - Declarative WebGL with Three.js
- **TypeScript 5.9** - Type safety
- **Zustand 5.0** - State management
- **Vite 7.2** - Build tool
- **Rust/WASM** - High-performance layout engine

## Project Structure

```
modern/                    # Modern React application
  src/
    components/            # React components (Canvas/, UI/, Loaders/)
    stores/                # Zustand state stores
    hooks/                 # Custom React hooks
    lib/                   # Core utilities
    types/                 # TypeScript definitions (graph.ts, ontology.ts, ui.ts)
    utils/                 # Helper functions

rust-wasm/                 # Rust/WASM layout engine
  src/
    graph/                 # Graph data structures
    layout/                # Force-directed algorithm
    ontology/              # OWL parsing
    bindings/              # WASM JavaScript bindings
  pkg/                     # Built WASM package

legacy/                    # Archived D3.js implementation (DO NOT MODIFY)
```

## Build & Test Commands

### Modern Application

```bash
cd modern
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview build
npm run lint             # ESLint
npm run type-check       # TypeScript checking
```

### WASM Module

```bash
cd rust-wasm
npm run build            # Build WASM (required before running modern app)
npm run build:dev        # Build with debug symbols
npm test                 # Run tests
npm run bench            # Run benchmarks
wasm-pack build --target web   # Direct wasm-pack build
```

## Key Architectural Patterns

### State Management

- **Graph Store** (`useGraphStore.ts`): nodes, edges, filters, ontology loading, statistics (Immer)
- **UI Store** (`useUIStore.ts`): viewport state, settings, notifications, loading states

### WASM Integration

The `useWasmSimulation` hook bridges React and Rust:
1. Dynamically imports WASM module
2. Converts graph data to WASM format
3. Runs simulation on each frame via `useFrame`
4. Updates React state with new positions

### WASM API Surface

```typescript
class WebVowl {
  constructor();
  loadOntology(json: string): void;
  initSimulation(): void;
  tick(): void;
  runSimulation(iterations: number): void;
  setCenter(x: number, y: number): void;
  setLinkDistance(distance: number): void;
  setChargeStrength(strength: number): void;
  isFinished(): boolean;
  getAlpha(): number;
  getGraphData(): any;
  getStatistics(): any;
}
```

### R3F Rendering Pattern

Functional components with `useFrame` for animations, `useMemo` for expensive computations, LOD for performance.

## Code Style

- Components: PascalCase (`ClassNode.tsx`)
- Hooks: camelCase with `use` prefix (`useWasmSimulation.ts`)
- Types: camelCase (`graph.ts`)
- Utilities: camelCase (`colors.ts`)
- Use explicit types for props and state
- Functional components with props interfaces above component

## Path Aliases

- `@/*` maps to `./src/*` (tsconfig.json and vite.config.ts)

## Project Status: PRODUCTION READY

- Completion Date: November 10, 2025
- 85+ tests, 91% coverage
- 4-10x performance improvement over legacy

## Upstream References

See upstream CLAUDE.md files for swarm config, V3 CLI, agent routing, behavioural rules, security rules, concurrency patterns, and memory commands.
