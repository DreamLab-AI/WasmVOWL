# SPARC Phase 1: Specification - Rust/WASM Architecture for WebVOWL

**Author**: System Architect Agent
**Date**: 2025-11-10
**Status**: Draft
**Swarm Session**: swarm-1762805104330-fury1qic2

## Executive Summary

This specification defines the requirements for migrating WebVOWL's JavaScript visualization engine to a high-performance Rust/WASM architecture while maintaining full backward compatibility with the existing D3.js-based interface.

## 1. Functional Requirements

### 1.1 Core Visualization Engine

**FR-1.1.1: Ontology Parsing**
- MUST parse OWL2 ontologies in JSON format
- MUST support all existing node types: OwlClass, RdfsClass, OwlThing, OwlNothing, RdfsDatatype, ExternalClass, etc.
- MUST support all existing property types: ObjectProperty, DatatypeProperty, SubclassOf, etc.
- MUST maintain compatibility with existing JSON schema

**FR-1.1.2: Graph Layout Algorithm**
- MUST implement force-directed layout (D3 force simulation equivalent)
- MUST support configurable physics parameters (gravity, charge, distance)
- MUST provide 60 FPS performance for graphs with 1000+ nodes
- MUST support real-time interaction (drag, zoom, pan)

**FR-1.1.3: Rendering Pipeline**
- MUST render nodes as SVG/Canvas elements with VOWL-compliant styles
- MUST support node types: circular, rectangular, set operators
- MUST render edges with proper arrow types and labels
- MUST maintain visual fidelity with existing implementation

### 1.2 Filtering and Search

**FR-1.2.1: Filter Modules**
- MUST implement all 17 existing filter modules:
  - Node degree filter
  - Datatype filter
  - Object property filter
  - Subclass filter
  - Set operator filter
  - Disjoint filter
  - Empty literal filter
  - And more...

**FR-1.2.2: Search Functionality**
- MUST support fuzzy text search across node labels and IRIs
- MUST highlight search results in real-time
- MUST provide search performance < 100ms for 1000+ nodes

### 1.3 Interactive Features

**FR-1.3.1: User Interactions**
- MUST support node selection and detail display
- MUST support drag-and-drop repositioning
- MUST support pin/unpin nodes
- MUST support zoom (0.1x to 10x range)
- MUST support pan with mouse/touch gestures

**FR-1.3.2: Visual Modes**
- MUST support compact notation mode
- MUST support color external classes mode
- MUST support node scaling mode
- MUST support pick-and-pin mode

### 1.4 Data Import/Export

**FR-1.4.1: Import Formats**
- MUST support JSON ontology format (primary)
- MUST support loading from URLs
- MUST support file upload
- MUST support direct text input

**FR-1.4.2: Export Formats**
- MUST export to SVG with embedded styles
- MUST export to JSON with current state
- MUST export to Turtle (TTL) format
- MUST export statistics as JSON/CSV

## 2. Non-Functional Requirements

### 2.1 Performance

**NFR-2.1.1: Computational Performance**
- Target: 3-5x speedup over current JavaScript implementation
- Layout computation: < 16ms per frame (60 FPS)
- Initial parse time: < 200ms for 1000-node ontology
- Filter application: < 50ms for any filter operation

**NFR-2.1.2: Memory Efficiency**
- WASM heap size: < 50MB for 1000-node graph
- No memory leaks during extended sessions
- Efficient garbage collection coordination with JS

**NFR-2.1.3: Bundle Size**
- Compressed WASM binary: < 500KB
- Total JavaScript glue code: < 100KB
- Support for lazy loading of filter modules

### 2.2 Browser Compatibility

**NFR-2.2.1: Target Browsers**
- MUST support Chrome/Edge 90+ (97% WASM support)
- MUST support Firefox 89+
- MUST support Safari 14.1+
- SHOULD provide graceful degradation for older browsers

**NFR-2.2.2: Feature Detection**
- MUST detect WASM support at runtime
- MUST fall back to JavaScript implementation if WASM unavailable
- MUST detect SIMD support for optimizations

### 2.3 Developer Experience

**NFR-2.3.1: Build System**
- MUST integrate with existing Grunt/Webpack build
- MUST support hot module reload during development
- MUST provide source maps for debugging
- Build time: < 30 seconds for development builds

**NFR-2.3.2: Testing**
- MUST achieve 90%+ code coverage
- MUST support unit tests (Rust) and integration tests (JS)
- MUST maintain existing Karma/Jasmine test suite compatibility

### 2.4 Maintainability

**NFR-2.4.1: Code Quality**
- MUST follow Rust idioms and best practices
- MUST use safe Rust (no unsafe blocks without justification)
- MUST document all public APIs with rustdoc
- MUST pass Clippy linting with zero warnings

**NFR-2.4.2: Modularity**
- MUST separate concerns into distinct crates
- MUST support plugin architecture for filters
- MUST provide clear API boundaries between Rust and JS

## 3. System Context

### 3.1 Current Architecture Analysis

**Existing Components:**
- `src/webvowl/js/graph.js` - Main graph controller (2500+ LOC)
- `src/webvowl/js/parser.js` - OWL JSON parser (740 LOC)
- `src/webvowl/js/modules/` - 17 filter modules
- `src/webvowl/js/elements/` - Node and property implementations
- `src/app/js/` - Application-level UI and menus

**Key Dependencies:**
- D3.js v3.5.6 - Force layout and SVG manipulation
- Lodash v4.1.0 - Utility functions
- Webpack v1.12.0 - Module bundling

### 3.2 Migration Strategy

**Incremental Approach:**
1. **Phase 1**: Migrate parser and data structures to Rust
2. **Phase 2**: Port force layout algorithm to Rust
3. **Phase 3**: Implement filtering system in Rust
4. **Phase 4**: Optimize rendering pipeline with WASM
5. **Phase 5**: Add advanced features (SIMD, threading)

**Risk Mitigation:**
- Maintain dual implementation during transition
- Extensive cross-implementation testing
- Feature flag system for gradual rollout

## 4. API Contracts

### 4.1 Rust → JavaScript Interface

**4.1.1: Initialization**
```typescript
interface WasmVowl {
  // Initialize WASM module
  init(): Promise<void>;

  // Parse ontology JSON
  parse_ontology(json: string): Result<GraphHandle, string>;

  // Get module version
  version(): string;
}
```

**4.1.2: Graph Operations**
```typescript
interface GraphHandle {
  // Layout computation
  tick(iterations: number): void;

  // Get node positions
  get_node_positions(): Float64Array;

  // Apply filter
  apply_filter(filter_id: string, params: any): void;

  // Search nodes
  search(query: string): number[];

  // Update physics parameters
  set_physics(gravity: number, charge: number, distance: number): void;
}
```

**4.1.3: Events**
```typescript
interface GraphEvents {
  // Layout convergence
  on_layout_complete(): void;

  // Node selection
  on_node_selected(node_id: number): void;

  // Error handling
  on_error(error: string): void;
}
```

### 4.2 JavaScript → Rust Interface

**4.2.1: Data Structures**
- All data transferred via typed arrays for zero-copy operations
- JSON serialization only for initialization
- Shared memory buffers for position data

**4.2.2: Memory Management**
- Rust owns graph data structures
- JavaScript holds opaque handles
- Explicit cleanup with `drop()` methods

## 5. Performance Targets

### 5.1 Benchmark Scenarios

| Scenario | Current (JS) | Target (Rust/WASM) | Improvement |
|----------|-------------|-------------------|-------------|
| Parse 1000-node ontology | 800ms | 200ms | 4x faster |
| Layout iteration (1000 nodes) | 35ms | 8ms | 4.4x faster |
| Apply node degree filter | 150ms | 30ms | 5x faster |
| Search 1000 nodes | 80ms | 15ms | 5.3x faster |
| Export to SVG | 400ms | 100ms | 4x faster |

### 5.2 Memory Targets

| Metric | Current (JS) | Target (Rust/WASM) | Improvement |
|--------|-------------|-------------------|-------------|
| Heap size (1000 nodes) | 120MB | 40MB | 3x reduction |
| Initial load size | 800KB | 600KB | 25% reduction |
| Memory leaks | Some detected | Zero | 100% fix |

## 6. Compatibility Requirements

### 6.1 Data Format Compatibility

**MUST maintain:**
- Existing JSON ontology format (no changes)
- Existing export formats (SVG, JSON, TTL)
- Existing URL parameter schema
- Existing localStorage schema for settings

### 6.2 API Compatibility

**MUST maintain:**
- Existing JavaScript API for embedding
- Existing CSS classes and styling hooks
- Existing DOM structure for external integrations
- Existing event system

### 6.3 Visual Compatibility

**MUST maintain:**
- Identical rendering output (pixel-perfect)
- Same color schemes and visual encoding
- Same animation behaviors
- Same interaction patterns

## 7. Security Requirements

**SR-7.1: Input Validation**
- MUST validate all JSON input against schema
- MUST prevent DoS via oversized ontologies
- MUST sanitize all user-provided strings

**SR-7.2: Memory Safety**
- MUST prevent buffer overflows (Rust guarantees)
- MUST handle OOM conditions gracefully
- MUST prevent undefined behavior

**SR-7.3: Supply Chain**
- MUST audit all Rust dependencies
- MUST use only trusted crates
- MUST pin dependency versions

## 8. Acceptance Criteria

### 8.1 Functional Tests
- [ ] All existing Karma/Jasmine tests pass
- [ ] All 17 filter modules work identically
- [ ] All example ontologies render correctly
- [ ] All export formats produce identical output

### 8.2 Performance Tests
- [ ] 4x speedup achieved for layout computation
- [ ] Memory usage reduced by 50%+
- [ ] 60 FPS maintained for 1000-node graphs
- [ ] Build time < 30 seconds

### 8.3 Compatibility Tests
- [ ] Works in Chrome, Firefox, Safari latest
- [ ] Graceful degradation in older browsers
- [ ] No breaking changes to public API
- [ ] All existing integrations work unchanged

## 9. Open Questions

1. **Q**: Should we use wasm-bindgen or direct WASM?
   - **A**: TBD - Evaluate bundle size vs. DX

2. **Q**: Should we implement custom SIMD optimizations?
   - **A**: TBD - Profile first, optimize after Phase 4

3. **Q**: How to handle D3.js dependency for SVG rendering?
   - **A**: TBD - Keep D3 for now, consider alternatives later

4. **Q**: Should we support WebGL rendering?
   - **A**: Out of scope for v1.0, consider for v2.0

## 10. References

- [WebVOWL Paper](http://vowl.visualdataweb.org/webvowl.html)
- [VOWL Specification 2.0](http://vowl.visualdataweb.org/v2/)
- [Rust WASM Book](https://rustwasm.github.io/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)

---

**Document Control:**
- Version: 1.0.0
- Last Updated: 2025-11-10
- Next Review: After researcher feedback
- Approvers: Swarm coordinator, researcher agent, coder agent
