# Rust Module Mapping for WebVOWL Port

**Purpose**: Map JavaScript modules to proposed Rust crate structure
**Date**: 2025-11-10

## Crate Structure Overview

```
webvowl-wasm/
├── Cargo.toml
├── src/
│   ├── lib.rs                 # Main library entry point
│   ├── core/
│   │   ├── mod.rs
│   │   ├── graph.rs           # graph.js → Core graph engine
│   │   ├── parser.rs          # parser.js → OWL parser
│   │   ├── options.rs         # options.js → Configuration
│   │   └── force_layout.rs    # D3 force layout → Rust implementation
│   ├── elements/
│   │   ├── mod.rs
│   │   ├── base_element.rs    # BaseElement.js
│   │   ├── nodes/
│   │   │   ├── mod.rs
│   │   │   ├── base_node.rs   # BaseNode.js
│   │   │   ├── round_node.rs  # RoundNode.js
│   │   │   └── impls/         # All node implementations
│   │   │       ├── owl_thing.rs
│   │   │       ├── owl_class.rs
│   │   │       ├── owl_union.rs
│   │   │       └── ...
│   │   ├── properties/
│   │   │   ├── mod.rs
│   │   │   ├── base_property.rs
│   │   │   └── impls/
│   │   │       ├── object_property.rs
│   │   │       ├── datatype_property.rs
│   │   │       └── ...
│   │   └── links/
│   │       ├── mod.rs
│   │       └── base_link.rs
│   ├── modules/
│   │   ├── mod.rs
│   │   ├── filters/
│   │   │   ├── mod.rs
│   │   │   ├── datatype_filter.rs
│   │   │   ├── disjoint_filter.rs
│   │   │   ├── node_degree_filter.rs
│   │   │   ├── object_property_filter.rs
│   │   │   ├── set_operator_filter.rs
│   │   │   └── subclass_filter.rs
│   │   ├── visual/
│   │   │   ├── mod.rs
│   │   │   ├── color_externals.rs
│   │   │   ├── compact_notation.rs
│   │   │   └── node_scaling.rs
│   │   └── interactive/
│   │       ├── mod.rs
│   │       ├── focuser.rs
│   │       ├── pick_and_pin.rs
│   │       ├── selection_details.rs
│   │       └── statistics.rs
│   ├── util/
│   │   ├── mod.rs
│   │   ├── constants.rs       # constants.js
│   │   ├── language_tools.rs  # languageTools.js
│   │   ├── element_tools.rs   # elementTools.js
│   │   ├── prefix_tools.rs    # prefixRepresentationModule.js
│   │   └── math.rs           # math.js
│   ├── rendering/
│   │   ├── mod.rs
│   │   ├── svg_generator.rs   # Generate SVG from Rust
│   │   ├── dom_bridge.rs      # web-sys DOM manipulation
│   │   └── style_manager.rs   # CSS styling
│   ├── interaction/
│   │   ├── mod.rs
│   │   ├── drag_handler.rs    # classDragger.js, domainDragger.js, etc.
│   │   ├── zoom_handler.rs    # D3 zoom behavior
│   │   └── event_manager.rs   # Event delegation system
│   └── wasm/
│       ├── mod.rs
│       ├── bindings.rs        # WASM bindgen interfaces
│       └── js_api.rs          # JavaScript API compatibility layer
├── tests/
│   ├── integration/
│   │   ├── parsing_tests.rs
│   │   ├── rendering_tests.rs
│   │   └── interaction_tests.rs
│   └── unit/
│       ├── graph_tests.rs
│       ├── parser_tests.rs
│       └── module_tests.rs
└── benches/
    ├── parsing_bench.rs
    ├── layout_bench.rs
    └── rendering_bench.rs
```

## Detailed Module Mapping

### 1. Core Modules

#### 1.1 `lib.rs` ← `entry.js`

**Purpose**: Main entry point and public API

**Rust Structure**:
```rust
// lib.rs
use wasm_bindgen::prelude::*;

pub mod core;
pub mod elements;
pub mod modules;
pub mod util;
pub mod rendering;
pub mod interaction;
pub mod wasm;

// Re-export main types
pub use crate::core::{Graph, Parser, Options};
pub use crate::wasm::bindings::WebVOWL;

// Version constant
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

// WASM initialization
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages
    console_error_panic_hook::set_once();
}
```

#### 1.2 `core/graph.rs` ← `graph.js`

**JavaScript Lines**: ~3400 lines
**Rust Implementation**: Split into multiple files

**Structure**:
```rust
// core/graph.rs
use web_sys::{Element, HtmlElement};
use crate::core::force_layout::ForceLayout;
use crate::elements::{Node, Property};

pub struct Graph {
    container: HtmlElement,
    nodes: Vec<Node>,
    links: Vec<Link>,
    properties: Vec<Property>,
    layout: ForceLayout,
    options: Options,
    state: GraphState,
}

impl Graph {
    pub fn new(selector: &str, options: Options) -> Result<Self, JsValue> {
        // Initialize graph
    }

    pub fn load(&mut self, data: &JsValue) -> Result<(), JsValue> {
        // Parse and load ontology
    }

    pub fn start(&mut self) {
        // Start force simulation
    }

    pub fn stop(&mut self) {
        // Pause simulation
    }

    pub fn reset(&mut self) {
        // Reset to initial state
    }

    pub fn render(&mut self) {
        // Render nodes and links
    }
}
```

#### 1.3 `core/parser.rs` ← `parser.js`

**Purpose**: Parse OWL ontologies from JSON

**Key Functions**:
```rust
// core/parser.rs
use serde_json::Value;
use crate::elements::{Node, Property};

pub struct Parser {
    node_map: HashMap<String, Box<dyn NodePrototype>>,
    property_map: HashMap<String, Box<dyn PropertyPrototype>>,
}

impl Parser {
    pub fn parse_ontology(&self, json: &Value) -> Result<OntologyData, ParseError> {
        // Parse classes, properties, individuals
    }

    pub fn parse_classes(&self, classes: &Value) -> Vec<Node> {
        // Parse class definitions
    }

    pub fn parse_properties(&self, properties: &Value) -> Vec<Property> {
        // Parse property definitions
    }

    pub fn parse_settings(&self, settings: &Value) -> Settings {
        // Parse visualization settings
    }
}
```

#### 1.4 `core/force_layout.rs` ← D3.js force layout

**Purpose**: Rust implementation of force-directed layout

**Key Algorithms**:
```rust
// core/force_layout.rs
use nalgebra::{Vector2, Point2};

pub struct ForceLayout {
    nodes: Vec<LayoutNode>,
    links: Vec<LayoutLink>,
    params: ForceParams,
    alpha: f64,
}

pub struct ForceParams {
    pub charge: f64,
    pub link_distance: f64,
    pub link_strength: f64,
    pub gravity: f64,
    pub friction: f64,
}

impl ForceLayout {
    pub fn new(params: ForceParams) -> Self {
        // Initialize layout
    }

    pub fn tick(&mut self) -> bool {
        // Run one simulation step
        self.apply_forces();
        self.integrate();
        self.update_alpha();
        self.alpha > 0.01 // Continue if not converged
    }

    fn apply_forces(&mut self) {
        // Calculate forces
        self.apply_charge_force();
        self.apply_link_force();
        self.apply_gravity_force();
    }

    fn apply_charge_force(&mut self) {
        // Node repulsion using Barnes-Hut or brute force
    }

    fn apply_link_force(&mut self) {
        // Link attraction
    }

    fn integrate(&mut self) {
        // Update positions
    }
}
```

### 2. Element Modules

#### 2.1 Base Element Structure

**JavaScript Pattern**: Prototypal inheritance
**Rust Pattern**: Trait-based polymorphism

```rust
// elements/base_element.rs
pub trait Element {
    fn id(&self) -> &str;
    fn element_type(&self) -> ElementType;
    fn iri(&self) -> &str;
    fn labels(&self) -> &HashMap<String, String>;
    fn render_data(&self) -> RenderData;
}

// elements/nodes/base_node.rs
pub trait Node: Element {
    fn radius(&self) -> f64;
    fn position(&self) -> Point2<f64>;
    fn set_position(&mut self, pos: Point2<f64>);
    fn color(&self) -> Color;
    fn shape(&self) -> Shape;
}

// elements/properties/base_property.rs
pub trait Property: Element {
    fn domain(&self) -> &str;
    fn range(&self) -> &str;
    fn property_type(&self) -> PropertyType;
}
```

#### 2.2 Node Implementations

**Mapping**:
| JavaScript | Rust Module | Notes |
|------------|-------------|-------|
| `OwlThing.js` | `nodes/impls/owl_thing.rs` | Top class |
| `OwlClass.js` | `nodes/impls/owl_class.rs` | OWL class |
| `OwlUnionOf.js` | `nodes/impls/owl_union.rs` | Union operator |
| `OwlIntersectionOf.js` | `nodes/impls/owl_intersection.rs` | Intersection |
| `OwlComplementOf.js` | `nodes/impls/owl_complement.rs` | Complement |
| `RdfsLiteral.js` | `nodes/impls/rdfs_literal.rs` | Literal value |

**Example Implementation**:
```rust
// nodes/impls/owl_class.rs
use crate::elements::{Element, Node, RenderData};

pub struct OwlClass {
    id: String,
    iri: String,
    labels: HashMap<String, String>,
    position: Point2<f64>,
    radius: f64,
}

impl Element for OwlClass {
    fn id(&self) -> &str { &self.id }
    fn element_type(&self) -> ElementType { ElementType::OwlClass }
    fn iri(&self) -> &str { &self.iri }
    fn labels(&self) -> &HashMap<String, String> { &self.labels }

    fn render_data(&self) -> RenderData {
        RenderData {
            position: self.position,
            shape: Shape::Circle,
            radius: self.radius,
            color: Color::from_hex("#aaccff"),
            stroke: Color::from_hex("#000000"),
            stroke_width: 2.0,
        }
    }
}

impl Node for OwlClass {
    fn radius(&self) -> f64 { self.radius }
    fn position(&self) -> Point2<f64> { self.position }
    fn set_position(&mut self, pos: Point2<f64>) { self.position = pos; }
    fn color(&self) -> Color { Color::from_hex("#aaccff") }
    fn shape(&self) -> Shape { Shape::Circle }
}
```

### 3. Module System

#### 3.1 Filter Modules

**Pattern**: Trait for uniform interface

```rust
// modules/filters/mod.rs
pub trait Filter {
    fn name(&self) -> &str;
    fn is_enabled(&self) -> bool;
    fn enable(&mut self);
    fn disable(&mut self);
    fn toggle(&mut self);
    fn apply(&self, elements: &[&dyn Element]) -> Vec<&dyn Element>;
}

// modules/filters/datatype_filter.rs
pub struct DatatypeFilter {
    enabled: bool,
}

impl Filter for DatatypeFilter {
    fn name(&self) -> &str { "Datatype Filter" }
    fn is_enabled(&self) -> bool { self.enabled }
    fn enable(&mut self) { self.enabled = true; }
    fn disable(&mut self) { self.enabled = false; }
    fn toggle(&mut self) { self.enabled = !self.enabled; }

    fn apply(&self, elements: &[&dyn Element]) -> Vec<&dyn Element> {
        if !self.enabled {
            return elements.to_vec();
        }

        elements.iter()
            .filter(|e| !matches!(e.element_type(), ElementType::DatatypeProperty))
            .copied()
            .collect()
    }
}
```

#### 3.2 Visual Modules

```rust
// modules/visual/color_externals.rs
pub struct ColorExternals {
    enabled: bool,
    external_color: Color,
}

impl ColorExternals {
    pub fn new() -> Self {
        Self {
            enabled: false,
            external_color: Color::from_hex("#ff6b6b"),
        }
    }

    pub fn set_color(&mut self, color: Color) {
        self.external_color = color;
    }

    pub fn apply_coloring(&self, node: &mut dyn Node) {
        if self.enabled && node.is_external() {
            node.set_color(self.external_color);
        }
    }
}
```

### 4. Utilities

#### 4.1 Constants

```rust
// util/constants.rs
pub const ANIMATION_DURATION: f64 = 250.0;
pub const DEFAULT_NODE_RADIUS: f64 = 30.0;
pub const DEFAULT_LINK_DISTANCE: f64 = 150.0;
pub const DEFAULT_CHARGE: f64 = -500.0;
pub const DEFAULT_GRAVITY: f64 = 0.025;
```

#### 4.2 Language Tools

```rust
// util/language_tools.rs
pub struct LanguageTools;

impl LanguageTools {
    pub fn get_preferred_label(
        labels: &HashMap<String, String>,
        preferred_lang: &str
    ) -> Option<&str> {
        labels.get(preferred_lang)
            .or_else(|| labels.get("en"))
            .or_else(|| labels.values().next())
            .map(|s| s.as_str())
    }

    pub fn has_language(labels: &HashMap<String, String>, lang: &str) -> bool {
        labels.contains_key(lang)
    }
}
```

### 5. Rendering System

#### 5.1 SVG Generation

```rust
// rendering/svg_generator.rs
use svg::Document;

pub struct SvgGenerator {
    document: Document,
}

impl SvgGenerator {
    pub fn generate(&self, graph: &Graph) -> String {
        let mut doc = Document::new()
            .set("viewBox", (0, 0, graph.width(), graph.height()));

        // Add links
        for link in graph.links() {
            doc = doc.add(self.create_link_path(link));
        }

        // Add nodes
        for node in graph.nodes() {
            doc = doc.add(self.create_node_element(node));
        }

        doc.to_string()
    }

    fn create_node_element(&self, node: &dyn Node) -> svg::node::element::Circle {
        svg::node::element::Circle::new()
            .set("cx", node.position().x)
            .set("cy", node.position().y)
            .set("r", node.radius())
            .set("fill", node.color().to_hex())
    }
}
```

#### 5.2 DOM Bridge

```rust
// rendering/dom_bridge.rs
use web_sys::{Document, Element, HtmlElement};
use wasm_bindgen::JsCast;

pub struct DomBridge {
    document: Document,
    container: HtmlElement,
}

impl DomBridge {
    pub fn create_svg_element(&self, nodes: &[&dyn Node]) -> Result<Element, JsValue> {
        let svg = self.document.create_element_ns(
            Some("http://www.w3.org/2000/svg"),
            "svg"
        )?;

        for node in nodes {
            let circle = self.create_circle_element(node)?;
            svg.append_child(&circle)?;
        }

        Ok(svg)
    }

    fn create_circle_element(&self, node: &dyn Node) -> Result<Element, JsValue> {
        let circle = self.document.create_element_ns(
            Some("http://www.w3.org/2000/svg"),
            "circle"
        )?;

        circle.set_attribute("cx", &node.position().x.to_string())?;
        circle.set_attribute("cy", &node.position().y.to_string())?;
        circle.set_attribute("r", &node.radius().to_string())?;
        circle.set_attribute("fill", &node.color().to_hex())?;

        Ok(circle)
    }
}
```

### 6. WASM Bindings

#### 6.1 Main API

```rust
// wasm/bindings.rs
use wasm_bindgen::prelude::*;
use crate::core::{Graph, Options};

#[wasm_bindgen]
pub struct WebVOWL {
    graph: Graph,
}

#[wasm_bindgen]
impl WebVOWL {
    #[wasm_bindgen(constructor)]
    pub fn new(selector: &str, options: JsValue) -> Result<WebVOWL, JsValue> {
        let opts = serde_wasm_bindgen::from_value(options)?;
        let graph = Graph::new(selector, opts)?;
        Ok(WebVOWL { graph })
    }

    #[wasm_bindgen]
    pub async fn load(&mut self, source: JsValue) -> Result<(), JsValue> {
        self.graph.load(&source).await
    }

    #[wasm_bindgen]
    pub fn start(&mut self) {
        self.graph.start();
    }

    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.graph.stop();
    }

    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.graph.reset();
    }

    #[wasm_bindgen]
    pub async fn export(&self, format: &str) -> Result<String, JsValue> {
        match format {
            "svg" => Ok(self.graph.export_svg()),
            "json" => Ok(self.graph.export_json()),
            _ => Err(JsValue::from_str("Unknown format"))
        }
    }
}
```

## Dependencies (Cargo.toml)

```toml
[package]
name = "webvowl-wasm"
version = "2.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = [
    "Document",
    "Element",
    "HtmlElement",
    "Window",
    "SvgElement",
    "MouseEvent",
    "TouchEvent",
    "WheelEvent",
] }
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde-wasm-bindgen = "0.6"
nalgebra = "0.32"
console_error_panic_hook = "0.1"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Enable Link Time Optimization
codegen-units = 1   # Better optimization
```

## Build Process

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build for web
wasm-pack build --target web --out-dir pkg

# Build for Node.js
wasm-pack build --target nodejs --out-dir pkg-node

# Build for bundlers
wasm-pack build --target bundler --out-dir pkg-bundler
```

## Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parser() {
        let parser = Parser::new();
        let json = r#"{"classes": []}"#;
        let result = parser.parse_ontology(&serde_json::from_str(json).unwrap());
        assert!(result.is_ok());
    }
}
```

### WASM Tests
```rust
#[cfg(test)]
mod wasm_tests {
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_webvowl_creation() {
        let webvowl = WebVOWL::new("#container", JsValue::NULL);
        assert!(webvowl.is_ok());
    }
}
```

## Performance Optimizations

1. **Use SIMD for force calculations** (via `packed_simd`)
2. **Spatial indexing** (quadtree for collision detection)
3. **Parallel processing** (via `rayon` for non-WASM targets)
4. **Memory pooling** (reduce allocations)
5. **Lazy rendering** (only render visible elements)

## Conclusion

This mapping provides a clear path from the JavaScript codebase to a well-structured Rust/WASM implementation. The key is maintaining the same API surface while leveraging Rust's performance and safety benefits.
