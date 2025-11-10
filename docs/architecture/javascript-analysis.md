# WebVOWL JavaScript Architecture Analysis

**Analysis Date**: 2025-11-10
**Purpose**: Document existing JavaScript architecture for Rust/WASM port

## Overview

WebVOWL is a JavaScript-based ontology visualization tool that uses D3.js for rendering OWL (Web Ontology Language) ontologies as interactive force-directed graphs.

### Key Statistics

- **Total JavaScript Files**: 83 files
- **Lines of Code**: ~6,664 lines (webvowl core)
- **Test Files**: 7 test files
- **Module Count**: 16 core modules
- **Dependencies**: D3.js v3, lodash

## Architecture Components

### 1. Core Modules (`src/webvowl/js/`)

#### 1.1 Entry Point (`entry.js`)
- Main module that exports the `webvowl` namespace
- Aggregates all submodules (graph, options, util, modules, nodes, properties)
- CommonJS module pattern (`module.exports`)

#### 1.2 Graph Module (`graph.js`)
- **Size**: 134KB, largest file in the project
- **Purpose**: Core visualization engine
- **Key Features**:
  - Force-directed graph layout using D3.js force layout
  - SVG rendering and manipulation
  - Zoom and pan controls
  - Node and link management
  - Edit mode functionality
  - Touch device support

**D3.js Dependencies**:
- `d3.svg.line()` - Path drawing
- `d3.layout.force()` - Force simulation
- `d3.behavior.drag()` - Drag interactions
- `d3.behavior.zoom()` - Zoom interactions
- `d3.select()` - DOM selection and manipulation

#### 1.3 Parser Module (`parser.js`)
- **Purpose**: Parse OWL ontology data into graph structures
- **Responsibilities**:
  - Parse settings (zoom, translation, gravity)
  - Process OWL classes and properties
  - Handle attribute parsing
  - Manage equivalent property merging

#### 1.4 Options Module (`options.js`)
- **Size**: ~22KB
- **Purpose**: Configuration and settings management
- Manages visualization options and menu states

### 2. Element System

#### 2.1 Nodes (`elements/nodes/`)
Node types representing OWL constructs:
- `BaseNode.js` - Base node class
- `RoundNode.js` - Circular node renderer
- Implementations:
  - `OwlThing.js` - Top OWL class
  - `OwlClass.js` - OWL classes
  - `OwlUnionOf.js` - Union operations
  - `OwlComplementOf.js` - Complement operations
  - `RdfsLiteral.js` - Literal values
  - And more...

#### 2.2 Properties (`elements/properties/`)
Property types for OWL relationships:
- Object properties
- Datatype properties
- Subclass relationships
- Disjoint relationships
- And more...

#### 2.3 Links (`elements/links/`)
Visual connectors between nodes

### 3. Modules (`modules/`)

16 feature modules providing specific functionality:

1. **colorExternalsSwitch** - Color external elements
2. **compactNotationSwitch** - Toggle compact notation
3. **datatypeFilter** - Filter datatype properties
4. **disjointFilter** - Filter disjoint relationships
5. **emptyLiteralFilter** - Filter empty literals
6. **focuser** - Focus on specific nodes
7. **nodeDegreeFilter** - Filter by node connections
8. **nodeScalingSwitch** - Scale nodes by importance
9. **objectPropertyFilter** - Filter object properties
10. **pickAndPin** - Interactive node selection
11. **selectionDetailsDisplayer** - Show node details
12. **setOperatorFilter** - Filter set operations
13. **statistics** - Display graph statistics
14. **subclassFilter** - Filter subclass relationships
15. **collapsing** - Collapse/expand nodes
16. **filterModuleTemplate** - Template for filters

### 4. Utilities (`util/`)

Helper functions for:
- Constants management
- Language tools
- Element tools
- Mathematical operations
- Prefix representation

### 5. Parsing (`parsing/`)

Specialized parsers for:
- Attribute parsing
- Link creation
- Property merging

### 6. Application Layer (`src/app/js/`)

User interface components:
- **Menus**: Mode, Config, Ontology, Export, Filter, Debug, Search, etc.
- **Sidebars**: Left sidebar, edit sidebar
- **Modules**: Loading, warning, direct input
- **Entry point**: Application initialization

## Data Flow

```
1. OWL Ontology Data (JSON)
   ↓
2. Parser (parser.js)
   ↓
3. Node/Property Objects (elements/)
   ↓
4. Graph Engine (graph.js)
   ↓
5. D3.js Force Layout
   ↓
6. SVG Rendering
   ↓
7. User Interactions (modules/)
```

## Key Technologies

### D3.js v3 Usage

**Critical D3.js Features Used**:
1. **Force Layout** (`d3.layout.force()`)
   - Node positioning
   - Physics simulation
   - Collision detection

2. **SVG Manipulation** (`d3.svg.*`)
   - Line generators
   - Path drawing
   - Shape rendering

3. **Behaviors** (`d3.behavior.*`)
   - Drag and drop
   - Zoom and pan
   - Touch interactions

4. **Selections** (`d3.select()`, `d3.selectAll()`)
   - DOM manipulation
   - Data binding
   - Event handling

5. **Transitions** (`d3.transition()`)
   - Smooth animations
   - Interpolation

### Build System

- **Build Tool**: Webpack 1.x + Grunt
- **Testing**: Karma + Jasmine
- **CSS**: Extracted via webpack
- **Output**: Bundled JavaScript + CSS

## Challenges for Rust/WASM Port

### 1. D3.js Dependency
**Challenge**: D3.js is tightly integrated throughout the codebase
**Solutions**:
- Port force-directed layout algorithm to Rust
- Use web-sys for DOM manipulation
- Consider using existing Rust graph libraries (petgraph)
- Use SVG generation from WASM

### 2. DOM Manipulation
**Challenge**: Heavy reliance on D3's DOM selection and manipulation
**Solutions**:
- Use web-sys/wasm-bindgen for DOM access
- Separate business logic from rendering
- Implement virtual DOM or minimal DOM updates

### 3. Event Handling
**Challenge**: Complex event system (drag, zoom, click, touch)
**Solutions**:
- Use wasm-bindgen for event listeners
- Implement event delegation in Rust
- Use closure! macro for callbacks

### 4. State Management
**Challenge**: Mutable state spread across modules
**Solutions**:
- Use Rust's ownership system for safety
- Implement clear state containers
- Consider using RefCell/Rc for shared state

### 5. Module System
**Challenge**: CommonJS modules need conversion
**Solutions**:
- Use Rust's module system
- Implement clear public APIs
- Use feature flags for optional modules

## Performance Opportunities

The Rust/WASM port offers significant performance improvements:

1. **Faster parsing**: Rust's parser combinators
2. **Optimized force calculations**: SIMD, parallel processing
3. **Reduced memory**: Rust's zero-cost abstractions
4. **Smaller bundle**: WASM binary compression
5. **Better caching**: Persistent data structures

## Recommendations for Port

### Phase 1: Core Engine
1. Port parser module to Rust
2. Implement graph data structures
3. Port force-directed layout algorithm
4. Create WASM bindings for core functions

### Phase 2: Rendering
1. Generate SVG from Rust
2. Implement DOM manipulation via web-sys
3. Port node and property rendering
4. Add interaction handlers

### Phase 3: Modules
1. Port filter modules
2. Port visualization switches
3. Port statistics module
4. Port focuser and details displayer

### Phase 4: Integration
1. Create NPM package
2. Provide JavaScript API compatibility layer
3. Add TypeScript definitions
4. Write migration guide

## API Surface

### Public API (to be maintained in Rust/WASM)

```javascript
// Core
webvowl.graph(containerSelector)
webvowl.options()
webvowl.version

// Utilities
webvowl.util.constants
webvowl.util.languageTools
webvowl.util.elementTools
webvowl.util.prefixTools

// Modules (16 total)
webvowl.modules.colorExternalsSwitch()
webvowl.modules.compactNotationSwitch()
webvowl.modules.datatypeFilter()
// ... etc

// Nodes (dynamic, from nodeMap)
webvowl.nodes.owlthing
webvowl.nodes.owlclass
// ... etc

// Properties (dynamic, from propertyMap)
webvowl.properties.owlobjectproperty
webvowl.properties.owldatatypeproperty
// ... etc
```

## Conclusion

WebVOWL is a well-structured but D3-dependent visualization library. The port to Rust/WASM is feasible but requires careful handling of:

1. Force-directed layout algorithm reimplementation
2. DOM manipulation via web-sys
3. Event handling via wasm-bindgen
4. Maintaining API compatibility
5. Ensuring feature parity

The resulting WASM implementation should provide significant performance benefits while maintaining the same functionality and user experience.
