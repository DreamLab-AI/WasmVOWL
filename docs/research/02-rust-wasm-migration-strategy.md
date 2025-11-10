# Rust/WASM Migration Strategy for WebVOWL

## Executive Summary

This document outlines strategies, best practices, and recommended Rust crates for migrating WebVOWL from JavaScript/D3.js to Rust/WebAssembly while maintaining functionality and improving performance.

---

## 1. Migration Philosophy

### Hybrid Approach (Recommended)

**Phase 1:** Core data structures and algorithms in Rust
**Phase 2:** Incremental replacement of JavaScript modules
**Phase 3:** Pure Rust/WASM with minimal JS glue

**Rationale:**
- Minimize risk by keeping working components
- Validate performance gains incrementally
- Maintain compatibility during transition
- Allow parallel development

### Full Rewrite (Alternative)

**Pros:** Clean architecture, no JS baggage
**Cons:** High risk, longer timeline, feature parity challenges

---

## 2. Recommended Rust Crate Ecosystem

### 2.1 WASM Interop

#### wasm-bindgen (Essential)
```toml
[dependencies]
wasm-bindgen = "0.2"
```

**Purpose:** JavaScript/Rust interop layer
**Use Cases:**
- Export Rust functions to JS
- Import JS functions into Rust
- Handle complex types (strings, arrays, objects)

**Example:**
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OntologyParser {
    classes: Vec<OwlClass>,
}

#[wasm_bindgen]
impl OntologyParser {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { classes: Vec::new() }
    }

    pub fn parse_json(&mut self, json_str: &str) -> Result<(), JsValue> {
        // Parse ontology
        Ok(())
    }
}
```

#### web-sys (DOM Manipulation)
```toml
[dependencies]
web-sys = { version = "0.3", features = [
    "Document",
    "Element",
    "HtmlElement",
    "Node",
    "Window",
    "SvgElement",
    "SvgsvgElement",
    "SvgCircleElement",
    "SvgRectElement",
    "SvgPathElement",
    "SvgGElement",
    "EventTarget",
    "MouseEvent",
    "WheelEvent",
] }
```

**Purpose:** Direct DOM access from Rust
**Use Cases:**
- Create/modify SVG elements
- Handle events
- Query DOM

**Example:**
```rust
use web_sys::{Document, SvgCircleElement};

fn create_node_circle(doc: &Document, x: f64, y: f64, r: f64) -> SvgCircleElement {
    let circle = doc.create_element_ns(Some("http://www.w3.org/2000/svg"), "circle")
        .unwrap()
        .dyn_into::<SvgCircleElement>()
        .unwrap();

    circle.set_attribute("cx", &x.to_string()).unwrap();
    circle.set_attribute("cy", &y.to_string()).unwrap();
    circle.set_attribute("r", &r.to_string()).unwrap();
    circle.set_attribute("class", "owl-class").unwrap();

    circle
}
```

#### js-sys (JavaScript Standard Library)
```toml
[dependencies]
js-sys = "0.3"
```

**Purpose:** Access JS standard library types
**Use Cases:**
- Array, Object, Map, Set
- Date, Math, JSON
- Promise, Function

**Example:**
```rust
use js_sys::{Array, Object, Reflect, JSON};

fn parse_ontology_json(json_str: &str) -> Result<Object, JsValue> {
    let parsed = JSON::parse(json_str)?;
    Ok(Object::from(parsed))
}
```

---

### 2.2 Data Structures

#### serde + serde_json (JSON Parsing)
```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Purpose:** Serialize/deserialize ontology JSON
**Use Cases:**
- Parse OWL JSON format
- Export modified ontologies
- Configuration management

**Example:**
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OntologyHeader {
    pub title: MultiLanguageString,
    pub iri: String,
    pub version: Option<String>,
    pub author: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OwlClass {
    pub id: String,
    #[serde(rename = "type")]
    pub class_type: String,
    pub label: MultiLanguageString,
    pub iri: Option<String>,
    pub comment: Option<MultiLanguageString>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Ontology {
    pub header: OntologyHeader,
    pub namespace: Vec<Namespace>,
    pub class: Vec<OwlClass>,
    pub property: Vec<OwlProperty>,
}

// Parse
let ontology: Ontology = serde_json::from_str(json_str)?;
```

#### petgraph (Graph Algorithms)
```toml
[dependencies]
petgraph = "0.6"
```

**Purpose:** Graph data structure and algorithms
**Use Cases:**
- Represent ontology as graph
- Traverse class hierarchies
- Compute graph statistics
- Find paths, connected components

**Example:**
```rust
use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::algo::dijkstra;

pub struct OntologyGraph {
    graph: DiGraph<OwlClass, OwlProperty>,
    node_map: HashMap<String, NodeIndex>,
}

impl OntologyGraph {
    pub fn add_class(&mut self, class: OwlClass) -> NodeIndex {
        let idx = self.graph.add_node(class.clone());
        self.node_map.insert(class.id, idx);
        idx
    }

    pub fn add_property(&mut self, prop: OwlProperty) {
        let domain_idx = self.node_map[&prop.domain];
        let range_idx = self.node_map[&prop.range];
        self.graph.add_edge(domain_idx, range_idx, prop);
    }

    pub fn find_path(&self, from: &str, to: &str) -> Option<Vec<NodeIndex>> {
        let from_idx = self.node_map.get(from)?;
        let to_idx = self.node_map.get(to)?;
        // Use petgraph algorithms
        Some(vec![])
    }
}
```

#### hashbrown (Fast HashMap)
```toml
[dependencies]
hashbrown = "0.14"
```

**Purpose:** Faster HashMap implementation
**Use Cases:**
- Class/property lookups by ID
- Namespace prefix resolution
- Caching

---

### 2.3 Math and Physics (Force Layout)

#### nalgebra (Linear Algebra)
```toml
[dependencies]
nalgebra = "0.32"
```

**Purpose:** Vector math for force calculations
**Use Cases:**
- 2D/3D positions
- Force vectors
- Transformations (zoom, pan)

**Example:**
```rust
use nalgebra::{Vector2, Point2};

#[derive(Debug, Clone)]
pub struct Node {
    pub position: Point2<f64>,
    pub velocity: Vector2<f64>,
    pub force: Vector2<f64>,
    pub mass: f64,
}

impl Node {
    pub fn apply_force(&mut self, f: Vector2<f64>) {
        self.force += f;
    }

    pub fn update(&mut self, dt: f64) {
        let acceleration = self.force / self.mass;
        self.velocity += acceleration * dt;
        self.position += self.velocity * dt;
        self.force = Vector2::zeros(); // Reset forces
    }
}
```

#### rand (Random Number Generation)
```toml
[dependencies]
rand = "0.8"
```

**Purpose:** Initial node positioning
**Use Cases:**
- Random layout initialization
- Perturbations to escape local minima

**Example:**
```rust
use rand::Rng;

pub fn initialize_random_positions(nodes: &mut [Node], width: f64, height: f64) {
    let mut rng = rand::thread_rng();
    for node in nodes {
        node.position = Point2::new(
            rng.gen_range(0.0..width),
            rng.gen_range(0.0..height),
        );
    }
}
```

---

### 2.4 Web Framework (Optional)

#### yew (Rust Frontend Framework)
```toml
[dependencies]
yew = "0.21"
```

**Purpose:** Full Rust web application framework
**Use Cases:**
- Build entire UI in Rust
- Replace React/Vue-like architecture
- Virtual DOM rendering

**Example:**
```rust
use yew::prelude::*;

#[function_component(OntologyViewer)]
pub fn ontology_viewer() -> Html {
    let ontology_state = use_state(|| None);

    let on_load = {
        let ontology_state = ontology_state.clone();
        Callback::from(move |json: String| {
            // Parse ontology
            ontology_state.set(Some(parse_ontology(&json)));
        })
    };

    html! {
        <div class="ontology-viewer">
            <Sidebar ontology={(*ontology_state).clone()} />
            <GraphCanvas ontology={(*ontology_state).clone()} />
        </div>
    }
}
```

**Note:** May be overkill for incremental migration. Consider for full rewrite.

---

### 2.5 Logging and Debugging

#### console_error_panic_hook
```toml
[dependencies]
console_error_panic_hook = "0.1"
```

**Purpose:** Better panic messages in browser console

**Usage:**
```rust
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
```

#### wasm-logger
```toml
[dependencies]
log = "0.4"
wasm-logger = "0.2"
```

**Purpose:** Logging to browser console

**Example:**
```rust
use log::{info, warn, error};

#[wasm_bindgen(start)]
pub fn init() {
    wasm_logger::init(wasm_logger::Config::default());
    info!("WebVOWL WASM initialized");
}

pub fn parse_ontology(json: &str) {
    info!("Parsing ontology: {} bytes", json.len());
    // ...
    warn!("No namespace found, using default");
}
```

---

### 2.6 Performance Optimization

#### wee_alloc (Small Allocator)
```toml
[dependencies]
wee_alloc = "0.4"

[profile.release]
opt-level = "z"  # Optimize for size
lto = true       # Link-time optimization
```

**Purpose:** Reduce WASM binary size

**Usage:**
```rust
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
```

#### rayon (Parallelism - with caveats)
```toml
[dependencies]
rayon = "1.8"
```

**Note:** Limited WASM support. Use for computationally intensive algorithms that can be offloaded.

---

## 3. Architecture Design

### 3.1 Module Structure

```
webvowl-wasm/
├── Cargo.toml
└── src/
    ├── lib.rs              # WASM entry point
    ├── parser/
    │   ├── mod.rs
    │   ├── ontology.rs     # JSON parsing
    │   └── validator.rs    # OWL validation
    ├── graph/
    │   ├── mod.rs
    │   ├── node.rs         # Node types
    │   ├── property.rs     # Property types
    │   └── layout.rs       # Force-directed layout
    ├── render/
    │   ├── mod.rs
    │   ├── svg.rs          # SVG generation
    │   └── styles.rs       # Style application
    ├── filter/
    │   ├── mod.rs
    │   └── filters.rs      # Filter implementations
    └── utils/
        ├── mod.rs
        ├── math.rs         # Vector math utilities
        └── collections.rs  # Data structure helpers
```

### 3.2 Type Definitions

```rust
// lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WebVOWL {
    ontology: Option<Ontology>,
    graph: OntologyGraph,
    layout_engine: ForceLayout,
    filters: Vec<Box<dyn Filter>>,
}

#[wasm_bindgen]
impl WebVOWL {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        wasm_logger::init(wasm_logger::Config::default());

        Self {
            ontology: None,
            graph: OntologyGraph::new(),
            layout_engine: ForceLayout::default(),
            filters: Vec::new(),
        }
    }

    pub fn load_ontology(&mut self, json: &str) -> Result<(), JsValue> {
        let ontology: Ontology = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        self.graph = OntologyGraph::from_ontology(&ontology)?;
        self.ontology = Some(ontology);

        Ok(())
    }

    pub fn tick(&mut self, delta: f64) {
        self.layout_engine.tick(&mut self.graph, delta);
    }

    pub fn get_node_positions(&self) -> JsValue {
        let positions: Vec<_> = self.graph.nodes()
            .map(|(id, node)| {
                js_sys::Object::from_entries(&js_sys::Array::from_iter([
                    JsValue::from_str("id"), JsValue::from_str(id),
                    JsValue::from_str("x"), JsValue::from_f64(node.position.x),
                    JsValue::from_str("y"), JsValue::from_f64(node.position.y),
                ].iter())).unwrap()
            })
            .collect();

        JsValue::from(js_sys::Array::from_iter(positions.iter()))
    }

    pub fn apply_filter(&mut self, filter_name: &str, enabled: bool) {
        // Apply filter
    }
}
```

---

## 4. Force-Directed Layout in Pure Rust

### 4.1 Barnes-Hut Algorithm (Faster than D3)

```rust
use nalgebra::{Point2, Vector2};

pub struct ForceLayout {
    charge_strength: f64,
    link_strength: f64,
    center_strength: f64,
    alpha: f64,
    alpha_decay: f64,
    alpha_min: f64,
}

impl ForceLayout {
    pub fn tick(&mut self, graph: &mut OntologyGraph, _delta: f64) {
        if self.alpha < self.alpha_min {
            return;
        }

        // Reset forces
        for node in graph.nodes_mut() {
            node.force = Vector2::zeros();
        }

        // Apply forces
        self.apply_center_force(graph);
        self.apply_charge_force(graph);
        self.apply_link_force(graph);

        // Update positions
        for node in graph.nodes_mut() {
            node.update(self.alpha);
        }

        self.alpha *= 1.0 - self.alpha_decay;
    }

    fn apply_charge_force(&self, graph: &mut OntologyGraph) {
        let nodes: Vec<_> = graph.nodes().collect();

        for i in 0..nodes.len() {
            for j in (i + 1)..nodes.len() {
                let delta = nodes[j].position - nodes[i].position;
                let distance = delta.norm().max(1.0);
                let strength = self.charge_strength / (distance * distance);
                let force = delta.normalize() * strength;

                graph.get_node_mut(&nodes[i].id).unwrap().apply_force(-force);
                graph.get_node_mut(&nodes[j].id).unwrap().apply_force(force);
            }
        }
    }

    fn apply_link_force(&self, graph: &mut OntologyGraph) {
        for edge in graph.edges() {
            let source = graph.get_node(&edge.source).unwrap();
            let target = graph.get_node(&edge.target).unwrap();

            let delta = target.position - source.position;
            let distance = delta.norm();
            let target_distance = edge.target_distance;
            let strength = self.link_strength * (distance - target_distance) / distance;
            let force = delta * strength;

            graph.get_node_mut(&edge.source).unwrap().apply_force(force);
            graph.get_node_mut(&edge.target).unwrap().apply_force(-force);
        }
    }

    fn apply_center_force(&self, graph: &mut OntologyGraph) {
        let center = graph.center();
        for node in graph.nodes_mut() {
            let force = (center - node.position) * self.center_strength;
            node.apply_force(force);
        }
    }
}
```

**Performance Benefits:**
- No JavaScript overhead
- Direct memory access
- SIMD optimizations (with target features)
- Potential parallelization

---

## 5. Interop Strategies

### 5.1 Hybrid Rendering (Phase 1)

**Rust:** Data structures, algorithms, filtering
**JavaScript:** D3 rendering, event handling

```javascript
// main.js
import init, { WebVOWL } from './webvowl_wasm.js';

async function main() {
    await init();

    const vowl = new WebVOWL();

    // Load ontology (Rust)
    const response = await fetch('data/foaf.json');
    const json = await response.text();
    vowl.load_ontology(json);

    // Render with D3 (JavaScript)
    function render() {
        const positions = vowl.get_node_positions();

        d3.selectAll('.node')
            .data(positions)
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        vowl.tick(16); // ~60 FPS
        requestAnimationFrame(render);
    }

    render();
}
```

### 5.2 Full WASM Rendering (Phase 3)

**All in Rust:** Full control over rendering

```rust
use web_sys::{Document, SvgsvgElement, SvgCircleElement};

pub struct SvgRenderer {
    document: Document,
    svg: SvgsvgElement,
}

impl SvgRenderer {
    pub fn new() -> Result<Self, JsValue> {
        let window = web_sys::window().unwrap();
        let document = window.document().unwrap();
        let svg = document.get_element_by_id("graph")
            .unwrap()
            .dyn_into::<SvgsvgElement>()?;

        Ok(Self { document, svg })
    }

    pub fn render_graph(&self, graph: &OntologyGraph) -> Result<(), JsValue> {
        // Clear existing elements
        self.clear();

        // Render links
        for edge in graph.edges() {
            self.render_link(edge)?;
        }

        // Render nodes
        for (id, node) in graph.nodes() {
            self.render_node(id, node)?;
        }

        Ok(())
    }

    fn render_node(&self, id: &str, node: &Node) -> Result<(), JsValue> {
        let circle = self.document
            .create_element_ns(Some("http://www.w3.org/2000/svg"), "circle")?
            .dyn_into::<SvgCircleElement>()?;

        circle.set_attribute("id", &format!("node-{}", id))?;
        circle.set_attribute("cx", &node.position.x.to_string())?;
        circle.set_attribute("cy", &node.position.y.to_string())?;
        circle.set_attribute("r", &node.radius.to_string())?;
        circle.set_attribute("class", &node.css_class())?;

        self.svg.append_child(&circle)?;

        Ok(())
    }

    fn clear(&self) {
        while let Some(child) = self.svg.first_child() {
            self.svg.remove_child(&child).unwrap();
        }
    }
}
```

---

## 6. Memory Management

### 6.1 Ownership Model

```rust
pub struct OntologyGraph {
    nodes: HashMap<String, Node>,           // Owned nodes
    edges: Vec<Edge>,                       // Owned edges
    node_index: HashMap<String, usize>,     // Fast lookup
}

pub struct Edge {
    id: String,
    source: String,  // Reference by ID, not pointer
    target: String,
    property: Property,
}

// No circular references!
// All lookups by ID, not Rc<RefCell<>>
```

**Benefits:**
- No garbage collection
- Predictable performance
- Safe concurrency (if needed)

### 6.2 Avoiding Clones

```rust
// Bad: Expensive clones
pub fn get_node(&self, id: &str) -> Option<Node> {
    self.nodes.get(id).cloned()  // Clone entire node
}

// Good: Borrow
pub fn get_node(&self, id: &str) -> Option<&Node> {
    self.nodes.get(id)  // Borrow reference
}

// Good: Mutable borrow
pub fn get_node_mut(&mut self, id: &str) -> Option<&mut Node> {
    self.nodes.get_mut(id)
}
```

---

## 7. Performance Optimization Tips

### 7.1 WASM Optimization Flags

```toml
[profile.release]
opt-level = 3          # Maximum optimization
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization
panic = "abort"        # Smaller binary
```

### 7.2 SIMD Acceleration

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O4", "--enable-simd"]
```

**Note:** Requires browser support for WASM SIMD.

### 7.3 Minimize wasm-bindgen Overhead

```rust
// Bad: Frequent boundary crossings
for node in nodes {
    update_node_position(node.id, node.x, node.y);  // JS call each iteration
}

// Good: Batch updates
let positions = nodes.iter()
    .map(|n| (n.id.clone(), n.x, n.y))
    .collect();
update_all_positions(positions);  // Single JS call
```

---

## 8. Testing Strategy

### 8.1 Unit Tests in Rust

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ontology() {
        let json = r#"{"class": [{"id": "1", "type": "owl:Class"}]}"#;
        let ontology: Ontology = serde_json::from_str(json).unwrap();
        assert_eq!(ontology.class.len(), 1);
    }

    #[test]
    fn test_force_layout() {
        let mut layout = ForceLayout::default();
        let mut graph = OntologyGraph::new();
        // ... add nodes
        layout.tick(&mut graph, 0.016);
        // Assert positions changed
    }
}
```

### 8.2 Browser Testing

```bash
wasm-pack test --headless --chrome
```

### 8.3 Benchmarking

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_force_layout(c: &mut Criterion) {
    let mut graph = create_test_graph(100);
    let mut layout = ForceLayout::default();

    c.bench_function("force_layout_100_nodes", |b| {
        b.iter(|| layout.tick(black_box(&mut graph), 0.016));
    });
}

criterion_group!(benches, bench_force_layout);
criterion_main!(benches);
```

---

## 9. Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up Rust project with wasm-pack
- Implement core data structures (Node, Property, Ontology)
- Parser for OWL JSON format
- Basic graph representation
- Unit tests

### Phase 2: Algorithm Port (Weeks 3-4)
- Force-directed layout in Rust
- Graph algorithms (traversal, statistics)
- Comparison benchmarks vs. D3

### Phase 3: Hybrid Integration (Weeks 5-6)
- WASM module exports
- JavaScript interop layer
- Replace parser with WASM
- Keep D3 for rendering

### Phase 4: Incremental Replacement (Weeks 7-10)
- Filter modules in Rust
- SVG rendering in Rust (optional)
- Event handling
- State management

### Phase 5: Polish (Weeks 11-12)
- Performance optimization
- Bundle size reduction
- Browser compatibility testing
- Documentation

---

## 10. Potential Performance Gains

### Expected Improvements

| Component | JavaScript | Rust/WASM | Speedup |
|-----------|------------|-----------|---------|
| JSON Parsing | 100ms | 15ms | **6-7x** |
| Force Layout (per tick) | 8ms | 1-2ms | **4-6x** |
| Graph Traversal | 5ms | 0.5ms | **10x** |
| Filter Application | 20ms | 3ms | **6-7x** |

**Overall:** Expect 3-5x performance improvement for large ontologies (>500 nodes).

---

## 11. Challenges and Mitigations

### Challenge 1: D3.js Dependency
**Mitigation:** Keep D3 for initial rendering, port incrementally

### Challenge 2: DOM Manipulation Overhead
**Mitigation:** Use virtual DOM diffing, batch updates

### Challenge 3: Debugging WASM
**Mitigation:** Extensive logging, browser DevTools WASM support

### Challenge 4: Bundle Size
**Mitigation:** wee_alloc, opt-level=z, code splitting

### Challenge 5: Browser Compatibility
**Mitigation:** Polyfills, progressive enhancement, fallback to JS

---

## 12. Conclusion

Migrating WebVOWL to Rust/WASM is feasible with:
✅ Modern wasm-bindgen tooling
✅ Rich Rust crate ecosystem
✅ Incremental migration strategy
✅ Expected 3-5x performance gains

**Recommended Starting Point:**
1. Port parser (serde_json)
2. Port force layout (nalgebra)
3. Benchmark and iterate

**Key Success Factor:** Maintain feature parity while incrementally replacing components.
