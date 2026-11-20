# WebVOWL Legacy Test Suite (not wired)

> **Status: orphaned, not runnable.** This suite targets the legacy D3 sources
> under a root `src/` directory that no longer exists (the legacy code now lives
> in `legacy/`), and `karma.conf.js` resolves `../src/**` from here. No root npm
> script runs it, so the per-type commands (unit, integration, e2e, benchmark, coverage,
> watch) described in earlier revisions of this file do not exist.
>
> What actually runs:
>
> - `npm test` at the root: the modern suite (`modern/`, Vitest) plus
>   `checks/root-surface.test.mjs`.
> - `npm run test:legacy` at the root: the legacy Grunt/Karma suite in
>   `legacy/test/`.
>
> The files below are kept for reference only.

## Test Structure

```
tests/
├── unit/                           # Unit tests (100+ tests)
│   ├── parser.test.js             # Parser module tests
│   ├── graph.test.js              # Graph module tests
│   └── elements.test.js           # Element factory tests
│
├── integration/                    # Integration tests (30+ tests)
│   └── owl-parsing.integration.test.js
│
├── e2e/                           # End-to-end tests (20+ tests)
│   └── visualization.e2e.test.js
│
├── benchmarks/                    # Performance benchmarks
│   └── performance.benchmark.js
│
├── fixtures/                      # Test data
│   └── ontologies/
│
└── karma.conf.js                  # Test runner configuration
```

## Test Philosophy

### London TDD Approach

This test suite follows **London School TDD**:

✅ **Behavior-Driven**: Focus on interactions, not state
✅ **Mock-Heavy**: Extensive use of mocks to isolate units
✅ **Collaboration Testing**: Verify how objects work together
✅ **Outside-In**: Start from high-level behaviors

### Test Pyramid

```
         /\
        /E2E\      ~10 tests (browser-based)
       /------\
      /Integr.\   ~30 tests (real modules)
     /----------\
    /   Unit     \ ~100+ tests (mocked dependencies)
   /--------------\
```

## Coverage Areas

### ✅ Unit Tests (100+ tests)

**Parser Module**:
- [x] Parse valid ontology data
- [x] Handle empty/malformed data
- [x] Create nodes with correct types
- [x] Link properties to nodes
- [x] Handle circular references
- [x] Dictionary management
- [x] Settings import

**Graph Module**:
- [x] Node management (add/remove/find)
- [x] Link management
- [x] Force layout control
- [x] Zoom and pan operations
- [x] Graph filtering
- [x] Statistics calculation
- [x] Rendering pipeline

**Element Factories**:
- [x] OwlClass creation
- [x] OwlObjectProperty creation
- [x] Set operators (Union, Intersection, Complement)
- [x] Property characteristics (Functional, Transitive)
- [x] Link visualization
- [x] Element attributes and styling

### ✅ Integration Tests (30+ tests)

- [x] Complete parsing pipeline (OWL → Graph)
- [x] Graph layout integration
- [x] Real ontology files (FOAF, etc.)
- [x] Filter integration
- [x] Error recovery
- [x] Memory management

### ✅ End-to-End Tests (20+ tests)

- [x] Application loading
- [x] Ontology selection
- [x] Graph interaction (zoom, pan, click)
- [x] Filter operations
- [x] Search functionality
- [x] Export operations
- [x] Responsive layout
- [x] Accessibility
- [x] Error handling

### ✅ Performance Benchmarks

- [x] Parsing performance (small/medium/large)
- [x] Layout stabilization
- [x] Rendering updates
- [x] Memory usage
- [x] Search performance
- [x] Filter performance

## Performance Thresholds

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| Small ontology parse | <100ms | Fast feedback |
| Medium ontology parse | <500ms | Interactive |
| Large ontology parse | <2000ms | Acceptable |
| Layout stabilization | <1000ms | Smooth UX |
| Render update | <50ms | 20 FPS minimum |
| Memory per node | <10KB | Scalability |

## Writing Tests

### Test Naming Convention

```javascript
describe("Module Name", function() {
    it("should [expected behavior] when [condition]", function() {
        // Test implementation
    });
});
```

### Arrange-Act-Assert Pattern

```javascript
it("should create node with correct type", function() {
    // Arrange: Setup test data and mocks
    var mockGraph = jasmine.createSpyObj('graph', ['addNode']);
    var nodeData = { id: "test", type: "owl:Class" };

    // Act: Execute the behavior
    var node = createNode(mockGraph, nodeData);

    // Assert: Verify the outcome
    expect(node.type()).toBe("owl:Class");
    expect(mockGraph.addNode).toHaveBeenCalled();
});
```

### Mocking Guidelines

**DO Mock**:
- ✅ External dependencies (HTTP, filesystem)
- ✅ Slow operations (layout computation)
- ✅ Complex libraries (D3.js force layout)
- ✅ User input/events

**DON'T Mock**:
- ❌ Objects under test
- ❌ Simple data structures
- ❌ Pure functions
- ❌ Trivial dependencies

### Example: Creating Mocks

```javascript
// Spy object with methods
var mockGraph = jasmine.createSpyObj('graph', [
    'addNode',
    'addLink',
    'update'
]);

// Configure return values
mockGraph.addNode.and.returnValue({ id: "node1" });

// Spy on existing method
spyOn(d3.layout, 'force').and.returnValue(mockForce);

// Verify calls
expect(mockGraph.addNode).toHaveBeenCalledWith(nodeData);
expect(mockGraph.addNode).toHaveBeenCalledTimes(3);
```


## License

MIT License - Same as WebVOWL

---

**Last Updated**: 2026-11-20 (marked orphaned)
