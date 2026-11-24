# WebVOWL Modern - Test Suite Documentation

## Overview

The Vitest suite for the modern explorer in `modern/`: unit tests for the stores,
the owl2vowl normaliser and the camera and label helpers, and integration tests
that run the real layout engine with nothing mocked.

**Test framework**: Vitest 4.0.8 (`vitest run`)
**Environment**: jsdom, except `tests/integration/engine.real.test.ts`, which
opts into `// @vitest-environment node`
**Coverage tool**: `@vitest/coverage-v8`

Layout runs on `@dreamlab-ai/vowl-wasm` 0.4.0 (`NggExplorer`) through
`@dreamlab-ai/ontomark-graph` 0.4.0's driver and adapter,
`createLayout(vowlEngine(mod))`. Both are pinned in `package.json` and
`package-lock.json`. No WASM mock is used: the tests either use a recording
`NggExplorer` double or load the real `.wasm`.

---

## Test structure

```
modern/tests/
├── setup.ts                       # Global setup: cleanup and browser shims (DOM tests only)
├── unit/
│   ├── useGraphStore.test.ts      # Graph store (33 tests)
│   ├── useUIStore.test.ts         # UI store, including camera requests (26)
│   ├── useLabelStore.test.ts      # Hidden-label store (2)
│   ├── useWasmSimulation.test.ts  # Layout hook on the real driver, double module (16)
│   ├── owl2vowl.test.ts           # owl2vowl / WebVOWL JSON normaliser (19)
│   ├── cameraFit.test.ts          # Graph bounds, camera fit, zoom, insets (14)
│   ├── labelCandidates.test.ts    # Label candidates and hidden sets (4)
│   ├── labelDeclutter.test.ts     # Label boxes and declutter pass (9)
│   ├── nodeGeometry.test.ts       # Node radius, label kind, framing points (3)
│   └── TopMenuBar.test.tsx        # View buttons queue camera requests (2)
└── integration/
    ├── engine.real.test.ts        # Real vowl-wasm engine, no mocks (44 run, 2 skipped)
    └── wasm-integration.test.ts   # Store-level ontology load, stats, filters, export (11)
```

Last full run: 12 files, 183 passed, 2 skipped (185).

---

## Unit tests

### Stores

- **`useGraphStore`** (`src/stores/useGraphStore.ts`): initial state, node and
  edge operations, selection and hover, filters (node type, degree, edge type,
  combined), ontology loading, statistics and clear.
- **`useUIStore`** (`src/stores/useUIStore.ts`): initial state, view mode,
  viewport, camera requests (the queue `CameraController` carries out), settings,
  loading state, notifications, sidebar and menu state. Each test resets the
  whole store, not only the settings.
- **`useLabelStore`** (`src/stores/useLabelStore.ts`): nothing is hidden before
  the first declutter pass, and unchanged content keeps the same set objects so
  readers do not re-render.

### `useWasmSimulation`

**File**: `tests/unit/useWasmSimulation.test.ts`

The hook drives `@dreamlab-ai/ontomark-graph`'s real layout driver and
vowl-wasm adapter (`createLayout(vowlEngine(mod))`). Only the WASM module is a
double: an `NggExplorer` that records what it is given. Slices run on a manual
scheduler passed through the hook's options.

Coverage:
- layout settings sent before the first graph;
- store order mapped to layout indices (`toLayoutGraph`, `src/lib/layoutGraph.ts`),
  every edge a spring, one store update per snapshot;
- one cold load per file (also when a file reuses the previous ids or is
  reopened), clear and settle;
- live settings changes (changed keys only) and reset;
- visible errors: load, tick, ignored settings, WASM initialisation;
- cleanup on unmount (the explorer is freed once).

### Normaliser and layout input

- **`owl2vowl`** (`src/lib/owl2vowl.ts`): one decision per edge case, covering
  base and attribute record merging, labels, datatype and literal ranges,
  properties without domain or range, domain and range arrays, relation kinds,
  what is dropped (and that it is logged), and document shape.
- **`layoutGraph.ts`** (`toLayoutGraph`) has no file of its own. It maps the
  normalised ontology to the driver's input (nodes in store order, every edge
  as `source -> target`), and is checked through the hook tests above and the
  real-engine "maps the store graph onto layout indices" case.

### Camera and labels

- **`cameraFit`** (`src/lib/cameraFit.ts`): `graphBounds`, `fitCamera`,
  `zoomedDistance`, `visibleInsets`, and fitting with insets.
- **`TopMenuBar`**: zoom in and out queue opposite camera zoom steps; fit frames
  the graph, and reset also restores the view angle.
- **`nodeGeometry`** (`src/lib/nodeGeometry.ts`): radius from instance count and
  scale, class versus minor label kind, and framing of the disc and its wrapped
  label.
- **`labelCandidates`** (`src/lib/labelCandidates.ts`): node labels below the
  disc and edge labels at the midpoint, filtered elements skipped, selected and
  hovered elements pinned, round trip into hidden sets.
- **`labelDeclutter`** (`src/lib/labelDeclutter.ts`): `pixelsPerUnit`,
  `estimateLabelBox`, `declutterLabels` and `sameIdSet`.

---

## Integration tests

### Real engine

**File**: `tests/integration/engine.real.test.ts`

Loads the pinned `@dreamlab-ai/vowl-wasm` from its own `.wasm` bytes
(`initSync`) and lays out through the same `createLayout(vowlEngine(mod))` path
the hook takes. Nothing is mocked, so a mapping the driver rejects fails here as
a layout error.

- The engine is vowl-wasm 0.4.0 and takes every layout setting the app sends;
  the app defaults are `RECOMMENDED_LAYOUT_PARAMS` on the engine defaults, with
  collision radius 23.
- All nine legacy ontologies in `legacy/src/app/data`: hand-derived node and
  edge counts with nothing dropped, no bare numeric labels, store-to-layout
  index mapping, and one load that settles bounded and finite with every pair
  at least two collision radii apart. The settle case is skipped for
  `new_ontology.json` and `template.json`, which normalise to no nodes; these
  are the two skipped tests.
- The three drop-zone samples in `public/ontologies` (`foaf`, `minimal`,
  `sioc`) load once and settle.
- Control: a 12-node chain settles within the bound, spread, with no
  coincident nodes.
- Position updates do not reset the graph: `graphVersion` changes only on load
  and clear, and a whole frame of positions is one store update.

### Store integration

**File**: `tests/integration/wasm-integration.test.ts`

Despite its name, this file does not load WASM. It exercises `useGraphStore`
end to end: simple, complex and datatype-property ontologies, statistics,
filters, export, and two timing checks (a 100-class, 200-property load under
1000 ms; ten filter passes under 500 ms).

---

## Running tests

```bash
cd modern
npm ci                 # the real-engine test reads node_modules/@dreamlab-ai/vowl-wasm
npm test               # vitest run
npm run test:watch     # vitest (watch mode)
npm run test:ui
npm run test:coverage
```

There is no Rust crate in this repository any more. The layout engine is the
published `@dreamlab-ai/vowl-wasm` package, tested in its own repository.

---

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `master`:

- **modern**: `npm ci`, `npm run lint`, `npm run type-check` (`tsc -b`),
  `npm test`, `npm run build` (Node 22);
- **root surface**: `node --test checks/root-surface.test.mjs`.

Coverage is not run in CI.

---

## Coverage configuration

**File**: `modern/vitest.config.ts`

Thresholds (applied by `npm run test:coverage`): lines 80%, functions 80%,
branches 75%, statements 80%. Excluded: `node_modules/`, `tests/`,
`*.config.{js,ts}`, `dist/`, `*.d.ts`, `main.tsx`.

The config also sets `NODE_ENV=test`, so React's development build (and with it
`act`) loads even in a shell that exports `NODE_ENV=production`.

---

## Test setup (`tests/setup.ts`)

- `@testing-library/react` cleanup after each test, and `@testing-library/jest-dom`.
- Browser shims, applied only where a DOM exists (not in the node-environment
  real-engine file): canvas 2D context, `ResizeObserver`,
  `IntersectionObserver` and `matchMedia`.

---

## Known limitations

- React Three Fiber components are not rendered under WebGL; the camera and
  label logic is tested through its pure helpers and stores.
- The two timing checks in `wasm-integration.test.ts` are synthetic and depend on
  the machine running them.
- `useWasmSimulation.test.ts` prints React `act(...)` warnings to stderr; they do
  not fail the run.

---

**Last updated**: 2026-11-24
