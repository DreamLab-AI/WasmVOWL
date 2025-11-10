# WebVOWL Architecture Analysis

## Research Summary

WebVOWL is a JavaScript-based ontology visualization tool that uses D3.js v3 for force-directed graph rendering of OWL (Web Ontology Language) ontologies. The project consists of approximately **12,773 lines of JavaScript** code organized into a modular architecture.

---

## 1. Project Structure

### Core Modules

```
WebVOWL/
├── src/
│   ├── webvowl/          # Core visualization library
│   │   ├── js/
│   │   │   ├── graph.js            # Main graph rendering engine (~2000+ lines)
│   │   │   ├── parser.js           # Ontology parsing logic (740 lines)
│   │   │   ├── options.js          # Configuration management
│   │   │   ├── elements/           # Visual elements
│   │   │   │   ├── nodes/          # Node types (OWL classes)
│   │   │   │   ├── properties/     # Property types (relationships)
│   │   │   │   └── links/          # Link rendering
│   │   │   ├── modules/            # Feature modules (filters, statistics)
│   │   │   ├── parsing/            # OWL parsing utilities
│   │   │   └── util/               # Helper utilities
│   │   └── css/
│   │       └── vowl.css
│   └── app/              # Application UI layer
│       ├── js/
│       │   ├── app.js              # Main application controller (610 lines)
│       │   ├── sidebar.js          # Information sidebar
│       │   ├── menu/               # UI menus (export, filter, gravity, etc.)
│       │   └── ...
│       ├── css/
│       └── data/                   # Sample ontologies (FOAF, SIOC, etc.)
├── deploy/               # Build output directory
├── package.json
├── webpack.config.js
└── Gruntfile.js
```

---

## 2. Technology Stack

### Dependencies

**Core Runtime (package.json):**
- **D3.js v3.5.6** - DOM manipulation and force-directed layout
- **lodash v4.1.0** - Utility functions
- **grunt-cli** - Build system

**Build Tools (devDependencies):**
- **Webpack 1.12.0** - Module bundling
- **Grunt 1.0.1** - Task automation
- **Karma + Jasmine** - Testing framework
- **PhantomJS** - Headless browser testing

### Build System

```javascript
// webpack.config.js
module.exports = {
  entry: {
    webvowl: "./src/webvowl/js/entry.js",
    "webvowl.app": "./src/app/js/entry.js"
  },
  output: {
    path: path.join(__dirname, "deploy/"),
    filename: "js/[name].js",
    libraryTarget: "assign",
    library: "[name]"
  },
  externals: {
    "d3": "d3"  // D3 loaded separately as global
  }
}
```

**Module System:** CommonJS (`require()` / `module.exports`)

---

## 3. Architecture Patterns

### A. Module Pattern

Every component is a factory function returning an object:

```javascript
module.exports = function(graph) {
  var parser = {},
      nodes,
      properties,
      classMap;

  parser.parse = function(ontologyData) { /* ... */ };
  parser.nodes = function() { return nodes; };

  return parser;
};
```

### B. Dependency Injection

The `graph` object is injected into most modules:

```javascript
var parser = require("./parser")(graph);
var options = require("./options")();
```

### C. Observer Pattern

Modules communicate through callbacks and D3 events:

```javascript
force = d3.layout.force()
  .on("tick", recalculatePositions);

zoom = d3.behavior.zoom()
  .on("zoom", zoomed);
```

### D. Strategy Pattern

Multiple filter and rendering modules registered as arrays:

```javascript
options.filterModules().push(datatypeFilter);
options.filterModules().push(nodeDegreeFilter);
options.selectionModules().push(focuser);
```

---

## 4. Core Components

### 4.1 Graph Engine (`graph.js`)

**Responsibilities:**
- Force-directed layout management using D3.js
- Node and link rendering via SVG
- Zoom and pan interactions
- Drag-and-drop node positioning
- Editor mode for ontology editing

**Key Features:**
- Force simulation with configurable charge, gravity, distance
- Real-time position recalculation
- Touch device support
- FPS monitoring for performance
- SVG export functionality

**D3 Force Layout Configuration:**
```javascript
force = d3.layout.force()
  .charge(-500)              // Node repulsion
  .gravity(0.025)           // Center attraction
  .linkStrength(1)          // Link stiffness
  .size([width, height]);
```

### 4.2 Parser (`parser.js`)

**Responsibilities:**
- Parse JSON-formatted OWL ontologies
- Convert ontology elements to internal representation
- Connect classes, properties, and relationships
- Handle equivalence merging

**Data Flow:**
1. Load JSON ontology data
2. Combine classes with their attributes
3. Instantiate node/property prototypes
4. Resolve references (domain, range, inverses)
5. Process equivalent classes/properties
6. Filter visible elements

**Input Format:**
```json
{
  "header": { "title": "Ontology Name" },
  "namespace": [{"name": "owl", "iri": "http://..."}],
  "class": [
    {"id": "1", "type": "owl:Class", "label": {...}}
  ],
  "property": [
    {"id": "2", "type": "owl:objectProperty", "domain": "1", "range": "3"}
  ]
}
```

### 4.3 Elements System

**Node Types** (`elements/nodes/implementations/`):
- `OwlClass` - Standard OWL classes
- `OwlThing` / `OwlNothing` - Top/bottom classes
- `RdfsDatatype` - Datatypes (xsd:string, etc.)
- `OwlDeprecatedClass` - Deprecated classes
- Set operators: `OwlUnionOf`, `OwlIntersectionOf`, `OwlComplementOf`, `OwlDisjointUnionOf`
- `ExternalClass` - Classes from imported ontologies

**Property Types** (`elements/properties/implementations/`):
- `OwlObjectProperty` - Relations between classes
- `OwlDatatypeProperty` - Datatype properties
- `OwlTransitiveProperty`, `OwlSymmetricProperty`, `OwlFunctionalProperty`
- `OwlInverseFunctionalProperty`
- `RdfsSubClassOf` - Inheritance relationships
- `OwlDisjointWith` - Disjointness relationships
- `OwlAllValuesFromProperty`, `OwlSomeValuesFromProperty` - Restrictions

**Link Types** (`elements/links/`):
- `PlainLink` - Simple connections
- `ArrowLink` - Directional relationships
- `BoxArrowLink` - Properties with boxes
- `Label` - Property labels

### 4.4 Modules System

**Filter Modules:**
- `datatypeFilter` - Hide/show datatypes
- `nodeDegreeFilter` - Filter by connection count
- `objectPropertyFilter` - Filter object properties
- `subclassFilter` - Filter subclass hierarchies
- `disjointFilter` - Filter disjoint relationships
- `setOperatorFilter` - Filter set operators
- `emptyLiteralFilter` - Remove empty literals

**Interaction Modules:**
- `pickAndPin` - Click to pin/unpin nodes
- `focuser` - Focus on selected elements
- `selectionDetailsDisplayer` - Show element details
- `compactNotationSwitch` - Toggle compact notation
- `nodeScalingSwitch` - Scale nodes by individuals
- `colorExternalsSwitch` - Color external classes

**Analysis Modules:**
- `statistics` - Count classes, properties, datatypes
- `collapsing` - Collapse/expand node groups

### 4.5 UI Components (`app/js/`)

**Menus:**
- `exportMenu` - Export to SVG, JSON, TTL
- `filterMenu` - Configure filters
- `gravityMenu` - Adjust force parameters
- `modeMenu` - Visualization modes
- `pauseMenu` - Pause/resume simulation
- `searchMenu` - Search ontology elements
- `ontologyMenu` - Load ontologies
- `zoomSlider` - Zoom controls
- `navigationMenu` - Menu navigation

**Sidebars:**
- `sidebar` - Ontology information and statistics
- `leftSidebar` - Navigation panel
- `editSidebar` - Editing controls (editor mode)

**Other:**
- `loadingModule` - Loading progress
- `warningModule` - Error/warning messages
- `directInputModule` - Direct JSON input

---

## 5. Data Flow

### Loading an Ontology

```
1. User selects ontology (file/URL/preset)
   ↓
2. loadingModule.parseUrlAndLoadOntology()
   ↓
3. Fetch/read JSON data
   ↓
4. parser.parse(ontologyData)
   - combineClasses()
   - combineProperties()
   - createNodeStructure()
   - createPropertyStructure()
   ↓
5. graph.load()
   - options.data(parsedData)
   - Setup force layout
   - Create SVG elements
   ↓
6. Force simulation runs
   - Position calculation (tick events)
   - Render nodes/links
   ↓
7. Display complete
   - Apply filters
   - Enable interactions
```

### Rendering Pipeline

```
graph.load()
  ↓
recalculatePositions() [on tick]
  ↓
├─ updateNodePositions()
│  └─ nodeElements.attr("transform", translate)
├─ updateLinkPositions()
│  └─ linkPathElements.attr("d", pathGenerator)
└─ updateLabelPositions()
   └─ labelGroups.attr("transform", translate)
```

---

## 6. Key Algorithms

### Force-Directed Layout

WebVOWL uses D3's force-directed graph layout with custom parameters:

```javascript
force = d3.layout.force()
  .nodes(classNodes)          // Array of node objects
  .links(links)               // Array of link objects
  .size([width, height])
  .linkDistance(function(link) {
    // Custom distance based on property type
    if (isDatatypeProperty) return 120;
    return 200;
  })
  .charge(-500)               // Repulsion strength
  .gravity(0.025)             // Center pull
  .on("tick", recalculatePositions);
```

**Tick Function:**
- Updates node positions based on physics simulation
- Redraws SVG elements
- Stops when alpha (energy) < threshold

### OWL Parsing Strategy

1. **Combine Phase:** Merge base objects with attributes
2. **Prototype Phase:** Instantiate typed node/property objects
3. **Reference Phase:** Resolve domain/range/inverse references
4. **Equivalence Phase:** Merge equivalent classes/properties
5. **Visibility Phase:** Filter hidden/merged elements

### Property Connection Algorithm

```javascript
// Connect properties to domain/range classes
property.domain(classMap[domainId]);
property.range(classMap[rangeId]);

// Handle inverse properties
if (inverse) {
  property.inverse(inverse);
  inverse.inverse(property);
  inverse.domain(rangeObject);  // Switch domain/range
  inverse.range(domainObject);
}
```

---

## 7. SVG Rendering

### SVG Structure

```xml
<svg id="graph">
  <g class="zoom">
    <g class="linkContainer">
      <!-- Links rendered first (background) -->
    </g>
    <g class="cardinalityContainer">
      <!-- Cardinality labels -->
    </g>
    <g class="labelContainer">
      <!-- Property labels -->
    </g>
    <g class="nodeContainer">
      <!-- Nodes rendered last (foreground) -->
    </g>
  </g>
</svg>
```

### Node Rendering

Nodes use different SVG shapes based on type:

```javascript
// Round nodes (classes)
circle.attr("r", radius)
  .attr("class", classNames);

// Rectangular nodes (datatypes)
rect.attr("width", width)
  .attr("height", height);
```

**Styling:** CSS classes applied via `vowl.css` and inline styles (for SVG export)

---

## 8. Editor Mode

WebVOWL includes an editor mode for creating/modifying ontologies:

**Features:**
- Drag to create new properties
- Click nodes to edit labels/IRIs
- Delete elements
- Add datatype properties
- Pin/unpin nodes
- Export modified ontology

**Implementation:**
- `classDragger`, `domainDragger`, `rangeDragger` - Drag-and-drop handlers
- `editSidebar` - Editing UI controls
- `shadowClone` - Visual feedback during dragging

---

## 9. Performance Characteristics

### Code Metrics

- **Total JavaScript:** ~12,773 lines
- **Largest file:** `graph.js` (~2000+ lines)
- **Module count:** 90+ files
- **Node implementations:** 12 types
- **Property implementations:** 12 types

### Performance Considerations

**Bottlenecks:**
1. **D3 Force Simulation** - CPU-intensive for large graphs (>500 nodes)
2. **SVG DOM Updates** - Reflows on every tick
3. **String Manipulation** - Label generation, IRI processing
4. **JSON Parsing** - Large ontology files

**Optimizations Used:**
- Progressive rendering (show graph at 50% completion)
- Conditional rendering during simulation
- Cached computations
- Filter modules to reduce visible elements

---

## 10. Browser Compatibility

**Supported:**
- Modern browsers (Chrome, Firefox, Safari)
- Edge (with warning)

**Not Supported:**
- Internet Explorer ≤ 11

**Touch Device Support:**
- Touch event detection
- Alternative interaction patterns
- Adjusted UI for mobile

---

## 11. Extensibility Points

### Adding New Node Types

1. Create prototype in `elements/nodes/implementations/`
2. Extend `BaseNode` class
3. Register in `nodeMap.js`
4. Implement rendering logic

### Adding New Property Types

1. Create prototype in `elements/properties/implementations/`
2. Extend `BaseProperty` class
3. Register in `propertyMap.js`
4. Implement link rendering

### Adding Filter Modules

1. Extend `filterModuleTemplate`
2. Implement `filter()` method
3. Register with `options.filterModules()`

---

## 12. Critical Dependencies

### D3.js v3 Usage

**Heavy reliance on D3 v3 APIs:**

```javascript
// Selections
d3.select("#graph")
d3.selectAll(".node")

// Force layout
d3.layout.force()

// SVG generation
d3.svg.line()

// Events
d3.behavior.zoom()
d3.behavior.drag()

// Data binding
selection.data(nodes)
  .enter().append("g")

// Utilities
d3.set()
d3.map()
```

**Migration Concern:** D3 v3 is outdated (v7 is current). API has changed significantly.

### Webpack 1 Build System

- **Webpack 1.12.0** - Very old (current: v5+)
- **ExtractTextPlugin** - Deprecated
- **CommonJS modules** - Could use ES6 modules

---

## 13. Data Format (OWL JSON)

WebVOWL uses a custom JSON format for ontologies:

```json
{
  "header": {
    "title": {"en": "My Ontology"},
    "iri": "http://example.org/ontology",
    "author": ["Author Name"],
    "version": "1.0"
  },
  "namespace": [
    {"name": "owl", "iri": "http://www.w3.org/2002/07/owl#"}
  ],
  "class": [
    {
      "id": "1",
      "type": "owl:Class",
      "iri": "http://example.org/MyClass",
      "label": {"en": "My Class"},
      "comment": {"en": "Description"}
    }
  ],
  "property": [
    {
      "id": "2",
      "type": "owl:objectProperty",
      "domain": "1",
      "range": "3",
      "label": {"en": "hasRelation"}
    }
  ]
}
```

**Conversion:** OWL files converted to JSON via backend service (OWL2VOWL)

---

## 14. Testing Infrastructure

**Framework:** Karma + Jasmine
**Launcher:** PhantomJS (headless)
**Command:** `grunt test`

**Test Coverage:** Limited (not comprehensive)

---

## 15. Identified Challenges for Rust/WASM Port

### High Complexity Areas

1. **D3.js Tight Coupling**
   - Force layout algorithm deeply integrated
   - SVG rendering uses D3 data binding
   - Event handling through D3 behaviors

2. **DOM Manipulation**
   - Heavy use of D3 selections
   - Dynamic SVG element creation
   - CSS class management

3. **Callback Hell**
   - Nested callbacks for async operations
   - Event listeners scattered across modules
   - State management complexity

4. **Module System**
   - CommonJS require/exports
   - Factory function pattern
   - Circular dependencies possible

### Data Structure Complexity

- **Graph Structure:** Nodes with bidirectional links
- **Object References:** Properties reference nodes, nodes reference properties
- **Type System:** 12+ node types, 12+ property types
- **Equivalence Classes:** Merged nodes with cross-references

### State Management

- **Mutable State:** Heavy mutation of node/link positions
- **Global State:** Options object passed everywhere
- **UI State:** Multiple menus, sidebars, modals with interdependencies

---

## Next Steps for Research

1. Analyze force layout algorithm for pure Rust implementation
2. Investigate web-sys for DOM manipulation patterns
3. Research wasm-bindgen integration with D3.js
4. Identify pure Rust alternatives for critical paths
5. Design state management strategy (ownership model)
6. Plan incremental migration strategy

---

## Conclusion

WebVOWL is a feature-rich, mature ontology visualization tool with:
- ✅ Modular architecture
- ✅ Comprehensive OWL support
- ✅ Interactive editing capabilities
- ✅ Extensive filtering/customization

**Migration Complexity:** **HIGH**
- Deep D3.js integration
- Complex state management
- Extensive DOM manipulation
- Large codebase with many interdependencies

**Recommended Approach:** Hybrid model with incremental porting
- Keep D3 for rendering initially
- Port parser and data structures to Rust
- Use wasm-bindgen for interop
- Gradually replace D3 with pure Rust/WASM solutions
