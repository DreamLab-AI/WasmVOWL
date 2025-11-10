# SPARC Phase 3: Test Strategy - London TDD Approach

**Author**: System Architect Agent
**Date**: 2025-11-10
**Status**: Draft
**Swarm Session**: swarm-1762805104330-fury1qic2

## Table of Contents

1. [TDD Philosophy](#1-tdd-philosophy)
2. [London School vs. Detroit School](#2-london-school-vs-detroit-school)
3. [Test Structure](#3-test-structure)
4. [Test Categories](#4-test-categories)
5. [Mocking Strategy](#5-mocking-strategy)
6. [Test Patterns](#6-test-patterns)
7. [Coverage Targets](#7-coverage-targets)
8. [Continuous Testing](#8-continuous-testing)

---

## 1. TDD Philosophy

### 1.1 Three Laws of TDD

1. **Write no production code** except to pass a failing test
2. **Write only enough of a test** to demonstrate a failure
3. **Write only enough production code** to pass the test

### 1.2 Red-Green-Refactor Cycle

```
┌─────────────────────────────────────┐
│  1. RED: Write failing test         │
│     - Think about API design        │
│     - Define expected behavior      │
│     - Test should not compile yet   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  2. GREEN: Make test pass           │
│     - Write minimal code            │
│     - Hardcode if necessary         │
│     - Get to green quickly          │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  3. REFACTOR: Improve code          │
│     - Remove duplication            │
│     - Improve names                 │
│     - Extract methods               │
│     - Tests stay green!             │
└──────────────┬──────────────────────┘
               │
               └──────────────┐
                              │
                   ┌──────────▼─────────┐
                   │  REPEAT            │
                   └────────────────────┘
```

### 1.3 Benefits for Rust/WASM Project

- **Early API Design**: Tests force you to think about public interfaces first
- **Confidence**: Refactor Rust code fearlessly with safety net
- **Documentation**: Tests serve as executable examples
- **WASM Debugging**: Catch issues before they reach browser
- **Performance**: Identify slow code paths early with benchmarks

---

## 2. London School vs. Detroit School

### 2.1 Detroit School (Classic TDD)

**Philosophy**: Test behavior, not implementation. Use real objects.

**Example**:
```rust
#[test]
fn test_graph_filters_nodes_by_degree() {
    // Arrange: Create real graph with real nodes
    let mut graph = Graph::new();
    graph.add_node(Node::new("A"));
    graph.add_node(Node::new("B"));
    graph.add_property(Property::new("A", "B"));

    // Act: Apply real filter
    let filter = NodeDegreeFilter::new(1, 1);
    filter.apply(&mut graph);

    // Assert: Check actual result
    assert_eq!(graph.visible_nodes().len(), 2);
}
```

**Pros**: Tests are resilient to refactoring
**Cons**: Slow, hard to isolate failures

### 2.2 London School (Mockist TDD)

**Philosophy**: Test collaborations between objects. Use mocks heavily.

**Example**:
```rust
#[test]
fn test_graph_controller_delegates_to_filter() {
    // Arrange: Create mocks
    let mut mock_graph = MockGraph::new();
    let mut mock_filter = MockFilter::new();

    // Expect: Define expected interactions
    mock_filter
        .expect_apply()
        .with(eq(&mock_graph))
        .times(1)
        .returning(|_| Ok(()));

    // Act: Execute system under test
    let controller = GraphController::new(mock_graph, mock_filter);
    controller.apply_filter("degree");

    // Assert: Verify interactions happened
    // (implicit via mock expectations)
}
```

**Pros**: Fast, isolates failures precisely
**Cons**: Brittle, couples tests to implementation

### 2.3 Our Hybrid Approach

**Strategy**: Use **London School for unit tests**, **Detroit School for integration tests**

| Test Level | Approach | Rationale |
|------------|----------|-----------|
| **Unit Tests** (Rust) | London (mocks) | Fast feedback, precise isolation |
| **Integration Tests** (Rust) | Detroit (real) | Test real interactions between modules |
| **WASM Tests** | Detroit (real) | Test actual browser environment |
| **E2E Tests** (Browser) | Detroit (real) | Test full user workflows |

---

## 3. Test Structure

### 3.1 Arrange-Act-Assert (AAA) Pattern

**Standard for all tests**:

```rust
#[test]
fn test_name_describes_behavior() {
    // Arrange: Set up test fixtures
    let input = setup_test_data();
    let mut sut = SystemUnderTest::new();

    // Act: Execute the behavior
    let result = sut.do_something(input);

    // Assert: Verify expectations
    assert_eq!(result, expected_value);
}
```

### 3.2 Given-When-Then (BDD Style)

**For complex scenarios**:

```rust
#[test]
fn test_complex_scenario() {
    // Given: A graph with 100 nodes
    let mut graph = create_large_graph(100);

    // And: A node degree filter configured for min=2, max=5
    let filter = NodeDegreeFilter::new(2, 5);

    // When: The filter is applied
    filter.apply(&mut graph);

    // Then: Only nodes with degree 2-5 are visible
    let visible = graph.visible_nodes();
    assert!(visible.iter().all(|n| {
        let degree = graph.degree(n);
        degree >= 2 && degree <= 5
    }));

    // And: The graph emits a filtered event
    assert_eq!(graph.last_event(), Event::Filtered);
}
```

### 3.3 Test Naming Convention

**Pattern**: `test_<unit>_<scenario>_<expected_behavior>`

**Examples**:
- `test_parser_with_invalid_json_returns_error()`
- `test_quadtree_with_overlapping_nodes_builds_correctly()`
- `test_filter_with_no_matching_nodes_hides_all()`

---

## 4. Test Categories

### 4.1 Unit Tests (London School)

**Scope**: Single function/method in isolation
**Location**: Inline with code (`#[cfg(test)]` modules)
**Mocking**: Heavy use of mock traits

**Example**:
```rust
// src/vowl-parser/src/parse.rs

// Define trait for dependency injection
pub trait JsonDeserializer {
    fn deserialize(&self, json: &str) -> Result<RawOntology, Error>;
}

// Production implementation
pub struct SerdeDeserializer;
impl JsonDeserializer for SerdeDeserializer {
    fn deserialize(&self, json: &str) -> Result<RawOntology, Error> {
        serde_json::from_str(json)
    }
}

// Parser depends on trait, not concrete type
pub struct OntologyParser<D: JsonDeserializer> {
    deserializer: D,
}

impl<D: JsonDeserializer> OntologyParser<D> {
    pub fn parse(&self, json: &str) -> Result<Graph, Error> {
        let raw = self.deserializer.deserialize(json)?;
        // ... rest of parsing logic
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::*;

    // Define mock using mockall
    mock! {
        JsonDeserializer {}

        impl JsonDeserializer for JsonDeserializer {
            fn deserialize(&self, json: &str) -> Result<RawOntology, Error>;
        }
    }

    #[test]
    fn test_parser_handles_deserializer_error() {
        // Arrange
        let mut mock = MockJsonDeserializer::new();
        mock.expect_deserialize()
            .returning(|_| Err(Error::InvalidJson));

        let parser = OntologyParser { deserializer: mock };

        // Act
        let result = parser.parse("{}");

        // Assert
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidJson);
    }
}
```

### 4.2 Integration Tests (Detroit School)

**Scope**: Multiple modules working together
**Location**: `tests/integration/*.rs`
**Mocking**: Minimal or none

**Example**:
```rust
// tests/integration/parser_layout_integration.rs

use vowl_core::*;

#[test]
fn test_parsed_graph_can_be_laid_out() {
    // Arrange: Real parser, real graph, real layout
    let json = include_str!("../fixtures/foaf.json");

    // Act: Parse with real parser
    let mut graph = parse_ontology(json).expect("Parse failed");

    // Act: Layout with real algorithm
    compute_layout(&mut graph, 100);

    // Assert: Check real results
    let positions = get_node_positions(&graph);

    // All nodes should have moved from origin
    for i in (0..positions.len()).step_by(2) {
        let x = positions[i];
        let y = positions[i + 1];
        assert!(x.abs() > 0.1 || y.abs() > 0.1, "Node didn't move");
    }

    // Layout should have converged (low kinetic energy)
    let energy = calculate_kinetic_energy(&graph);
    assert!(energy < 1.0, "Layout didn't converge");
}
```

### 4.3 Property-Based Tests

**Tool**: `proptest`
**Purpose**: Test with generated inputs to find edge cases

**Example**:
```rust
// vowl-layout/src/quadtree.rs

#[cfg(test)]
mod proptests {
    use super::*;
    use proptest::prelude::*;

    // Generate random nodes
    fn node_strategy() -> impl Strategy<Value = Node> {
        (
            any::<String>(),              // id
            -1000.0..1000.0,               // x
            -1000.0..1000.0,               // y
        ).prop_map(|(id, x, y)| {
            Node {
                id,
                position: Vec2 { x, y },
                ..Default::default()
            }
        })
    }

    proptest! {
        #[test]
        fn test_quadtree_contains_all_inserted_nodes(
            nodes in prop::collection::vec(node_strategy(), 1..100)
        ) {
            // Act: Build quadtree with random nodes
            let tree = build_quadtree(&nodes);

            // Assert: All nodes can be found
            for node in &nodes {
                prop_assert!(tree.query(node.position).is_some());
            }
        }

        #[test]
        fn test_quadtree_doesnt_contain_non_inserted_nodes(
            inserted in prop::collection::vec(node_strategy(), 1..100),
            queried in prop::collection::vec(node_strategy(), 1..100),
        ) {
            // Ensure sets don't overlap
            let tree = build_quadtree(&inserted);

            for node in &queried {
                if !inserted.contains(node) {
                    prop_assert!(tree.query(node.position).is_none());
                }
            }
        }
    }
}
```

### 4.4 WASM Tests

**Tool**: `wasm-bindgen-test`
**Purpose**: Test in actual browser environment

**Example**:
```rust
// vowl-core/tests/wasm.rs

use wasm_bindgen_test::*;
use vowl_core::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_wasm_parse_and_layout() {
    // Arrange: Initialize WASM
    init().unwrap();

    let json = r#"{
        "class": [{"id": "A", "type": "owl:Class"}],
        "property": []
    }"#;

    // Act: Parse in WASM
    let mut graph = parse_ontology(json).unwrap();

    // Act: Layout in WASM
    compute_layout(&mut graph, 50);

    // Assert: Get results from WASM
    let positions = get_node_positions(&graph);
    assert_eq!(positions.len(), 2); // x, y for one node
}

#[wasm_bindgen_test]
async fn test_wasm_async_loading() {
    // Test async operations in browser
    let json_promise = fetch_json_from_url("test.json");
    let json = json_promise.await.unwrap();

    let graph = parse_ontology(&json).unwrap();
    assert!(graph.node_count() > 0);
}
```

### 4.5 Browser E2E Tests

**Tool**: Karma + Jasmine
**Purpose**: Test full user workflows

**Example**:
```javascript
// tests/browser/user_workflow_spec.js

describe('User Workflow: Load and Filter Ontology', () => {
    let app;

    beforeEach(async () => {
        // Initialize full application
        app = new WebVOWL();
        await app.init();
    });

    it('should load ontology and apply filters', async () => {
        // Arrange: Load sample ontology
        await app.loadOntologyFromUrl('data/foaf.json');

        // Assert: Ontology loaded
        expect(app.graph.nodeCount()).toBeGreaterThan(0);

        // Act: Apply node degree filter
        app.filterMenu.setDegreeRange(2, 5);
        app.filterMenu.applyFilters();

        // Assert: Nodes filtered
        const visibleNodes = app.graph.getVisibleNodes();
        expect(visibleNodes.every(n => {
            const degree = app.graph.getDegree(n);
            return degree >= 2 && degree <= 5;
        })).toBe(true);

        // Act: Export to SVG
        const svg = app.exportToSVG();

        // Assert: SVG contains filtered nodes
        expect(svg).toContain('<circle');
        expect(svg).not.toContain('hidden');
    });
});
```

---

## 5. Mocking Strategy

### 5.1 Mock Traits (Rust)

**Tool**: `mockall`

**Pattern**:
1. Define trait for dependency
2. Production code depends on trait
3. Tests use mock implementation

**Example**:
```rust
// Define trait
pub trait GraphStore {
    fn save(&self, graph: &Graph) -> Result<(), Error>;
    fn load(&self, id: &str) -> Result<Graph, Error>;
}

// Production implementation
pub struct FileStore { /* ... */ }
impl GraphStore for FileStore { /* ... */ }

// System under test depends on trait
pub struct GraphController<S: GraphStore> {
    store: S,
}

impl<S: GraphStore> GraphController<S> {
    pub fn save_graph(&self, graph: &Graph) -> Result<(), Error> {
        self.store.save(graph)
    }
}

// Test with mock
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::*;

    mock! {
        GraphStore {}
        impl GraphStore for GraphStore {
            fn save(&self, graph: &Graph) -> Result<(), Error>;
            fn load(&self, id: &str) -> Result<Graph, Error>;
        }
    }

    #[test]
    fn test_controller_saves_graph() {
        // Arrange
        let mut mock_store = MockGraphStore::new();
        mock_store
            .expect_save()
            .times(1)
            .returning(|_| Ok(()));

        let controller = GraphController { store: mock_store };
        let graph = Graph::new();

        // Act
        let result = controller.save_graph(&graph);

        // Assert
        assert!(result.is_ok());
        // Mock verifies save() was called once
    }
}
```

### 5.2 Test Doubles

**Types**:
- **Stub**: Returns canned responses
- **Mock**: Verifies method calls
- **Spy**: Records calls for later assertions
- **Fake**: Working implementation (in-memory DB)

**When to use each**:

```rust
// STUB: When you don't care about interactions
let stub_filter = StubFilter { will_match: true };

// MOCK: When you care about method calls
let mut mock = MockFilter::new();
mock.expect_apply().times(1);

// SPY: When you want to record calls
let spy = SpyFilter::new();
graph.apply_filter(&spy);
assert_eq!(spy.call_count(), 1);

// FAKE: When you need real behavior
let fake_store = InMemoryStore::new(); // Simpler than real DB
```

---

## 6. Test Patterns

### 6.1 Test Fixtures

**Pattern**: Reusable test data

```rust
// tests/fixtures/mod.rs

pub fn simple_graph() -> Graph {
    let mut graph = Graph::new();
    graph.add_node(Node::new("A"));
    graph.add_node(Node::new("B"));
    graph.add_property(Property::new("A", "B"));
    graph
}

pub fn foaf_graph() -> Graph {
    let json = include_str!("foaf.json");
    parse_ontology(json).unwrap()
}

pub fn large_graph(size: usize) -> Graph {
    let mut graph = Graph::new();
    for i in 0..size {
        graph.add_node(Node::new(&format!("Node{}", i)));
    }
    // Connect nodes randomly...
    graph
}

// Use in tests
#[test]
fn test_with_fixture() {
    let graph = simple_graph();
    assert_eq!(graph.node_count(), 2);
}
```

### 6.2 Parameterized Tests

**Pattern**: Run same test with different inputs

```rust
// Using rstest
use rstest::*;

#[rstest]
#[case("owl:Class", NodeType::OwlClass)]
#[case("rdfs:Class", NodeType::RdfsClass)]
#[case("owl:Thing", NodeType::OwlThing)]
fn test_parse_node_type(#[case] input: &str, #[case] expected: NodeType) {
    let node = parse_node_type(input).unwrap();
    assert_eq!(node.node_type, expected);
}
```

### 6.3 Test Builders

**Pattern**: Fluent API for test data

```rust
// Test builder for complex objects
pub struct NodeBuilder {
    id: String,
    label: Option<String>,
    position: Option<Vec2>,
}

impl NodeBuilder {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            label: None,
            position: None,
        }
    }

    pub fn with_label(mut self, label: &str) -> Self {
        self.label = Some(label.to_string());
        self
    }

    pub fn at_position(mut self, x: f64, y: f64) -> Self {
        self.position = Some(Vec2 { x, y });
        self
    }

    pub fn build(self) -> Node {
        Node {
            id: self.id,
            label: self.label.unwrap_or_else(|| self.id.clone()),
            position: self.position.unwrap_or_default(),
            ..Default::default()
        }
    }
}

// Use in tests
#[test]
fn test_with_builder() {
    let node = NodeBuilder::new("A")
        .with_label("Class A")
        .at_position(100.0, 200.0)
        .build();

    assert_eq!(node.label, "Class A");
}
```

---

## 7. Coverage Targets

### 7.1 Coverage Metrics

| Metric | Target | Tool |
|--------|--------|------|
| **Line Coverage** | 90%+ | `tarpaulin` |
| **Branch Coverage** | 85%+ | `tarpaulin` |
| **Function Coverage** | 95%+ | `tarpaulin` |
| **Integration Coverage** | 80%+ | Manual tracking |

### 7.2 Measuring Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Run coverage
cargo tarpaulin --all-features --workspace --out Html

# View report
open tarpaulin-report.html

# CI integration
cargo tarpaulin --out Xml
bash <(curl -s https://codecov.io/bash)
```

### 7.3 Coverage Exceptions

**Acceptable reasons for <90% coverage**:
- Error handling for truly rare scenarios
- Code that interfaces with browser APIs (test manually)
- Generated code (e.g., wasm-bindgen glue)
- Performance optimizations with SIMD (architecture-specific)

**Tag exceptions**:
```rust
#[cfg(not(tarpaulin_include))]
fn rare_error_path() {
    // This code is hard to test and rarely executed
}
```

---

## 8. Continuous Testing

### 8.1 Pre-Commit Hooks

```bash
# .git/hooks/pre-commit

#!/bin/bash
set -e

echo "Running tests..."
cargo test --all-features

echo "Running clippy..."
cargo clippy -- -D warnings

echo "Checking formatting..."
cargo fmt -- --check

echo "✅ All checks passed!"
```

### 8.2 CI Pipeline

```yaml
# .github/workflows/test.yml

name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Cache dependencies
        uses: actions/cache@v2
        with:
          path: |
            ~/.cargo
            target/
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Run tests
        run: cargo test --all-features --verbose

      - name: Run clippy
        run: cargo clippy -- -D warnings

      - name: Check formatting
        run: cargo fmt -- --check

      - name: Generate coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out Xml

      - name: Upload coverage
        uses: codecov/codecov-action@v1

  wasm-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: jetli/wasm-pack-action@v0.4.0

      - name: Run WASM tests
        run: wasm-pack test --headless --firefox

  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Run benchmarks
        run: cargo bench

      - name: Store benchmark results
        uses: benchmark-action/github-action-benchmark@v1
```

### 8.3 Watch Mode (Development)

```bash
# Install cargo-watch
cargo install cargo-watch

# Run tests on file change
cargo watch -x test

# Run specific test on change
cargo watch -x "test test_parser"

# Run with coverage
cargo watch -x "tarpaulin --out Stdout"
```

---

## 9. Test-Driven Development Workflow

### 9.1 Example TDD Session: Implementing Node Degree Filter

#### Step 1: RED - Write failing test

```rust
// vowl-filters/src/degree.rs

#[cfg(test)]
mod tests {
    use super::*;
    use vowl_graph::*;

    #[test]
    fn test_filter_hides_nodes_outside_degree_range() {
        // Arrange
        let mut graph = create_test_graph();
        let filter = NodeDegreeFilter::new(2, 3);

        // Act
        filter.apply(&mut graph);

        // Assert
        let visible = graph.visible_nodes();
        assert_eq!(visible.len(), 2); // Only nodes with degree 2-3
    }
}
```

**Result**: ❌ Test fails (NodeDegreeFilter doesn't exist yet)

#### Step 2: GREEN - Make it pass (minimal code)

```rust
// vowl-filters/src/degree.rs

pub struct NodeDegreeFilter {
    min: usize,
    max: usize,
}

impl NodeDegreeFilter {
    pub fn new(min: usize, max: usize) -> Self {
        Self { min, max }
    }

    pub fn apply(&self, graph: &mut Graph) {
        // Hardcoded to pass test
        for node in graph.nodes_mut() {
            let degree = graph.degree(node);
            node.set_visible(degree >= self.min && degree <= self.max);
        }
    }
}
```

**Result**: ✅ Test passes

#### Step 3: REFACTOR - Improve code

```rust
// Extract method
impl NodeDegreeFilter {
    fn node_should_be_visible(&self, degree: usize) -> bool {
        degree >= self.min && degree <= self.max
    }

    pub fn apply(&self, graph: &mut Graph) {
        for node in graph.nodes_mut() {
            let degree = graph.degree(node);
            node.set_visible(self.node_should_be_visible(degree));
        }
    }
}
```

**Result**: ✅ Tests still pass, code is cleaner

#### Step 4: Add more tests

```rust
#[test]
fn test_filter_shows_all_when_range_is_wide() {
    let mut graph = create_test_graph();
    let filter = NodeDegreeFilter::new(0, 100);

    filter.apply(&mut graph);

    assert_eq!(graph.visible_nodes().len(), graph.node_count());
}

#[test]
fn test_filter_hides_all_when_range_is_impossible() {
    let mut graph = create_test_graph();
    let filter = NodeDegreeFilter::new(100, 200);

    filter.apply(&mut graph);

    assert_eq!(graph.visible_nodes().len(), 0);
}
```

**Result**: Continue RED-GREEN-REFACTOR cycle

---

## 10. Testing Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Testing Implementation Details

```rust
// BAD: Test knows about internal field
#[test]
fn bad_test() {
    let filter = NodeDegreeFilter::new(1, 5);
    assert_eq!(filter.min, 1); // ❌ Couples test to internal structure
}

// GOOD: Test behavior
#[test]
fn good_test() {
    let filter = NodeDegreeFilter::new(1, 5);
    let mut graph = create_graph_with_degree(1);
    filter.apply(&mut graph);
    assert!(graph.nodes()[0].visible()); // ✅ Tests observable behavior
}
```

### ❌ Anti-Pattern 2: Overly Complex Tests

```rust
// BAD: Test does too much
#[test]
fn bad_kitchen_sink_test() {
    // 50 lines of setup...
    // Multiple behaviors tested...
    // Unclear what's being verified...
}

// GOOD: One behavior per test
#[test]
fn good_focused_test() {
    let graph = simple_graph();
    let result = graph.node_count();
    assert_eq!(result, 2);
}
```

### ❌ Anti-Pattern 3: Flaky Tests

```rust
// BAD: Depends on timing
#[test]
fn bad_timing_dependent() {
    let graph = compute_layout_async();
    std::thread::sleep(Duration::from_millis(100)); // ❌ Flaky!
    assert!(graph.is_stable());
}

// GOOD: Deterministic
#[test]
fn good_deterministic() {
    let graph = compute_layout_sync(100); // Explicit iterations
    assert!(graph.is_stable());
}
```

---

**Document Control:**
- Version: 1.0.0
- Last Updated: 2025-11-10
- Next Steps: Begin TDD implementation with coder agent
- Reviewers: Coder, Tester, Architect
