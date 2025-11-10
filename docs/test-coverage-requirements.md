# Test Coverage Requirements for WebVOWL WASM Port

**Version**: 2.0.0
**Methodology**: London TDD (Outside-In, Mock-based)
**Target Coverage**: >90% for all modules
**Testing Framework**: Rust (cargo test) + WASM (wasm-bindgen-test)

## Testing Methodology: London School TDD

### Principles

1. **Outside-In Development**: Start with user-facing behavior
2. **Mock Collaborators**: Test units in isolation
3. **Discover Design**: Let tests drive architecture
4. **Fast Feedback**: Unit tests should run in <1 second

### London TDD Workflow

```
1. Write failing acceptance test (end-to-end)
   ↓
2. Write failing unit test for next layer
   ↓
3. Implement minimum code to pass
   ↓
4. Refactor
   ↓
5. Repeat until acceptance test passes
```

## Test Levels

### 1. Unit Tests (London Style)

**Coverage Target**: 95%
**Test Doubles**: Mocks, Stubs, Fakes

**Location**: `src/*/tests.rs` or `#[cfg(test)] mod tests`

**Example**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::*;

    // Mock trait for Parser
    mock! {
        Parser {}
        trait Parser {
            fn parse_ontology(&self, json: &Value) -> Result<OntologyData>;
        }
    }

    #[test]
    fn graph_loads_ontology_via_parser() {
        // Arrange
        let mut mock_parser = MockParser::new();
        mock_parser
            .expect_parse_ontology()
            .times(1)
            .returning(|_| Ok(OntologyData::default()));

        let mut graph = Graph::new_with_parser(mock_parser);

        // Act
        let result = graph.load_ontology(r#"{"classes":[]}"#);

        // Assert
        assert!(result.is_ok());
    }
}
```

### 2. Integration Tests

**Coverage Target**: 85%
**Location**: `tests/*.rs`

**Example**:
```rust
// tests/parser_integration.rs
use webvowl::Parser;

#[test]
fn parse_foaf_ontology() {
    let json = std::fs::read_to_string("fixtures/foaf.json").unwrap();
    let parser = Parser::new();

    let result = parser.parse_ontology(&json);

    assert!(result.is_ok());
    let data = result.unwrap();
    assert_eq!(data.classes.len(), 15);
    assert_eq!(data.properties.len(), 67);
}
```

### 3. WASM Tests

**Coverage Target**: 90%
**Location**: `tests/wasm/*.rs`

**Example**:
```rust
// tests/wasm/api_tests.rs
use wasm_bindgen_test::*;
use webvowl::WebVOWL;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
async fn test_load_ontology() {
    let webvowl = WebVOWL::new("#container", JsValue::NULL).unwrap();
    let result = webvowl.load(json!({
        "classes": [],
        "properties": []
    })).await;

    assert!(result.is_ok());
}
```

### 4. Acceptance Tests (End-to-End)

**Coverage Target**: Key user flows
**Location**: `tests/acceptance/*.rs`

**Example**:
```rust
// tests/acceptance/visualize_ontology.rs
#[wasm_bindgen_test]
async fn user_can_visualize_foaf_ontology() {
    // Given a WebVOWL instance
    let webvowl = WebVOWL::new("#container", default_options()).unwrap();

    // When user loads FOAF ontology
    webvowl.load(foaf_ontology()).await.unwrap();
    webvowl.start();

    // Then graph is rendered
    assert!(webvowl.is_rendered());
    assert_eq!(webvowl.node_count(), 15);

    // And user can interact
    let node = webvowl.get_node_at(100.0, 100.0);
    assert!(node.is_some());
}
```

## Coverage Requirements by Module

### Core Modules

#### 1. Parser (`core/parser.rs`)
**Target**: 95%

**Test Cases**:
```rust
// Unit tests
#[test] fn parses_valid_json_ontology() { }
#[test] fn rejects_invalid_json() { }
#[test] fn parses_owl_classes() { }
#[test] fn parses_owl_properties() { }
#[test] fn parses_owl_individuals() { }
#[test] fn handles_missing_fields() { }
#[test] fn parses_labels_in_multiple_languages() { }
#[test] fn resolves_class_hierarchies() { }
#[test] fn handles_circular_dependencies() { }
#[test] fn parses_property_domains_and_ranges() { }

// Edge cases
#[test] fn handles_empty_ontology() { }
#[test] fn handles_very_large_ontology() { }
#[test] fn handles_malformed_iris() { }
```

**Mocks Required**:
- None (pure function tests)

#### 2. Graph (`core/graph.rs`)
**Target**: 92%

**Test Cases**:
```rust
// Unit tests (with mocked Parser and Renderer)
#[test] fn creates_graph_with_container() { }
#[test] fn loads_ontology_via_parser() { }
#[test] fn starts_force_simulation() { }
#[test] fn stops_simulation() { }
#[test] fn resets_graph_state() { }
#[test] fn applies_filters_to_elements() { }
#[test] fn updates_layout_each_tick() { }
#[test] fn notifies_listeners_on_events() { }

// Edge cases
#[test] fn handles_invalid_container_selector() { }
#[test] fn gracefully_handles_load_failure() { }
```

**Mocks Required**:
- `MockParser` - Simulate ontology parsing
- `MockRenderer` - Verify rendering calls
- `MockForceLayout` - Control simulation

#### 3. Force Layout (`core/force_layout.rs`)
**Target**: 95%

**Test Cases**:
```rust
#[test] fn initializes_with_parameters() { }
#[test] fn calculates_repulsion_forces() { }
#[test] fn calculates_attraction_forces() { }
#[test] fn applies_gravity() { }
#[test] fn integrates_forces_to_positions() { }
#[test] fn converges_to_stable_state() { }
#[test] fn uses_barnes_hut_for_large_graphs() { }

// Performance tests
#[test] fn completes_100_iterations_in_reasonable_time() { }
```

**Mocks Required**:
- None (pure calculations)

#### 4. Options (`core/options.rs`)
**Target**: 100%

**Test Cases**:
```rust
#[test] fn creates_with_defaults() { }
#[test] fn parses_from_js_value() { }
#[test] fn validates_dimensions() { }
#[test] fn validates_gravity_parameters() { }
#[test] fn enables_modules_selectively() { }

// Edge cases
#[test] fn rejects_negative_dimensions() { }
#[test] fn rejects_invalid_language_code() { }
```

### Element System

#### 5. Node Implementations (`elements/nodes/`)
**Target**: 90% per implementation

**Test Cases** (for each node type):
```rust
#[test] fn creates_from_parsed_data() { }
#[test] fn provides_correct_element_type() { }
#[test] fn returns_iri() { }
#[test] fn returns_labels() { }
#[test] fn generates_render_data() { }
#[test] fn calculates_correct_radius() { }
#[test] fn applies_correct_color() { }
```

**Example for `OwlClass`**:
```rust
#[test]
fn owl_class_renders_as_circle() {
    let class = OwlClass {
        id: "test".into(),
        iri: "http://example.org/Class".into(),
        labels: HashMap::new(),
        radius: 30.0,
    };

    let render_data = class.render_data();

    assert_eq!(render_data.shape, Shape::Circle);
    assert_eq!(render_data.radius, 30.0);
}
```

#### 6. Property Implementations (`elements/properties/`)
**Target**: 90% per implementation

**Test Cases** (for each property type):
```rust
#[test] fn creates_from_parsed_data() { }
#[test] fn provides_correct_property_type() { }
#[test] fn returns_domain_and_range() { }
#[test] fn generates_link_render_data() { }
```

### Module System

#### 7. Filter Modules (`modules/filters/`)
**Target**: 95% per filter

**Test Cases Template**:
```rust
#[test] fn starts_disabled() { }
#[test] fn can_be_enabled() { }
#[test] fn can_be_disabled() { }
#[test] fn can_be_toggled() { }
#[test] fn filters_correct_elements_when_enabled() { }
#[test] fn passes_all_elements_when_disabled() { }
```

**Example for `DatatypeFilter`**:
```rust
#[test]
fn datatype_filter_removes_datatype_properties() {
    let mut filter = DatatypeFilter::new();
    filter.enable();

    let elements: Vec<&dyn Element> = vec![
        &owl_class,
        &datatype_property,
        &object_property,
    ];

    let filtered = filter.apply(&elements);

    assert_eq!(filtered.len(), 2); // Only class and object property
    assert!(!filtered.iter().any(|e|
        matches!(e.element_type(), ElementType::DatatypeProperty)
    ));
}
```

#### 8. Visual Modules (`modules/visual/`)
**Target**: 90%

**Test Cases**:
```rust
#[test] fn color_externals_applies_color() { }
#[test] fn compact_notation_shortens_labels() { }
#[test] fn node_scaling_adjusts_by_importance() { }
```

#### 9. Interactive Modules (`modules/interactive/`)
**Target**: 85%

**Test Cases**:
```rust
#[test] fn focuser_highlights_target_node() { }
#[test] fn focuser_dims_other_nodes() { }
#[test] fn pick_and_pin_fixes_node_position() { }
#[test] fn statistics_calculates_correct_counts() { }
```

**Mocks Required**:
- `MockGraph` - Simulate graph state

### Rendering System

#### 10. SVG Generator (`rendering/svg_generator.rs`)
**Target**: 90%

**Test Cases**:
```rust
#[test] fn generates_valid_svg_document() { }
#[test] fn creates_circle_for_round_node() { }
#[test] fn creates_path_for_link() { }
#[test] fn applies_correct_styling() { }
#[test] fn includes_all_nodes() { }
#[test] fn includes_all_links() { }
```

**Example**:
```rust
#[test]
fn generates_circle_element_for_node() {
    let generator = SvgGenerator::new();
    let node = create_test_node();

    let svg = generator.generate_node_element(&node);

    assert!(svg.contains("<circle"));
    assert!(svg.contains("cx=\"100\""));
    assert!(svg.contains("cy=\"150\""));
    assert!(svg.contains("r=\"30\""));
}
```

#### 11. DOM Bridge (`rendering/dom_bridge.rs`)
**Target**: 85%

**Test Cases**:
```rust
#[wasm_bindgen_test]
fn creates_svg_element() { }

#[wasm_bindgen_test]
fn appends_nodes_to_container() { }

#[wasm_bindgen_test]
fn updates_existing_elements() { }

#[wasm_bindgen_test]
fn removes_elements() { }
```

### Interaction System

#### 12. Drag Handler (`interaction/drag_handler.rs`)
**Target**: 85%

**Test Cases**:
```rust
#[wasm_bindgen_test]
fn handles_drag_start() { }

#[wasm_bindgen_test]
fn updates_position_during_drag() { }

#[wasm_bindgen_test]
fn handles_drag_end() { }

#[wasm_bindgen_test]
fn prevents_default_browser_behavior() { }
```

#### 13. Zoom Handler (`interaction/zoom_handler.rs`)
**Target**: 85%

**Test Cases**:
```rust
#[wasm_bindgen_test]
fn handles_wheel_zoom() { }

#[wasm_bindgen_test]
fn handles_pinch_zoom() { }

#[wasm_bindgen_test]
fn clamps_zoom_to_limits() { }

#[wasm_bindgen_test]
fn updates_transform() { }
```

### WASM API

#### 14. WebVOWL Class (`wasm/bindings.rs`)
**Target**: 95%

**Test Cases**:
```rust
#[wasm_bindgen_test]
fn creates_instance() { }

#[wasm_bindgen_test]
async fn loads_from_url() { }

#[wasm_bindgen_test]
async fn loads_from_json() { }

#[wasm_bindgen_test]
fn starts_visualization() { }

#[wasm_bindgen_test]
fn stops_visualization() { }

#[wasm_bindgen_test]
fn resets_visualization() { }

#[wasm_bindgen_test]
async fn exports_svg() { }

#[wasm_bindgen_test]
fn registers_event_listener() { }
```

## Test Organization

### Directory Structure

```
tests/
├── unit/                  # Unit tests (London style)
│   ├── parser_tests.rs
│   ├── graph_tests.rs
│   ├── force_layout_tests.rs
│   └── ...
├── integration/           # Integration tests
│   ├── parsing_integration.rs
│   ├── rendering_integration.rs
│   └── ...
├── wasm/                  # WASM-specific tests
│   ├── api_tests.rs
│   ├── interaction_tests.rs
│   └── ...
├── acceptance/            # End-to-end tests
│   ├── visualize_ontology.rs
│   ├── filter_elements.rs
│   └── export_svg.rs
├── fixtures/              # Test data
│   ├── foaf.json
│   ├── sioc.json
│   └── ...
└── helpers/              # Test utilities
    ├── mock_builders.rs
    ├── assertions.rs
    └── ...
```

## Test Data Fixtures

### Required Test Ontologies

1. **foaf.json** - Small ontology (15 classes, 67 properties)
2. **sioc.json** - Medium ontology (87 classes, 134 properties)
3. **goodrelations.json** - Large ontology (356 classes, 289 properties)
4. **minimal.json** - Minimal valid ontology
5. **invalid.json** - Invalid JSON for error testing
6. **empty.json** - Empty ontology
7. **malformed.json** - Malformed structure

## Test Utilities

### Mock Builders

```rust
// tests/helpers/mock_builders.rs

pub struct NodeBuilder {
    id: String,
    iri: String,
    labels: HashMap<String, String>,
    radius: f64,
}

impl NodeBuilder {
    pub fn new() -> Self {
        Self {
            id: "test-node".into(),
            iri: "http://example.org/Node".into(),
            labels: HashMap::new(),
            radius: 30.0,
        }
    }

    pub fn with_id(mut self, id: &str) -> Self {
        self.id = id.into();
        self
    }

    pub fn with_label(mut self, lang: &str, label: &str) -> Self {
        self.labels.insert(lang.into(), label.into());
        self
    }

    pub fn build(self) -> OwlClass {
        OwlClass {
            id: self.id,
            iri: self.iri,
            labels: self.labels,
            radius: self.radius,
        }
    }
}
```

### Custom Assertions

```rust
// tests/helpers/assertions.rs

pub fn assert_valid_svg(svg: &str) {
    assert!(svg.starts_with("<svg"));
    assert!(svg.ends_with("</svg>"));
    assert!(svg.contains("xmlns=\"http://www.w3.org/2000/svg\""));
}

pub fn assert_graph_rendered(webvowl: &WebVOWL) {
    assert!(webvowl.node_count() > 0);
    assert!(webvowl.is_rendered());
}
```

## Coverage Measurement

### Tools

```bash
# Install tarpaulin for coverage
cargo install cargo-tarpaulin

# Run coverage
cargo tarpaulin --out Html --output-dir coverage

# Run with all features
cargo tarpaulin --all-features --out Html

# Exclude tests directory
cargo tarpaulin --exclude-files 'tests/*'
```

### CI Integration

```yaml
# .github/workflows/test.yml
name: Test Coverage

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install tarpaulin
        run: cargo install cargo-tarpaulin

      - name: Run tests with coverage
        run: cargo tarpaulin --out Xml --all-features

      - name: Upload to codecov
        uses: codecov/codecov-action@v3
        with:
          files: cobertura.xml

      - name: Verify coverage threshold
        run: |
          coverage=$(cargo tarpaulin --print-summary | grep -oP '\d+\.\d+')
          if (( $(echo "$coverage < 90" | bc -l) )); then
            echo "Coverage $coverage% is below 90% threshold"
            exit 1
          fi
```

## Performance Benchmarks

```rust
// benches/parsing_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_parse_foaf(c: &mut Criterion) {
    let json = include_str!("../tests/fixtures/foaf.json");
    let parser = Parser::new();

    c.bench_function("parse foaf", |b| {
        b.iter(|| parser.parse_ontology(black_box(json)))
    });
}

criterion_group!(benches, bench_parse_foaf);
criterion_main!(benches);
```

## Test Execution

```bash
# Run all tests
cargo test

# Run unit tests only
cargo test --lib

# Run integration tests
cargo test --test '*'

# Run WASM tests
wasm-pack test --chrome --headless

# Run benchmarks
cargo bench

# Run with verbose output
cargo test -- --nocapture

# Run specific test
cargo test test_parser_handles_empty_ontology
```

## Coverage Goals Summary

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| Parser | 95% | Critical |
| Graph | 92% | Critical |
| Force Layout | 95% | Critical |
| Node Implementations | 90% | High |
| Property Implementations | 90% | High |
| Filter Modules | 95% | High |
| Visual Modules | 90% | Medium |
| Interactive Modules | 85% | Medium |
| Rendering | 90% | High |
| WASM API | 95% | Critical |
| Utilities | 95% | Medium |

**Overall Target**: >90% code coverage across all modules

## Conclusion

This comprehensive test strategy ensures:

1. **High Quality**: >90% code coverage
2. **Fast Feedback**: London TDD approach
3. **Confidence**: Extensive acceptance tests
4. **Maintainability**: Well-organized test suite
5. **Documentation**: Tests serve as living documentation

All tests must pass before merging to main branch.
