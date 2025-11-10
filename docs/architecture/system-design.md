# SPARC Phase 3: System Architecture - Rust/WASM WebVOWL

**Author**: System Architect Agent
**Date**: 2025-11-10
**Status**: Draft
**Swarm Session**: swarm-1762805104330-fury1qic2

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Component Design](#3-component-design)
4. [Data Flow](#4-data-flow)
5. [Module Structure](#5-module-structure)
6. [Technology Stack](#6-technology-stack)
7. [Build & Deployment](#7-build--deployment)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. System Overview

### 1.1 High-Level Architecture (C4 Level 1 - System Context)

```
┌─────────────────────────────────────────────────────────────┐
│                        WebVOWL System                        │
│                                                              │
│  ┌────────────┐        ┌──────────────┐      ┌───────────┐ │
│  │   Web UI   │───────▶│  Rust/WASM   │◀─────│    D3.js  │ │
│  │ (HTML/CSS) │        │   Engine     │      │  Renderer │ │
│  └────────────┘        └──────────────┘      └───────────┘ │
│        │                      │                      │      │
│        └──────────────────────┴──────────────────────┘      │
│                               │                             │
└───────────────────────────────┼─────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼──────┐       ┌───────▼──────┐
            │   Ontology   │       │   External   │
            │   Files      │       │   Services   │
            │   (JSON)     │       │   (OWL2VOWL) │
            └──────────────┘       └──────────────┘
```

**External Entities:**
- **Users**: Ontology researchers, semantic web developers
- **Ontology Sources**: Local files, URLs, OWL2VOWL converter service
- **Browsers**: Chrome, Firefox, Safari (with WASM support)

### 1.2 System Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Rust/WASM Engine** | Graph processing, layout, filtering | Rust → WASM |
| **D3.js Renderer** | SVG rendering, zoom/pan, interactions | JavaScript (D3.js) |
| **Web UI** | User controls, menus, sidebars | HTML/CSS/JS |
| **Parser Module** | OWL JSON parsing, validation | Rust |
| **Layout Module** | Force-directed graph layout | Rust |
| **Filter Module** | Graph filtering operations | Rust |

---

## 2. Architecture Principles

### 2.1 Design Principles

1. **Performance First**: Computational hotspots in Rust, rendering in JS
2. **Incremental Migration**: Phase-by-phase replacement of JS modules
3. **Zero-Copy Where Possible**: Use TypedArrays for data transfer
4. **Backward Compatible**: Maintain existing API and behavior
5. **Fail-Safe**: Graceful degradation if WASM not supported

### 2.2 Architecture Decision Records (ADRs)

#### ADR-001: Use wasm-bindgen for WASM Bindings

**Status**: Proposed
**Context**: Need clean Rust↔JS interop
**Decision**: Use wasm-bindgen for bindings
**Rationale**:
- Industry standard in Rust/WASM ecosystem
- Excellent TypeScript definitions
- Strong community support
- Good bundle size with `wasm-opt`

**Consequences**:
- ✅ Better DX with automatic bindings
- ✅ Type safety between Rust and JS
- ⚠️ Slightly larger bundle (~50KB overhead)
- ❌ Less control over low-level details

**Alternatives Considered**:
- Raw `wasm32-unknown-unknown` target: Too low-level
- `wasm-pack`: Wrapper around wasm-bindgen, adds little value

#### ADR-002: Keep D3.js for Rendering

**Status**: Accepted
**Context**: Need to render SVG visualization
**Decision**: Keep D3.js v3 for rendering pipeline
**Rationale**:
- Proven, stable rendering engine
- Large existing codebase depends on it
- Focus Rust effort on computation, not rendering
- Migration cost too high for limited benefit

**Consequences**:
- ✅ Faster migration timeline
- ✅ Lower risk of visual regressions
- ⚠️ Continue depending on D3.js v3
- ❌ Can't optimize rendering with WASM

**Future Consideration**: Explore WebGL rendering in v2.0

#### ADR-003: Monorepo with Multiple Crates

**Status**: Proposed
**Context**: Need modular Rust architecture
**Decision**: Use Cargo workspace with multiple crates
**Rationale**:
- Better separation of concerns
- Easier testing and benchmarking
- Allows incremental compilation
- Standard Rust practice

**Consequences**:
- ✅ Cleaner module boundaries
- ✅ Faster iteration during development
- ⚠️ Need to manage inter-crate dependencies
- ✅ Can publish crates independently later

#### ADR-004: Use Serde for JSON Parsing

**Status**: Accepted
**Context**: Need to parse OWL JSON format
**Decision**: Use `serde_json` for deserialization
**Rationale**:
- Industry standard for Rust serialization
- Excellent performance (zero-copy where possible)
- Strong typing with derive macros
- Great error messages

**Consequences**:
- ✅ Type-safe parsing
- ✅ Excellent performance
- ✅ Easy to maintain
- ⚠️ Increases WASM bundle by ~30KB

---

## 3. Component Design

### 3.1 Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser Environment                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    JavaScript Layer                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ UI Controller│  │  D3 Renderer │  │  WASM Loader │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  │         │                 │                 │            │  │
│  └─────────┼─────────────────┼─────────────────┼────────────┘  │
│            │                 │                 │               │
│            └─────────────────┼─────────────────┘               │
│                              │                                 │
│  ┌───────────────────────────┼─────────────────────────────┐  │
│  │                WASM Module (Rust)                        │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │              vowl-core                          │    │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │    │  │
│  │  │  │   Parser   │  │   Layout   │  │  Filter  │ │    │  │
│  │  │  └────────────┘  └────────────┘  └──────────┘ │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │              vowl-graph                         │    │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │    │  │
│  │  │  │   Nodes    │  │ Properties │  │  Graph   │ │    │  │
│  │  │  └────────────┘  └────────────┘  └──────────┘ │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │            vowl-algorithms                      │    │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │    │  │
│  │  │  │  Quadtree  │  │  Search    │  │  Export  │ │    │  │
│  │  │  └────────────┘  └────────────┘  └──────────┘ │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

#### 3.2.1 vowl-core Crate

**Purpose**: Public API and orchestration layer

**Responsibilities**:
- WASM initialization and exports
- Graph lifecycle management
- Coordinate parser, layout, and filters
- Memory management between Rust and JS

**Key APIs**:
```rust
// Initialization
pub fn init() -> Result<(), JsValue>

// Graph operations
pub fn parse_ontology(json: &str) -> Result<Graph, JsValue>
pub fn compute_layout(graph: &mut Graph, iterations: usize)
pub fn apply_filter(graph: &mut Graph, filter: Filter)

// Data access
pub fn get_node_positions(graph: &Graph) -> Float64Array
pub fn search_nodes(graph: &Graph, query: &str) -> Vec<usize>
```

#### 3.2.2 vowl-graph Crate

**Purpose**: Core data structures

**Responsibilities**:
- Define Node, Property, Graph structs
- Implement graph traversal
- Manage node/property visibility
- Handle equivalents and merging

**Key Structures**:
```rust
pub struct Graph {
    nodes: Vec<Node>,
    properties: Vec<Property>,
    node_map: HashMap<NodeId, usize>,
    property_map: HashMap<PropertyId, usize>,
    options: GraphOptions,
}

pub struct Node {
    id: NodeId,
    node_type: NodeType,
    label: String,
    position: Vec2,
    velocity: Vec2,
    visible: bool,
    // ... other fields
}

pub struct Property {
    id: PropertyId,
    property_type: PropertyType,
    domain: NodeId,
    range: NodeId,
    visible: bool,
    // ... other fields
}
```

#### 3.2.3 vowl-algorithms Crate

**Purpose**: Performance-critical algorithms

**Responsibilities**:
- Force-directed layout (Barnes-Hut)
- Quadtree spatial indexing
- Search (fuzzy matching)
- Statistics calculation
- Export (SVG, JSON, TTL)

**Key Functions**:
```rust
pub mod layout {
    pub fn compute_forces(graph: &mut Graph, alpha: f64);
    pub fn integrate_positions(graph: &mut Graph, alpha: f64);
}

pub mod quadtree {
    pub fn build(nodes: &[Node]) -> Quadtree;
    pub fn query_force(tree: &Quadtree, node: &Node) -> Vec2;
}

pub mod search {
    pub fn fuzzy_search(nodes: &[Node], query: &str) -> Vec<SearchResult>;
    pub fn levenshtein_distance(a: &str, b: &str) -> usize;
}
```

#### 3.2.4 JavaScript Layer

**Purpose**: UI and rendering orchestration

**Components**:
- **WASM Loader**: Initialize and load WASM module
- **Graph Controller**: Manage graph lifecycle
- **D3 Renderer**: Render SVG from WASM data
- **UI Controller**: Handle menus, sidebars, interactions

**Example Integration**:
```javascript
class WebVOWL {
    constructor() {
        this.wasmModule = null;
        this.graph = null;
    }

    async init() {
        this.wasmModule = await import('./vowl_core.js');
        await this.wasmModule.init();
    }

    async loadOntology(jsonData) {
        this.graph = this.wasmModule.parse_ontology(jsonData);
        this.renderGraph();
    }

    renderGraph() {
        // Get positions from WASM
        const positions = this.wasmModule.get_node_positions(this.graph);

        // Render with D3
        const nodes = this.graph.get_nodes();
        d3.select('svg')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('cx', (d, i) => positions[i * 2])
            .attr('cy', (d, i) => positions[i * 2 + 1]);
    }
}
```

---

## 4. Data Flow

### 4.1 Ontology Loading Sequence

```
User                 UI              WASM           Parser         Graph
 │                   │                │              │              │
 │──Upload File─────▶│                │              │              │
 │                   │──JSON String──▶│              │              │
 │                   │                │──Parse──────▶│              │
 │                   │                │              │──Validate───▶│
 │                   │                │              │◀─Nodes/Props─┤
 │                   │                │◀─Graph Handle────────────────┤
 │                   │◀─Success───────┤              │              │
 │◀─Confirmation─────┤                │              │              │
```

### 4.2 Layout Computation Loop

```
JS Event Loop       WASM Module      Layout Engine    Quadtree
 │                   │                │                │
 │──requestAnimationFrame()          │                │
 │                   │                │                │
 │──tick()──────────▶│                │                │
 │                   │──compute()────▶│                │
 │                   │                │──build()──────▶│
 │                   │                │                │
 │                   │                │◀─forces────────┤
 │                   │                │                │
 │                   │                │──integrate()   │
 │                   │◀─positions─────┤                │
 │◀─Float64Array─────┤                │                │
 │                   │                │                │
 │──render with D3   │                │                │
```

### 4.3 Filter Application

```
User              UI Menu         WASM            Filter Module    Graph
 │                 │               │                │               │
 │─Select Filter──▶│               │                │               │
 │                 │──apply()─────▶│                │               │
 │                 │               │──execute()────▶│               │
 │                 │               │                │──update()────▶│
 │                 │               │                │               │
 │                 │               │                │◀─filtered─────┤
 │                 │               │◀─node_ids──────┤               │
 │                 │◀─visible──────┤                │               │
 │◀─Re-render──────┤               │                │               │
```

### 4.4 Memory Management

**Rust Ownership**:
- Graph structures owned by Rust
- JavaScript holds opaque handle (usize)
- No direct memory access from JS

**Data Transfer**:
- **Zero-copy**: Use TypedArrays (Float64Array) for positions
- **Serialization**: Use JSON for complex structures (nodes, properties)
- **Lifecycle**: Explicit `drop()` calls from JS to free Rust memory

```javascript
// JavaScript side
const graph = wasm.parse_ontology(json);  // Returns handle

// Use graph...
const positions = wasm.get_node_positions(graph);  // Zero-copy view

// Cleanup
wasm.drop_graph(graph);  // Explicitly free Rust memory
```

---

## 5. Module Structure

### 5.1 Cargo Workspace Layout

```
webvowl-rust/
├── Cargo.toml                 # Workspace root
├── crates/
│   ├── vowl-core/             # Main WASM entry point
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs         # WASM exports
│   │   │   ├── api.rs         # Public API
│   │   │   └── memory.rs      # Memory management
│   │   └── tests/
│   │
│   ├── vowl-graph/            # Core data structures
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── node.rs        # Node definitions
│   │   │   ├── property.rs    # Property definitions
│   │   │   ├── graph.rs       # Graph container
│   │   │   └── types.rs       # Enums and IDs
│   │   └── tests/
│   │
│   ├── vowl-parser/           # JSON parsing
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── json.rs        # Serde models
│   │   │   ├── parse.rs       # Parse logic
│   │   │   └── validate.rs    # Validation
│   │   └── tests/
│   │
│   ├── vowl-layout/           # Force-directed layout
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── forces.rs      # Force calculations
│   │   │   ├── quadtree.rs    # Spatial indexing
│   │   │   └── integrator.rs  # Position integration
│   │   ├── tests/
│   │   └── benches/           # Performance benchmarks
│   │
│   ├── vowl-filters/          # Filtering system
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── degree.rs      # Node degree filter
│   │   │   ├── subclass.rs    # Subclass filter
│   │   │   └── plugin.rs      # Filter plugin API
│   │   └── tests/
│   │
│   └── vowl-algorithms/       # Misc algorithms
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs
│       │   ├── search.rs      # Fuzzy search
│       │   ├── export.rs      # SVG/JSON export
│       │   └── stats.rs       # Statistics
│       └── tests/
│
├── pkg/                       # wasm-pack output (gitignored)
├── tests/
│   └── integration/           # Cross-crate integration tests
└── benches/                   # End-to-end benchmarks
```

### 5.2 JavaScript Integration

```
src/
├── webvowl/
│   ├── js/
│   │   ├── wasm/              # WASM integration layer
│   │   │   ├── loader.js      # Load WASM module
│   │   │   ├── adapter.js     # Adapt WASM API to D3
│   │   │   └── fallback.js    # Fallback to JS implementation
│   │   ├── graph.js           # Modified to use WASM
│   │   ├── parser.js          # Deprecated (moved to Rust)
│   │   └── modules/           # UI modules (unchanged)
│   └── pkg/                   # Symlink to WASM build output
└── app/
    └── js/                    # Application code (unchanged)
```

---

## 6. Technology Stack

### 6.1 Rust Dependencies

| Crate | Version | Purpose | Bundle Impact |
|-------|---------|---------|---------------|
| `wasm-bindgen` | 0.2.89 | WASM bindings | ~50KB |
| `serde` | 1.0 | Serialization | ~30KB |
| `serde_json` | 1.0 | JSON parsing | ~30KB |
| `js-sys` | 0.3 | JS interop | Minimal |
| `web-sys` | 0.3 | Browser APIs | Minimal |
| `console_error_panic_hook` | 0.1 | Better errors | Dev only |
| `wee_alloc` | 0.4 | Small allocator | -20KB saved |

**Total estimated WASM size**: ~450KB (optimized with `wasm-opt`)

### 6.2 Build Tools

| Tool | Purpose |
|------|---------|
| `wasm-pack` | Build and bundle WASM |
| `wasm-opt` | Optimize WASM binary size |
| `webpack` | Bundle JS and WASM together |
| `cargo` | Rust build system |

### 6.3 Testing Tools

| Tool | Purpose |
|------|---------|
| `cargo test` | Rust unit tests |
| `wasm-bindgen-test` | WASM-specific tests |
| `karma` | Browser integration tests |
| `criterion` | Rust benchmarking |

---

## 7. Build & Deployment

### 7.1 Development Workflow

```bash
# 1. Build Rust → WASM
cd webvowl-rust
wasm-pack build --target web --dev

# 2. Symlink WASM output
cd ../src/webvowl
ln -s ../../webvowl-rust/pkg pkg

# 3. Start dev server
npm run webserver
```

### 7.2 Production Build

```bash
# 1. Build optimized WASM
wasm-pack build --target web --release

# 2. Optimize further
wasm-opt -Oz -o pkg/vowl_core_bg.wasm pkg/vowl_core_bg.wasm

# 3. Bundle with webpack
grunt release
```

### 7.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      - run: cargo test --all-features
      - run: cargo clippy -- -D warnings

  test-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: jetli/wasm-pack-action@v0.4.0
      - run: wasm-pack test --headless --firefox

  build:
    runs-on: ubuntu-latest
    needs: [test-rust, test-wasm]
    steps:
      - run: wasm-pack build --release
      - run: npm install
      - run: grunt release
      - uses: actions/upload-artifact@v2
        with:
          name: webvowl-dist
          path: deploy/
```

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
        ┌─────────────┐
        │  End-to-End │  (5% - Browser automation)
        │   (Karma)   │
        └──────┬──────┘
       ┌───────▼────────┐
       │  Integration   │  (15% - Rust ↔ JS)
       │ (wasm-bindgen) │
       └───────┬────────┘
      ┌────────▼─────────┐
      │   Unit Tests     │  (80% - Rust logic)
      │  (cargo test)    │
      └──────────────────┘
```

### 8.2 Test Categories

#### 8.2.1 Unit Tests (Rust)

**Location**: `crates/*/src/*.rs` (inline with `#[cfg(test)]`)

**Examples**:
```rust
// vowl-parser/src/parse.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_ontology() {
        let json = r#"{ "class": [...] }"#;
        let graph = parse_ontology(json).unwrap();
        assert_eq!(graph.nodes().len(), 5);
    }

    #[test]
    fn test_invalid_json() {
        let json = "invalid";
        assert!(parse_ontology(json).is_err());
    }
}
```

#### 8.2.2 Property-Based Tests

**Tool**: `proptest`

**Example**:
```rust
// vowl-layout/src/quadtree.rs
#[cfg(test)]
mod proptests {
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn quadtree_contains_all_nodes(nodes in prop::collection::vec(node_strategy(), 1..1000)) {
            let tree = build_quadtree(&nodes);
            for node in &nodes {
                assert!(tree.contains(node.position));
            }
        }
    }
}
```

#### 8.2.3 Integration Tests (Rust)

**Location**: `tests/integration/*.rs`

**Example**:
```rust
// tests/integration/layout_test.rs
use vowl_core::*;

#[test]
fn test_full_layout_pipeline() {
    let json = include_str!("../fixtures/foaf.json");
    let mut graph = parse_ontology(json).unwrap();

    compute_layout(&mut graph, 300);

    // Check convergence
    let positions = get_node_positions(&graph);
    assert!(is_stable(&positions));
}
```

#### 8.2.4 WASM Tests

**Tool**: `wasm-bindgen-test`

**Example**:
```rust
// vowl-core/tests/wasm.rs
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn test_wasm_initialization() {
    init().unwrap();
}

#[wasm_bindgen_test]
fn test_parse_from_js() {
    let json = r#"{ "class": [] }"#;
    let graph = parse_ontology(json).unwrap();
    assert!(graph.is_valid());
}
```

#### 8.2.5 Browser Tests (Karma)

**Tool**: Karma + Jasmine

**Example**:
```javascript
// tests/browser/wasm_integration_spec.js
describe('WASM Integration', () => {
    let wasm;

    beforeEach(async () => {
        wasm = await import('../../src/webvowl/pkg/vowl_core.js');
        await wasm.init();
    });

    it('should load ontology', () => {
        const json = JSON.stringify({ class: [], property: [] });
        const graph = wasm.parse_ontology(json);
        expect(graph).toBeDefined();
    });

    it('should compute layout', () => {
        const graph = loadTestGraph();
        wasm.compute_layout(graph, 100);
        const positions = wasm.get_node_positions(graph);
        expect(positions.length).toBeGreaterThan(0);
    });
});
```

### 8.3 Performance Benchmarking

**Tool**: `criterion`

**Example**:
```rust
// benches/layout_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use vowl_core::*;

fn bench_layout(c: &mut Criterion) {
    let json = include_str!("../fixtures/large_ontology.json");
    let mut graph = parse_ontology(json).unwrap();

    c.bench_function("layout_1000_nodes", |b| {
        b.iter(|| {
            compute_layout(black_box(&mut graph), 1);
        });
    });
}

criterion_group!(benches, bench_layout);
criterion_main!(benches);
```

**Run benchmarks**:
```bash
cargo bench
```

### 8.4 Test Coverage

**Tool**: `tarpaulin`

```bash
# Generate coverage report
cargo tarpaulin --all-features --workspace --out Html

# Target: 90%+ line coverage
```

---

## 9. Deployment Architecture

### 9.1 Static Hosting

```
CDN (Cloudflare/Netlify)
│
├─ /index.html
├─ /app.js
├─ /vowl_core.js          # WASM glue code
├─ /vowl_core_bg.wasm     # WASM binary
└─ /data/
   ├─ foaf.json
   └─ sioc.json
```

### 9.2 NPM Package Structure

```
@webvowl/core/
├── package.json
├── README.md
├── dist/
│   ├── vowl_core.js
│   ├── vowl_core.d.ts     # TypeScript definitions
│   └── vowl_core_bg.wasm
└── src/
    └── index.js           # Re-export WASM API
```

---

## 10. Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
- ✅ Set up Cargo workspace
- ✅ Implement core data structures (vowl-graph)
- ✅ Implement parser (vowl-parser)
- ✅ Basic WASM exports
- ✅ Integration with existing UI

### Phase 2: Layout Engine (Weeks 3-4)
- ⏳ Port force-directed layout
- ⏳ Implement Barnes-Hut quadtree
- ⏳ Optimize with profiling
- ⏳ Achieve 4x speedup

### Phase 3: Filters (Weeks 5-6)
- ⏳ Port all 17 filter modules
- ⏳ Plugin architecture
- ⏳ Ensure visual parity

### Phase 4: Advanced Features (Weeks 7-8)
- ⏳ Search implementation
- ⏳ Export functions
- ⏳ Statistics calculation
- ⏳ SIMD optimizations (if supported)

### Phase 5: Polish (Weeks 9-10)
- ⏳ Bundle size optimization
- ⏳ Performance tuning
- ⏳ Documentation
- ⏳ Migration guide

---

**Document Control:**
- Version: 1.0.0
- Last Updated: 2025-11-10
- Reviewers: Researcher, Coder, Tester
- Next Steps: Implement test strategy document
