# WebVOWL Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for WebVOWL, following London TDD (Test-Driven Development) principles with extensive use of mocks and behavior-driven testing.

## Testing Philosophy

### London TDD Approach

We follow the **London School** of TDD, which emphasizes:

1. **Behavior Testing**: Focus on interactions rather than state
2. **Mock-Heavy**: Use mocks extensively to isolate units
3. **Outside-In Development**: Start from high-level behaviors
4. **Collaboration Testing**: Verify how objects collaborate

### Test Pyramid

```
         /\
        /E2E\      (Few - High Value)
       /------\     ~10 tests
      /Integr.\    (Moderate Coverage)
     /----------\   ~30 tests
    /   Unit     \  (Many - Fast)
   /--------------\ ~100+ tests
```

## Test Structure

### Directory Organization

```
tests/
├── unit/                    # Unit tests with mocks
│   ├── parser.test.js
│   ├── graph.test.js
│   ├── elements.test.js
│   └── modules/
│       ├── filters.test.js
│       └── statistics.test.js
├── integration/             # Integration tests
│   └── owl-parsing.integration.test.js
├── e2e/                     # End-to-end tests
│   └── visualization.e2e.test.js
├── benchmarks/              # Performance tests
│   └── performance.benchmark.js
└── fixtures/                # Test data
    └── ontologies/
```

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions/modules in isolation

**Characteristics**:
- Fast execution (<100ms per test)
- Extensive mocking of dependencies
- Focus on single behavior per test
- Use Arrange-Act-Assert pattern

**Example**:
```javascript
describe("Parser Module", function() {
    var parser;
    var mockGraph;

    beforeEach(function() {
        mockGraph = jasmine.createSpyObj('graph', ['addNode', 'addLink']);
        parser = require("./parser")(mockGraph);
    });

    it("should parse valid ontology data", function() {
        // Arrange
        var data = { class: [{ id: "c1", type: "owl:Class" }] };

        // Act
        parser.parse(data);

        // Assert
        expect(mockGraph.addNode).toHaveBeenCalled();
    });
});
```

**Coverage Areas**:
- ✅ Parser module (OWL data parsing)
- ✅ Graph module (node/link management)
- ✅ Element factories (class/property creation)
- ✅ Filter modules (datatype, subclass, degree filters)
- ✅ Utility functions (text tools, math, language)

### 2. Integration Tests

**Purpose**: Test interactions between real modules

**Characteristics**:
- Medium execution time (100-1000ms)
- Minimal mocking (only external dependencies)
- Test complete workflows
- Use real DOM elements

**Example**:
```javascript
describe("OWL Parsing Integration", function() {
    it("should parse ontology and create graph", function(done) {
        // Use real parser and graph
        var graph = require("./graph")('#test-container');
        var parser = require("./parser")(graph);

        parser.parse(testOntology);

        setTimeout(function() {
            var nodes = parser.nodes();
            expect(nodes.length).toBeGreaterThan(0);
            done();
        }, 100);
    });
});
```

**Coverage Areas**:
- ✅ OWL parsing → Graph construction
- ✅ Graph construction → Layout computation
- ✅ Filter application → Graph update
- ✅ User interaction → Sidebar display

### 3. End-to-End Tests

**Purpose**: Test complete user workflows

**Characteristics**:
- Slow execution (1-10 seconds)
- No mocking
- Browser-based (Karma/Selenium)
- Test from user perspective

**Example**:
```javascript
describe("Ontology Loading E2E", function() {
    it("should load FOAF and display graph", function(done) {
        browser.get('http://localhost:8000');

        var select = element(by.id('ontology-select'));
        select.click();
        element(by.cssContainingText('option', 'FOAF')).click();

        browser.sleep(2000);

        var nodes = element.all(by.css('circle.node'));
        nodes.count().then(function(count) {
            expect(count).toBeGreaterThan(0);
            done();
        });
    });
});
```

**Coverage Areas**:
- ✅ Application loading
- ✅ Ontology selection
- ✅ Graph interaction (zoom, pan, click)
- ✅ Filter operations
- ✅ Search functionality
- ✅ Export operations
- ✅ Error handling
- ✅ Accessibility

### 4. Performance Benchmarks

**Purpose**: Ensure performance requirements are met

**Characteristics**:
- Measure execution time
- Compare against thresholds
- Track memory usage
- Verify scalability

**Example**:
```javascript
describe("Parsing Performance", function() {
    it("should parse large ontology under 2 seconds", function() {
        var ontology = generateLargeOntology(500);

        var start = performance.now();
        parser.parse(ontology);
        var duration = performance.now() - start;

        expect(duration).toBeLessThan(2000);
    });
});
```

**Performance Thresholds**:
- Small ontology (<50 nodes): <100ms
- Medium ontology (50-200 nodes): <500ms
- Large ontology (200+ nodes): <2000ms
- Layout stabilization: <1000ms
- Render update: <50ms
- Memory per node: <10KB

## Testing Tools

### Test Framework
- **Jasmine 2.x**: BDD-style test framework
- **Karma**: Test runner for browsers
- **PhantomJS**: Headless browser for CI

### Mocking
- **Jasmine Spies**: Mock functions and track calls
- **jasmine.createSpyObj()**: Create mock objects
- **Manual mocks**: Custom mocks for complex dependencies

### Browser Testing
- **Protractor**: E2E testing framework (optional)
- **Selenium WebDriver**: Browser automation

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run benchmarks
npm run test:benchmark

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Continuous Integration

Tests run automatically on:
- Every commit (unit + integration)
- Pull requests (all tests)
- Nightly builds (all tests + benchmarks)

### Coverage Requirements

| Type | Target | Threshold |
|------|--------|-----------|
| Statements | 85% | 80% |
| Branches | 80% | 75% |
| Functions | 85% | 80% |
| Lines | 85% | 80% |

## Test Writing Guidelines

### Arrange-Act-Assert Pattern

```javascript
it("should do something", function() {
    // Arrange: Set up test data and mocks
    var input = "test";
    var mock = jasmine.createSpyObj('mock', ['method']);

    // Act: Execute the behavior being tested
    var result = functionUnderTest(input, mock);

    // Assert: Verify the outcome
    expect(result).toBe("expected");
    expect(mock.method).toHaveBeenCalled();
});
```

### Test Naming Convention

Format: `should [expected behavior] when [condition]`

Examples:
- ✅ `should create node when valid data provided`
- ✅ `should throw error when missing required field`
- ✅ `should filter datatypes when filter enabled`
- ❌ `test node creation` (too vague)
- ❌ `createNode()` (just repeats function name)

### Test Independence

Each test should:
- ✅ Run independently of other tests
- ✅ Clean up after itself
- ✅ Not rely on execution order
- ❌ Share state with other tests
- ❌ Depend on previous test results

### One Assertion Per Test (Guideline)

Prefer focused tests:
```javascript
// Good: Tests one specific behavior
it("should set label correctly", function() {
    node.label("Test");
    expect(node.label()).toBe("Test");
});

it("should set IRI correctly", function() {
    node.iri("http://example.org/test");
    expect(node.iri()).toBe("http://example.org/test");
});

// Acceptable: Related assertions for same behavior
it("should create link between nodes", function() {
    var link = createLink(node1, node2);
    expect(link.source).toBe(node1);
    expect(link.target).toBe(node2);
});
```

## Mocking Strategy

### When to Mock

✅ **DO Mock**:
- External dependencies (HTTP, file system)
- Slow operations (layout computation)
- Complex objects (D3.js force layout)
- Database/storage access
- User input/events

❌ **DON'T Mock**:
- Simple data structures
- Value objects
- Pure functions
- Objects under test
- Trivial dependencies

### Mock Examples

**Creating Spy Objects**:
```javascript
var mockGraph = jasmine.createSpyObj('graph', [
    'addNode',
    'addLink',
    'update'
]);
```

**Chaining Return Values**:
```javascript
mockNode.label.and.returnValue("Test");
mockNode.x.and.returnValue(100);
mockNode.x(100);  // Returns mockNode for chaining
```

**Spy on Existing Methods**:
```javascript
spyOn(d3.layout, 'force').and.returnValue(mockForce);
```

## Edge Cases and Error Handling

Test these scenarios for all modules:

### Data Validation
- ✅ Empty input
- ✅ Null/undefined values
- ✅ Invalid types
- ✅ Missing required fields
- ✅ Malformed data structures

### Boundary Conditions
- ✅ Zero elements
- ✅ One element
- ✅ Maximum size
- ✅ Negative values (where invalid)

### Error Recovery
- ✅ Network failures
- ✅ Parse errors
- ✅ Circular references
- ✅ Missing dependencies
- ✅ Rendering errors

## Continuous Improvement

### Test Metrics

Track these metrics over time:
- Test count by type
- Test execution time
- Code coverage percentage
- Flaky test rate
- Bug escape rate

### Code Review Checklist

Every PR must include:
- [ ] Tests for new functionality
- [ ] Tests for bug fixes
- [ ] Coverage above threshold
- [ ] No skipped tests (unless documented)
- [ ] Performance tests for critical paths

### Refactoring Tests

When refactoring:
1. Run existing tests to establish baseline
2. Make changes incrementally
3. Keep tests passing at each step
4. Update tests to reflect new design
5. Verify coverage remains high

## Common Testing Patterns

### Testing Asynchronous Code

```javascript
it("should handle async operations", function(done) {
    asyncFunction().then(function(result) {
        expect(result).toBeDefined();
        done();
    });
});
```

### Testing DOM Interactions

```javascript
it("should update DOM elements", function() {
    var element = document.createElement('div');
    element.id = 'test';
    document.body.appendChild(element);

    functionThatUpdatesDom();

    var updated = document.getElementById('test');
    expect(updated.textContent).toBe('Updated');

    document.body.removeChild(element);  // Cleanup
});
```

### Testing D3.js Code

```javascript
it("should create SVG elements", function() {
    var svg = d3.select('#container').append('svg');

    renderFunction(svg, data);

    var circles = svg.selectAll('circle');
    expect(circles[0].length).toBe(data.length);
});
```

## Resources

- [Jasmine Documentation](https://jasmine.github.io/)
- [London TDD Guide](https://github.com/testdouble/contributing-tests/wiki/London-school-TDD)
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- WebVOWL Test Examples: `/tests/`

## Appendix: Test Coverage Report

### Current Coverage (As of Test Suite Creation)

| Module | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| Parser | TBD | TBD | TBD | TBD |
| Graph | TBD | TBD | TBD | TBD |
| Elements | TBD | TBD | TBD | TBD |
| Filters | TBD | TBD | TBD | TBD |
| **Total** | **TBD** | **TBD** | **TBD** | **TBD** |

*Run `npm run test:coverage` to generate updated report*

### Known Coverage Gaps

1. Legacy browser compatibility code
2. Error handling for edge cases
3. Deprecated API methods
4. Debug/development utilities

### Improvement Plan

1. **Phase 1**: Achieve 80% coverage on core modules
2. **Phase 2**: Add integration tests for all workflows
3. **Phase 3**: Complete E2E test suite
4. **Phase 4**: Performance baseline and regression tests

---

**Last Updated**: 2025-11-10
**Maintained By**: QA/Testing Team
**Review Frequency**: Quarterly
