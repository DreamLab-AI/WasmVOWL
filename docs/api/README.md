# WebVOWL WASM - API Documentation

**Version**: 2.0.0 (Rust/WASM Port)
**Package**: `@webvowl/wasm`
**License**: MIT

## Overview

WebVOWL WASM is a high-performance ontology visualization library written in Rust and compiled to WebAssembly. It provides a JavaScript API that maintains compatibility with the original WebVOWL while offering significant performance improvements.

## Installation

```bash
npm install @webvowl/wasm
```

Or with Yarn:

```bash
yarn add @webvowl/wasm
```

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="node_modules/@webvowl/wasm/webvowl.css">
</head>
<body>
    <div id="vowl-container"></div>

    <script type="module">
        import init, { WebVOWL } from '@webvowl/wasm';

        // Initialize WASM module
        await init();

        // Create graph instance
        const webvowl = new WebVOWL('#vowl-container');

        // Load ontology
        await webvowl.load({
            url: 'path/to/ontology.json'
        });

        // Start visualization
        webvowl.start();
    </script>
</body>
</html>
```

## Core API

### Initialization

#### `init()`

Initialize the WASM module. Must be called before using any WebVOWL functionality.

```javascript
import init from '@webvowl/wasm';

await init();
// Or with custom WASM path
await init('./custom/path/webvowl_bg.wasm');
```

**Returns**: `Promise<void>`

### WebVOWL Class

#### Constructor

```javascript
new WebVOWL(containerSelector: string, options?: Options)
```

Create a new WebVOWL instance.

**Parameters**:
- `containerSelector`: CSS selector for the container element
- `options`: Optional configuration object

**Example**:
```javascript
const webvowl = new WebVOWL('#container', {
    width: 800,
    height: 600,
    language: 'en'
});
```

#### Methods

##### `load(source: Source): Promise<void>`

Load an ontology from various sources.

**Parameters**:
```typescript
type Source = {
    url?: string;          // URL to JSON ontology
    json?: object;         // Direct JSON data
    owl?: string;          // OWL/XML string
    file?: File;          // File object
}
```

**Example**:
```javascript
// From URL
await webvowl.load({ url: '/ontology.json' });

// From JSON object
await webvowl.load({ json: ontologyData });

// From file upload
await webvowl.load({ file: event.target.files[0] });
```

##### `start(): void`

Start the force-directed layout simulation.

```javascript
webvowl.start();
```

##### `stop(): void`

Pause the simulation.

```javascript
webvowl.stop();
```

##### `reset(): void`

Reset the graph to initial state.

```javascript
webvowl.reset();
```

##### `export(format: ExportFormat): Promise<string>`

Export the current visualization.

**Parameters**:
```typescript
type ExportFormat = 'svg' | 'json' | 'png';
```

**Example**:
```javascript
const svgData = await webvowl.export('svg');
const blob = new Blob([svgData], { type: 'image/svg+xml' });
// Download or use the blob
```

##### `on(event: string, callback: Function): void`

Register event listeners.

**Events**:
- `'load'` - Ontology loaded
- `'render'` - Graph rendered
- `'click'` - Node/property clicked
- `'hover'` - Node/property hovered
- `'zoom'` - Zoom level changed

**Example**:
```javascript
webvowl.on('click', (element) => {
    console.log('Clicked:', element);
});
```

##### `destroy(): void`

Clean up and destroy the instance.

```javascript
webvowl.destroy();
```

## Configuration Options

### Options Interface

```typescript
interface Options {
    // Dimensions
    width?: number;              // Container width (default: auto)
    height?: number;             // Container height (default: auto)

    // Appearance
    language?: string;           // UI language (default: 'en')
    theme?: 'light' | 'dark';   // Visual theme (default: 'light')

    // Physics
    gravity?: {
        classDistance?: number;     // Distance between classes (default: 200)
        datatypeDistance?: number;  // Distance for datatypes (default: 150)
        charge?: number;           // Node charge/repulsion (default: -500)
    };

    // Behavior
    autoStart?: boolean;         // Auto-start simulation (default: true)
    centerOnLoad?: boolean;      // Center graph on load (default: true)
    enableZoom?: boolean;        // Enable zoom (default: true)
    enablePan?: boolean;         // Enable pan (default: true)
    enableDrag?: boolean;        // Enable drag (default: true)

    // Performance
    maxNodes?: number;           // Max nodes to render (default: unlimited)
    optimizeForTouch?: boolean;  // Touch device optimizations (default: auto)

    // Features
    modules?: ModuleConfig;      // Enable/disable modules
}
```

### Module Configuration

```typescript
interface ModuleConfig {
    colorExternals?: boolean;       // Color external elements
    compactNotation?: boolean;      // Use compact notation
    filters?: {
        datatype?: boolean;         // Datatype filter
        disjoint?: boolean;         // Disjoint filter
        nodeDegree?: boolean;       // Node degree filter
        objectProperty?: boolean;   // Object property filter
        setOperator?: boolean;      // Set operator filter
        subclass?: boolean;         // Subclass filter
    };
    nodeScaling?: boolean;          // Scale nodes by importance
    statistics?: boolean;           // Show statistics
    focuser?: boolean;             // Node focuser
    pickAndPin?: boolean;          // Pick and pin nodes
}
```

**Example**:
```javascript
const webvowl = new WebVOWL('#container', {
    width: 1200,
    height: 800,
    language: 'en',
    gravity: {
        classDistance: 250,
        charge: -600
    },
    modules: {
        colorExternals: true,
        filters: {
            datatype: true,
            nodeDegree: true
        },
        statistics: true
    }
});
```

## Modules API

WebVOWL provides modular features that can be enabled/disabled and controlled programmatically.

### Accessing Modules

```javascript
// Access modules through the instance
const filters = webvowl.modules.filters;
const statistics = webvowl.modules.statistics;
```

### Filter Modules

#### Datatype Filter

Filter datatype properties.

```javascript
webvowl.modules.datatypeFilter.enable();
webvowl.modules.datatypeFilter.disable();
webvowl.modules.datatypeFilter.toggle();
```

#### Node Degree Filter

Filter nodes by connection count.

```javascript
webvowl.modules.nodeDegreeFilter.setDegree(3); // Show nodes with 3+ connections
webvowl.modules.nodeDegreeFilter.apply();
```

#### Object Property Filter

Filter object properties.

```javascript
webvowl.modules.objectPropertyFilter.enable();
```

### Visual Modules

#### Color Externals Switch

Highlight external elements.

```javascript
webvowl.modules.colorExternals.enable();
webvowl.modules.colorExternals.setColor('#ff6b6b');
```

#### Compact Notation Switch

Toggle compact notation.

```javascript
webvowl.modules.compactNotation.enable();
```

#### Node Scaling Switch

Scale nodes by importance.

```javascript
webvowl.modules.nodeScaling.enable();
```

### Interactive Modules

#### Focuser

Focus on specific nodes.

```javascript
webvowl.modules.focuser.focusNode(nodeId);
webvowl.modules.focuser.unfocus();
```

#### Pick and Pin

Pin nodes to fixed positions.

```javascript
webvowl.modules.pickAndPin.enable();
webvowl.modules.pickAndPin.pinNode(nodeId, x, y);
webvowl.modules.pickAndPin.unpinNode(nodeId);
```

#### Selection Details Displayer

Show details of selected elements.

```javascript
webvowl.modules.selectionDetails.show(element);
webvowl.modules.selectionDetails.hide();
```

### Information Modules

#### Statistics

Display graph statistics.

```javascript
const stats = webvowl.modules.statistics.getStatistics();
console.log(stats);
// {
//   classCount: 45,
//   propertyCount: 67,
//   individualCount: 12,
//   ...
// }
```

## Utilities API

### Constants

```javascript
import { Constants } from '@webvowl/wasm';

Constants.ANIMATION_DURATION;
Constants.DEFAULT_NODE_RADIUS;
Constants.DEFAULT_LINK_DISTANCE;
```

### Language Tools

```javascript
import { LanguageTools } from '@webvowl/wasm';

// Get preferred label in specified language
const label = LanguageTools.getPreferredLabel(labels, 'en');

// Check if language is available
const available = LanguageTools.hasLanguage(labels, 'en');
```

### Element Tools

```javascript
import { ElementTools } from '@webvowl/wasm';

// Get element type
const type = ElementTools.getElementType(element);

// Check if element is external
const isExternal = ElementTools.isExternal(element);
```

### Prefix Tools

```javascript
import { PrefixTools } from '@webvowl/wasm';

// Add prefix
PrefixTools.addPrefix('foaf', 'http://xmlns.com/foaf/0.1/');

// Get short form
const short = PrefixTools.getShortForm('http://xmlns.com/foaf/0.1/Person');
// Returns: 'foaf:Person'
```

## Node and Property Types

### Node Types

WebVOWL supports all OWL node types:

```javascript
// Available through webvowl.nodes
webvowl.nodes.owlthing
webvowl.nodes.owlclass
webvowl.nodes.owlnothing
webvowl.nodes.owldeprecatedclass
webvowl.nodes.owlunionof
webvowl.nodes.owlintersectionof
webvowl.nodes.owlcomplementof
webvowl.nodes.rdfsclass
webvowl.nodes.rdfsliteral
webvowl.nodes.rdfsdatatype
```

### Property Types

```javascript
// Available through webvowl.properties
webvowl.properties.owlobjectproperty
webvowl.properties.owldatatypeproperty
webvowl.properties.rdfssubclassof
webvowl.properties.owldisjointwith
webvowl.properties.owlequivalentclass
webvowl.properties.rdftype
```

## Performance Tips

### 1. Lazy Loading

Load only visible nodes for large ontologies:

```javascript
webvowl.options.maxNodes = 100;
```

### 2. Disable Unnecessary Modules

```javascript
const webvowl = new WebVOWL('#container', {
    modules: {
        statistics: false,  // Disable if not needed
        pickAndPin: false
    }
});
```

### 3. Optimize Physics

Reduce simulation steps for faster rendering:

```javascript
webvowl.options.gravity.charge = -300; // Less repulsion
webvowl.options.gravity.classDistance = 150; // Shorter distances
```

### 4. Use Event Delegation

Instead of attaching listeners to every node, use the global event system:

```javascript
webvowl.on('click', (element) => {
    // Handle all clicks here
});
```

## TypeScript Support

WebVOWL WASM includes full TypeScript definitions:

```typescript
import init, { WebVOWL, Options, Source } from '@webvowl/wasm';

const options: Options = {
    width: 800,
    height: 600,
    language: 'en'
};

const webvowl: WebVOWL = new WebVOWL('#container', options);
```

## Error Handling

```javascript
try {
    await webvowl.load({ url: '/ontology.json' });
} catch (error) {
    if (error.name === 'ParseError') {
        console.error('Invalid ontology format:', error.message);
    } else if (error.name === 'NetworkError') {
        console.error('Failed to load ontology:', error.message);
    } else {
        console.error('Unknown error:', error);
    }
}
```

## Browser Compatibility

WebVOWL WASM requires:
- WebAssembly support
- ES6+ JavaScript
- SVG support

**Supported Browsers**:
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## Migration from Original WebVOWL

See the [Migration Guide](../migration-guide.md) for detailed instructions on migrating from the original JavaScript version.

## Examples

See the [Examples](../examples/) directory for complete working examples.

## License

MIT License - see [LICENSE](../../license.txt) for details.
