# Architecture Diagrams - WebVOWL Rust/WASM

**Author**: System Architect Agent
**Date**: 2025-11-10
**Swarm Session**: swarm-1762805104330-fury1qic2

## C4 Model Architecture Diagrams

### Level 1: System Context Diagram

```
                           ┌─────────────────────────┐
                           │                         │
                           │   Ontology Researchers  │
                           │   Semantic Web Devs     │
                           │                         │
                           └────────────┬────────────┘
                                        │
                                        │ Views ontologies
                                        │ Interacts with graph
                                        │
                           ┌────────────▼────────────┐
                           │                         │
                           │   WebVOWL System        │
                           │   (Browser Application) │
                           │                         │
                           │  Visualizes OWL         │
                           │  ontologies as          │
                           │  interactive graphs     │
                           │                         │
                           └───┬─────────────────┬───┘
                               │                 │
                  Loads        │                 │ Converts
                  ontologies   │                 │ ontologies
                               │                 │
            ┌──────────────────▼──┐         ┌────▼─────────────────┐
            │                     │         │                      │
            │  Ontology Files     │         │  OWL2VOWL Service    │
            │  (JSON/RDF)         │         │  (External Converter)│
            │                     │         │                      │
            └─────────────────────┘         └──────────────────────┘
```

---

### Level 2: Container Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Browser                                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                       Web Application                            │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  User Interface Layer (HTML/CSS/JavaScript)              │  │ │
│  │  │  - Menus, sidebars, controls                             │  │ │
│  │  │  - File upload/URL loading                               │  │ │
│  │  │  - Export functionality                                  │  │ │
│  │  └─────────────────────┬────────────────────────────────────┘  │ │
│  │                        │ Commands                               │ │
│  │                        │ Events                                 │ │
│  │  ┌─────────────────────▼────────────────────────────────────┐  │ │
│  │  │  D3.js Rendering Layer (JavaScript)                      │  │ │
│  │  │  - SVG rendering                                         │  │ │
│  │  │  - Zoom/pan interactions                                 │  │ │
│  │  │  - Drag-and-drop                                         │  │ │
│  │  └──────────────┬──────────────────────────┬────────────────┘  │ │
│  │                 │ Get positions            │ Send interactions  │ │
│  │                 │ Get visible nodes        │                    │ │
│  │  ┌──────────────▼──────────────────────────▼────────────────┐  │ │
│  │  │  WASM Interface Layer (JavaScript)                       │  │ │
│  │  │  - Load WASM module                                      │  │ │
│  │  │  - Type conversions (JS ↔ Rust)                          │  │ │
│  │  │  - Memory management                                     │  │ │
│  │  └─────────────────────┬────────────────────────────────────┘  │ │
│  │                        │ WASM calls                             │ │
│  │                        │ TypedArrays                            │ │
│  └────────────────────────┼────────────────────────────────────────┘ │
│                           │                                          │
│  ┌────────────────────────▼────────────────────────────────────────┐ │
│  │               WebAssembly Module (Rust)                         │ │
│  │                                                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │ │
│  │  │  Parser      │  │  Layout      │  │  Filters     │         │ │
│  │  │  (vowl-      │  │  Engine      │  │  (vowl-      │         │ │
│  │  │   parser)    │  │  (vowl-      │  │   filters)   │         │ │
│  │  │              │  │   layout)    │  │              │         │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │ │
│  │         │                 │                 │                  │ │
│  │         └─────────────────┼─────────────────┘                  │ │
│  │                           │                                    │ │
│  │  ┌────────────────────────▼────────────────────────────────┐  │ │
│  │  │  Core Graph Data Structures (vowl-graph)               │  │ │
│  │  │  - Nodes, Properties, Graph                            │  │ │
│  │  │  - Memory-efficient storage                            │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Level 3: Component Diagram (WASM Module)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       vowl-core Crate                                │
│                    (Public WASM API)                                 │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  #[wasm_bindgen] Exports                                      │  │
│  │  - init()                                                     │  │
│  │  - parse_ontology(json: String) -> GraphHandle               │  │
│  │  - compute_layout(handle, iterations)                        │  │
│  │  - apply_filter(handle, filter_type, params)                 │  │
│  │  - get_node_positions(handle) -> Float64Array                │  │
│  │  - search_nodes(handle, query) -> Vec<usize>                 │  │
│  │  - export_svg(handle) -> String                              │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                         │
│                            │ Coordinates                             │
│                            │                                         │
│         ┌──────────────────┼──────────────────┬──────────────────┐  │
│         │                  │                  │                  │  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──┘
          │                  │                  │                  │
┌─────────▼─────────┐ ┌──────▼─────────┐ ┌─────▼──────────┐ ┌─────▼────────┐
│  vowl-parser      │ │  vowl-layout   │ │  vowl-filters  │ │vowl-algorithms│
│                   │ │                │ │                │ │              │
│ ┌───────────────┐ │ │ ┌────────────┐ │ │ ┌────────────┐ │ │┌────────────┐│
│ │JSON Parsing   │ │ │ │Force       │ │ │ │Degree      │ │ ││Search      ││
│ │(Serde)        │ │ │ │Computation │ │ │ │Filter      │ │ ││(Fuzzy)     ││
│ └───────────────┘ │ │ └────────────┘ │ │ └────────────┘ │ │└────────────┘│
│ ┌───────────────┐ │ │ ┌────────────┐ │ │ ┌────────────┐ │ │┌────────────┐│
│ │Validation     │ │ │ │Barnes-Hut  │ │ │ │Subclass    │ │ ││Export      ││
│ │               │ │ │ │Quadtree    │ │ │ │Filter      │ │ ││(SVG/JSON)  ││
│ └───────────────┘ │ │ └────────────┘ │ │ └────────────┘ │ │└────────────┘│
│ ┌───────────────┐ │ │ ┌────────────┐ │ │ ┌────────────┐ │ │┌────────────┐│
│ │Namespace      │ │ │ │Position    │ │ │ │Set Operator│ │ ││Statistics  ││
│ │Resolution     │ │ │ │Integration │ │ │ │Filter      │ │ ││Calculation ││
│ └───────────────┘ │ │ └────────────┘ │ │ └────────────┘ │ │└────────────┘│
│ ┌───────────────┐ │ │ ┌────────────┐ │ │ ┌────────────┐ │ │              │
│ │Equivalent     │ │ │ │Collision   │ │ │ │... (17     │ │ │              │
│ │Merging        │ │ │ │Detection   │ │ │ │total)      │ │ │              │
│ └───────────────┘ │ │ └────────────┘ │ │ └────────────┘ │ │              │
└─────────┬─────────┘ └────────┬───────┘ └────────┬───────┘ └──────┬───────┘
          │                    │                  │                │
          │                    │                  │                │
          │         All depend on vowl-graph     │                │
          └────────────────────┼──────────────────┴────────────────┘
                               │
                   ┌───────────▼────────────┐
                   │   vowl-graph Crate     │
                   │                        │
                   │ ┌────────────────────┐ │
                   │ │  Graph             │ │
                   │ │  - nodes: Vec      │ │
                   │ │  - properties: Vec │ │
                   │ │  - maps: HashMap   │ │
                   │ └────────────────────┘ │
                   │ ┌────────────────────┐ │
                   │ │  Node              │ │
                   │ │  - id, type        │ │
                   │ │  - position        │ │
                   │ │  - visible         │ │
                   │ └────────────────────┘ │
                   │ ┌────────────────────┐ │
                   │ │  Property          │ │
                   │ │  - domain, range   │ │
                   │ │  - type            │ │
                   │ └────────────────────┘ │
                   │ ┌────────────────────┐ │
                   │ │  Types & Enums     │ │
                   │ │  - NodeType        │ │
                   │ │  - PropertyType    │ │
                   │ └────────────────────┘ │
                   └────────────────────────┘
```

---

## Sequence Diagrams

### 1. Ontology Loading Sequence

```
User    UI       WASM       Parser    Graph      D3
 │       │         │          │         │         │
 │──Upload──────►  │          │         │         │
 │       │         │          │         │         │
 │       │──parse()──────►    │         │         │
 │       │         │          │         │         │
 │       │         │──────►parse_json() │         │
 │       │         │          │         │         │
 │       │         │          │──build()────►     │
 │       │         │          │         │         │
 │       │         │          │◄────graph─────    │
 │       │         │          │         │         │
 │       │         │◄─────GraphHandle────────     │
 │       │         │          │         │         │
 │       │◄─success──────────────────────────     │
 │       │         │          │         │         │
 │       │──get_nodes()───►   │         │         │
 │       │◄─────data──────    │         │         │
 │       │         │          │         │         │
 │       │─────────────────────────────────render()►
 │       │         │          │         │         │
 │◄─Visualization──────────────────────────────────
```

### 2. Layout Computation Loop

```
requestAnimationFrame    WASM         Layout      Quadtree    Graph
         │                │             │            │          │
         │──tick()───────►│             │            │          │
         │                │             │            │          │
         │                │──compute()─►│            │          │
         │                │             │            │          │
         │                │             │──build()──►│          │
         │                │             │            │          │
         │                │             │◄─tree──────┤          │
         │                │             │            │          │
         │                │             │──get_nodes()────────►│
         │                │             │◄───nodes─────────────│
         │                │             │            │          │
         │                │             │──calculate_forces()   │
         │                │             │            │          │
         │                │             │──integrate_positions()│
         │                │             │            │          │
         │                │◄─positions──│            │          │
         │                │             │            │          │
         │◄─Float64Array──│             │            │          │
         │                │             │            │          │
         │──render────────────────────────────────────────────►│
         │                │             │            │          │
         │──(loop)────────────────────────────────────────────►│
```

### 3. Filter Application

```
User   FilterUI   WASM     Filter      Graph
 │       │         │         │           │
 │─Select─────►    │         │           │
 │       │         │         │           │
 │       │──apply()────►     │           │
 │       │         │         │           │
 │       │         │───execute()───►     │
 │       │         │         │           │
 │       │         │         │──degrees()────►
 │       │         │         │           │
 │       │         │         │◄─data─────
 │       │         │         │           │
 │       │         │         │──set_visible()►
 │       │         │         │           │
 │       │         │◄─filtered───────────
 │       │         │         │           │
 │       │◄─success──────────│           │
 │       │         │         │           │
 │◄─Re-render──────────────────────────────
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Data Flow                              │
│                                                                 │
│  [User]                                                         │
│    │                                                            │
│    │ 1. Upload JSON/URL                                        │
│    ▼                                                            │
│  ┌──────────────┐                                              │
│  │  UI Layer    │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         │ 2. JSON String                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │  WASM: Parser                            │                  │
│  │  - Deserialize JSON (Serde)             │                  │
│  │  - Validate structure                    │                  │
│  │  - Resolve namespaces                    │                  │
│  └──────┬───────────────────────────────────┘                  │
│         │                                                       │
│         │ 3. Parsed structures                                 │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │  WASM: Graph Builder                     │                  │
│  │  - Create nodes from classes             │                  │
│  │  - Create properties from relations      │                  │
│  │  - Connect domain/range                  │                  │
│  │  - Merge equivalents                     │                  │
│  └──────┬───────────────────────────────────┘                  │
│         │                                                       │
│         │ 4. Graph (Vec<Node>, Vec<Property>)                  │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │  WASM: Layout Engine                     │                  │
│  │  - Build quadtree                        │                  │
│  │  - Calculate forces                      │                  │
│  │  - Integrate positions                   │                  │
│  │  - Repeat until convergence              │                  │
│  └──────┬───────────────────────────────────┘                  │
│         │                                                       │
│         │ 5. Positions (Float64Array)                          │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │  JS: D3 Renderer                         │                  │
│  │  - Map positions to SVG                  │                  │
│  │  - Render nodes (circles/rects)          │                  │
│  │  - Render edges (paths)                  │                  │
│  │  - Apply styles                          │                  │
│  └──────┬───────────────────────────────────┘                  │
│         │                                                       │
│         │ 6. SVG DOM                                           │
│         ▼                                                       │
│  [Visualization]                                               │
│         │                                                       │
│         │ 7. User interaction (drag/filter)                   │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │  WASM: Filters/Search                    │                  │
│  │  - Apply filter logic                    │                  │
│  │  - Update visibility flags               │                  │
│  └──────┬───────────────────────────────────┘                  │
│         │                                                       │
│         │ 8. Updated graph state                              │
│         │                                                       │
│         └──────► Back to step 5 (re-render)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Memory Model

```
┌─────────────────────────────────────────────────────────────────┐
│                       JavaScript Heap                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  D3.js Objects                                             │ │
│  │  - SVG elements (DOM nodes)                                │ │
│  │  - D3 selections                                           │ │
│  │  - Event handlers                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WASM Interface Layer                                      │ │
│  │  - Opaque handles (usize)                                  │ │
│  │  - TypedArrays (zero-copy views)                           │ │
│  │  - JS wrapper functions                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Shared memory views
                         │ (no copies)
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                       WASM Linear Memory                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Graph Data (Rust ownership)                                │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  Vec<Node>                                            │  │ │
│  │  │  - id, type, label, iri                              │  │ │
│  │  │  - position: { x: f64, y: f64 }                      │  │ │
│  │  │  - visible: bool                                     │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  Vec<Property>                                        │  │ │
│  │  │  - id, type, label                                   │  │ │
│  │  │  - domain: NodeId, range: NodeId                     │  │ │
│  │  │  - visible: bool                                     │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  HashMap<NodeId, usize>   (for fast lookup)          │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Shared Position Buffer (zero-copy)                         │ │
│  │  [x0, y0, x1, y1, x2, y2, ...]   (Float64Array)            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Temporary Computation Buffers                              │ │
│  │  - Quadtree structure                                       │ │
│  │  - Force accumulation arrays                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Build Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      Build Pipeline                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Rust Source Code                                          │ │
│  │  crates/vowl-{core,graph,parser,layout,filters}           │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
│                 │                                                │
│                 │ cargo build                                    │
│                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Rust Compilation                                          │ │
│  │  - Type checking                                           │ │
│  │  - Borrow checking                                         │ │
│  │  - Optimization (release mode)                             │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
│                 │                                                │
│                 │ wasm-pack build                                │
│                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WASM Binary Generation                                    │ │
│  │  - wasm32-unknown-unknown target                           │ │
│  │  - wasm-bindgen integration                                │ │
│  │  - Generate JS glue code                                   │ │
│  │  - Generate TypeScript definitions                         │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
│                 │                                                │
│                 │ wasm-opt (optional)                            │
│                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WASM Optimization                                         │ │
│  │  - -Oz (optimize for size)                                 │ │
│  │  - Dead code elimination                                   │ │
│  │  - Compression                                             │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
│                 │                                                │
│                 │ pkg/                                           │
│                 │ - vowl_core.js                                 │
│                 │ - vowl_core_bg.wasm                            │
│                 │ - vowl_core.d.ts                               │
│                 │                                                │
│  ┌──────────────▼─────────────────────────────────────────────┐ │
│  │  Webpack Bundling                                          │ │
│  │  - Combine WASM + existing JS                              │ │
│  │  - Bundle D3.js and other dependencies                     │ │
│  │  - Minification                                            │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
│                 │                                                │
│                 │ deploy/                                        │
│                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Production Bundle                                         │ │
│  │  - index.html                                              │ │
│  │  - app.bundle.js                                           │ │
│  │  - vowl_core_bg.wasm                                       │ │
│  │  - styles.css                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                  Performance Optimization                        │
│                                                                  │
│  Phase 1: Baseline                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Pure Rust implementation                                │ │
│  │  - Standard algorithms                                     │ │
│  │  - No unsafe code                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ Profile with criterion            │
│                              ▼                                   │
│  Phase 2: Algorithmic Optimization                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Barnes-Hut quadtree (O(n log n) instead of O(n²))      │ │
│  │  - Spatial hashing for collision                           │ │
│  │  - Lazy evaluation where possible                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ Profile again                     │
│                              ▼                                   │
│  Phase 3: Memory Optimization                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Use wee_alloc (smaller allocator)                       │ │
│  │  - Arena allocation for temporary data                     │ │
│  │  - Reuse buffers instead of allocating                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ Profile hotspots                  │
│                              ▼                                   │
│  Phase 4: SIMD Optimization (if available)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Detect WASM SIMD support                                │ │
│  │  - Vectorize force calculations                            │ │
│  │  - Process 4 nodes at once                                 │ │
│  │  - Fallback to scalar if unsupported                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ Optional future work              │
│                              ▼                                   │
│  Phase 5: Threading (Future)                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Web Workers for parallel layout                         │ │
│  │  - SharedArrayBuffer if available                          │ │
│  │  - Divide graph into chunks                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

**Document Control:**
- Version: 1.0.0
- Last Updated: 2025-11-10
- Tools: ASCII diagrams (universally renderable)
- Next: UML diagrams with PlantUML (optional enhancement)
