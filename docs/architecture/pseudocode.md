# SPARC Phase 2: Pseudocode - Rust/WASM Core Algorithms

**Author**: System Architect Agent
**Date**: 2025-11-10
**Status**: Draft
**Swarm Session**: swarm-1762805104330-fury1qic2

## Overview

This document provides high-level pseudocode for the core algorithms that will be implemented in Rust and compiled to WASM. These algorithms represent the computational hotspots identified in the current JavaScript implementation.

## 1. Ontology Parser Algorithm

### 1.1 Main Parse Function

```rust
FUNCTION parse_ontology(json_string: String) -> Result<Graph, ParseError>
    // Step 1: Parse JSON into intermediate structures
    raw_data = parse_json(json_string)?

    // Step 2: Extract components
    classes = extract_classes(raw_data.class, raw_data.classAttribute)
    datatypes = extract_datatypes(raw_data.datatype, raw_data.datatypeAttribute)
    properties = extract_properties(raw_data.property, raw_data.propertyAttribute)
    namespaces = extract_namespaces(raw_data.namespace)

    // Step 3: Build node map for fast lookups
    node_map = HashMap::new()
    FOR EACH node IN classes + datatypes
        node_map.insert(node.id, node)
    END FOR

    // Step 4: Build property map
    property_map = HashMap::new()
    FOR EACH prop IN properties
        property_map.insert(prop.id, prop)
    END FOR

    // Step 5: Connect properties to nodes
    FOR EACH prop IN properties
        prop.domain = node_map.get(prop.domain_id)?
        prop.range = node_map.get(prop.range_id)?

        // Handle inverse properties
        IF prop.inverse_id IS NOT NULL THEN
            inverse = property_map.get(prop.inverse_id)?
            prop.inverse = inverse
            inverse.inverse = prop
            inverse.domain = prop.range
            inverse.range = prop.domain
        END IF
    END FOR

    // Step 6: Process equivalents and merge
    process_equivalent_classes(classes, node_map)
    process_equivalent_properties(properties, property_map)

    // Step 7: Generate set operator properties
    generate_set_operator_properties(classes, properties)

    // Step 8: Filter visible elements
    visible_nodes = classes.filter(|n| n.visible)
    visible_properties = properties.filter(|p| p.visible AND p.domain.visible AND p.range.visible)

    // Step 9: Create graph
    graph = Graph::new(visible_nodes, visible_properties, namespaces)

    RETURN Ok(graph)
END FUNCTION
```

### 1.2 Class Extraction

```rust
FUNCTION extract_classes(base_classes: Vec<JsonClass>, attributes: Vec<JsonAttribute>) -> Vec<Node>
    nodes = Vec::new()

    FOR EACH base_class IN base_classes
        // Merge with matching attribute
        attribute = attributes.find(|a| a.id == base_class.id)

        // Determine node type prototype
        node_type = match base_class.type.to_lowercase()
            "owl:class" => NodeType::OwlClass
            "rdfs:class" => NodeType::RdfsClass
            "owl:thing" => NodeType::OwlThing
            "owl:nothing" => NodeType::OwlNothing
            "rdfs:datatype" => NodeType::RdfsDatatype
            "external" => NodeType::ExternalClass
            _ => RETURN Error("Unknown class type")

        // Create node
        node = Node {
            id: base_class.id,
            type: node_type,
            label: base_class.label OR attribute.label OR derive_from_iri(base_class.iri),
            iri: base_class.iri,
            comment: base_class.comment OR attribute.comment,
            equivalents: base_class.equivalent OR Vec::new(),
            individuals: parse_individuals(base_class.individuals),
            position: base_class.pos OR None,
            pinned: base_class.pinned OR false,
            visible: true,
            attributes: merge_attributes(base_class.attributes, attribute.attributes),
        }

        nodes.push(node)
    END FOR

    RETURN nodes
END FUNCTION
```

## 2. Force-Directed Layout Algorithm

### 2.1 Main Layout Loop

```rust
FUNCTION compute_layout(graph: &mut Graph, iterations: usize)
    // Initialize parameters
    alpha = 1.0  // Cooling parameter
    alpha_decay = 0.0228  // Decay rate for 300 iterations
    alpha_min = 0.001
    velocity_decay = 0.6

    FOR iteration IN 0..iterations
        // Apply forces
        apply_centering_force(graph)
        apply_link_forces(graph)
        apply_charge_forces(graph)
        apply_collision_detection(graph)

        // Update velocities and positions
        FOR EACH node IN graph.nodes
            node.vx *= velocity_decay
            node.vy *= velocity_decay

            node.x += node.vx * alpha
            node.y += node.vy * alpha
        END FOR

        // Cool down
        alpha = alpha - alpha_decay
        IF alpha < alpha_min THEN
            BREAK
        END IF
    END FOR
END FUNCTION
```

### 2.2 Charge Force (n-body simulation)

```rust
FUNCTION apply_charge_forces(graph: &Graph)
    // Use Barnes-Hut quadtree for O(n log n) performance
    quadtree = build_quadtree(graph.nodes)

    FOR EACH node IN graph.nodes
        IF node.pinned THEN
            CONTINUE
        END IF

        force = calculate_tree_force(node, quadtree, theta=0.9)
        node.vx += force.x
        node.vy += force.y
    END FOR
END FUNCTION

FUNCTION calculate_tree_force(node: &Node, tree: &Quadtree, theta: f64) -> Vec2
    // Recursive Barnes-Hut algorithm
    IF tree.is_leaf() THEN
        IF tree.node.id != node.id THEN
            RETURN coulomb_force(node, tree.node)
        ELSE
            RETURN Vec2::zero()
        END IF
    END IF

    // Check if node is far enough to approximate
    distance = node.position.distance(tree.center_of_mass)
    IF tree.width / distance < theta THEN
        // Use center of mass approximation
        RETURN coulomb_force_approximate(node, tree.center_of_mass, tree.total_charge)
    ELSE
        // Recurse into children
        total_force = Vec2::zero()
        FOR EACH child IN tree.children
            total_force += calculate_tree_force(node, child, theta)
        END FOR
        RETURN total_force
    END IF
END FUNCTION

FUNCTION coulomb_force(node1: &Node, node2: &Node) -> Vec2
    dx = node2.x - node1.x
    dy = node2.y - node1.y
    distance_sq = dx*dx + dy*dy + 0.01  // Small epsilon to avoid division by zero

    // F = k * q1 * q2 / r^2
    strength = node1.charge * node2.charge / distance_sq

    RETURN Vec2 {
        x: dx * strength,
        y: dy * strength,
    }
END FUNCTION
```

### 2.3 Link Force (Springs)

```rust
FUNCTION apply_link_forces(graph: &Graph)
    FOR EACH link IN graph.properties
        source = link.domain
        target = link.range

        dx = target.x - source.x
        dy = target.y - source.y
        distance = sqrt(dx*dx + dy*dy)

        // Hooke's law: F = k * (x - x0)
        target_distance = calculate_link_distance(link)
        strength = link.strength OR 1.0
        force = (distance - target_distance) * strength

        IF distance > 0 THEN
            force = force / distance

            fx = dx * force
            fy = dy * force

            IF NOT target.pinned THEN
                target.vx -= fx
                target.vy -= fy
            END IF

            IF NOT source.pinned THEN
                source.vx += fx
                source.vy += fy
            END IF
        END IF
    END FOR
END FUNCTION

FUNCTION calculate_link_distance(link: &Property) -> f64
    // Different distances for different link types
    MATCH (link.domain.type, link.range.type)
        (Class, Class) => graph.options.class_distance OR 200.0
        (Class, Datatype) => graph.options.datatype_distance OR 100.0
        (_, _) => 150.0
    END MATCH
END FUNCTION
```

### 2.4 Quadtree Construction

```rust
FUNCTION build_quadtree(nodes: &[Node]) -> Quadtree
    // Find bounding box
    min_x = nodes.iter().map(|n| n.x).min()
    max_x = nodes.iter().map(|n| n.x).max()
    min_y = nodes.iter().map(|n| n.y).min()
    max_y = nodes.iter().map(|n| n.y).max()

    root = Quadtree {
        bounds: Rect { min_x, min_y, max_x, max_y },
        center_of_mass: Vec2::zero(),
        total_charge: 0.0,
        children: None,
        node: None,
    }

    FOR EACH node IN nodes
        insert_into_quadtree(&mut root, node)
    END FOR

    RETURN root
END FUNCTION

FUNCTION insert_into_quadtree(tree: &mut Quadtree, node: &Node)
    IF tree.is_leaf() AND tree.node.is_none() THEN
        // Empty leaf, store node
        tree.node = Some(node)
        tree.update_center_of_mass()
        RETURN
    END IF

    IF tree.is_leaf() AND tree.node.is_some() THEN
        // Leaf with one node, subdivide
        old_node = tree.node.take()
        tree.subdivide()
        insert_into_quadtree(tree, old_node)
    END IF

    // Insert into appropriate quadrant
    quadrant = tree.find_quadrant(node.position)
    insert_into_quadtree(&mut tree.children[quadrant], node)
    tree.update_center_of_mass()
END FUNCTION
```

## 3. Filter Algorithms

### 3.1 Node Degree Filter

```rust
FUNCTION apply_node_degree_filter(graph: &mut Graph, min_degree: usize, max_degree: usize)
    // Calculate degrees
    degrees = HashMap::new()
    FOR EACH node IN graph.nodes
        degrees.insert(node.id, 0)
    END FOR

    FOR EACH property IN graph.properties
        degrees[property.domain.id] += 1
        degrees[property.range.id] += 1
    END FOR

    // Apply filter
    FOR EACH node IN graph.nodes
        degree = degrees[node.id]
        node.visible = degree >= min_degree AND degree <= max_degree
    END FOR

    // Hide properties connected to hidden nodes
    FOR EACH property IN graph.properties
        property.visible = property.domain.visible AND property.range.visible
    END FOR
END FUNCTION
```

### 3.2 Subclass Filter

```rust
FUNCTION apply_subclass_filter(graph: &mut Graph, enabled: bool)
    IF NOT enabled THEN
        // Show all nodes
        FOR EACH node IN graph.nodes
            node.visible = true
        END FOR
        RETURN
    END IF

    // Hide all subclass properties
    FOR EACH property IN graph.properties
        IF property.type == PropertyType::SubclassOf THEN
            property.visible = false
        END IF
    END FOR

    // Collapse subclass hierarchies
    subclass_map = build_subclass_map(graph)

    FOR EACH (parent, children) IN subclass_map
        // Keep only the root of each hierarchy visible
        IF parent.has_no_superclass() THEN
            parent.visible = true
            parent.collapsed_children = children

            FOR EACH child IN children
                child.visible = false
            END FOR
        END IF
    END FOR
END FUNCTION
```

### 3.3 Search Algorithm

```rust
FUNCTION search_nodes(graph: &Graph, query: String) -> Vec<NodeId>
    query_lower = query.to_lowercase()
    results = Vec::new()

    FOR EACH node IN graph.nodes
        IF NOT node.visible THEN
            CONTINUE
        END IF

        // Calculate relevance score
        score = 0.0

        // Exact match on label (highest score)
        IF node.label.to_lowercase() == query_lower THEN
            score = 100.0
        // Starts with query
        ELSE IF node.label.to_lowercase().starts_with(query_lower) THEN
            score = 80.0
        // Contains query
        ELSE IF node.label.to_lowercase().contains(query_lower) THEN
            score = 60.0
        // Fuzzy match on label
        ELSE IF fuzzy_match(node.label, query, threshold=0.8) THEN
            score = 40.0
        END IF

        // Also search IRI
        IF node.iri.contains(query_lower) THEN
            score = max(score, 30.0)
        END IF

        // Also search comment
        IF node.comment.to_lowercase().contains(query_lower) THEN
            score = max(score, 20.0)
        END IF

        IF score > 0.0 THEN
            results.push((node.id, score))
        END IF
    END FOR

    // Sort by score descending
    results.sort_by(|a, b| b.1.cmp(a.1))

    RETURN results.map(|r| r.0)
END FUNCTION

FUNCTION fuzzy_match(text: String, pattern: String, threshold: f64) -> bool
    // Levenshtein distance-based fuzzy matching
    distance = levenshtein_distance(text.to_lowercase(), pattern.to_lowercase())
    max_length = max(text.len(), pattern.len())
    similarity = 1.0 - (distance as f64 / max_length as f64)

    RETURN similarity >= threshold
END FUNCTION
```

## 4. Data Structure Algorithms

### 4.1 Equivalent Node Merging

```rust
FUNCTION process_equivalent_classes(nodes: &mut Vec<Node>, node_map: &HashMap<NodeId, Node>)
    FOR EACH node IN nodes
        IF node.equivalents.is_empty() OR node.equivalent_base.is_some() THEN
            CONTINUE
        END IF

        // This node is the base for equivalents
        FOR EACH eq_id IN node.equivalents
            equivalent = node_map.get(eq_id)?

            // Cross-reference
            equivalent.equivalent_base = Some(node)
            equivalent.equivalents.push(node)

            // Merge attributes
            node.attributes.extend(equivalent.attributes)

            // Merge individuals
            node.individuals.extend(equivalent.individuals)

            // Hide equivalent
            equivalent.visible = false
        END FOR

        // Deduplicate merged data
        node.attributes = deduplicate(node.attributes)
        node.individuals = deduplicate(node.individuals)
    END FOR
END FUNCTION
```

### 4.2 Set Operator Property Generation

```rust
FUNCTION generate_set_operator_properties(nodes: &[Node], properties: &mut Vec<Property>)
    FOR EACH node IN nodes
        // Generate properties for complement
        IF node.complement.is_some() THEN
            FOR EACH (index, target_id) IN node.complement.iter().enumerate()
                prop = Property {
                    id: format!("GENERATED-COMPLEMENT-{}-{}-{}", node.id, target_id, index),
                    type: PropertyType::SetOperator(SetOperatorType::Complement),
                    domain: node.id,
                    range: target_id,
                    label: None,
                    visible: true,
                }
                properties.push(prop)
            END FOR
        END IF

        // Generate properties for intersection
        IF node.intersection.is_some() THEN
            FOR EACH (index, target_id) IN node.intersection.iter().enumerate()
                prop = Property {
                    id: format!("GENERATED-INTERSECTION-{}-{}-{}", node.id, target_id, index),
                    type: PropertyType::SetOperator(SetOperatorType::Intersection),
                    domain: node.id,
                    range: target_id,
                    label: None,
                    visible: true,
                }
                properties.push(prop)
            END FOR
        END IF

        // Generate properties for union and disjoint union similarly...
    END FOR
END FUNCTION
```

## 5. Export Algorithms

### 5.1 SVG Export

```rust
FUNCTION export_to_svg(graph: &Graph) -> String
    svg = SvgBuilder::new()

    // Set viewBox based on node positions
    bounds = calculate_bounds(graph.nodes)
    svg.set_viewbox(bounds)

    // Add styles
    svg.add_stylesheet(VOWL_CSS_RULES)

    // Render properties (edges) first
    FOR EACH property IN graph.properties
        IF NOT property.visible THEN
            CONTINUE
        END IF

        path = create_path_between(property.domain, property.range)
        svg.add_element(SvgElement::Path {
            d: path,
            class: property_css_class(property),
            marker_end: property_marker(property),
        })

        // Add label if present
        IF property.label.is_some() THEN
            label_pos = calculate_label_position(property.domain, property.range)
            svg.add_element(SvgElement::Text {
                x: label_pos.x,
                y: label_pos.y,
                text: property.label,
                class: "property-label",
            })
        END IF
    END FOR

    // Render nodes
    FOR EACH node IN graph.nodes
        IF NOT node.visible THEN
            CONTINUE
        END IF

        MATCH node.type
            NodeType::OwlClass | NodeType::RdfsClass =>
                svg.add_element(create_circular_node(node))
            NodeType::RdfsDatatype =>
                svg.add_element(create_rectangular_node(node))
            NodeType::SetOperator(_) =>
                svg.add_element(create_set_operator_node(node))
            _ =>
                svg.add_element(create_default_node(node))
        END MATCH
    END FOR

    RETURN svg.to_string()
END FUNCTION
```

### 5.2 Statistics Calculation

```rust
FUNCTION calculate_statistics(graph: &Graph) -> Statistics
    stats = Statistics::new()

    // Count node types
    FOR EACH node IN graph.nodes.filter(|n| n.visible)
        stats.node_type_counts[node.type] += 1
        stats.total_nodes += 1
    END FOR

    // Count property types
    FOR EACH property IN graph.properties.filter(|p| p.visible)
        stats.property_type_counts[property.type] += 1
        stats.total_properties += 1
    END FOR

    // Calculate degree distribution
    degrees = calculate_degrees(graph)
    stats.min_degree = degrees.values().min()
    stats.max_degree = degrees.values().max()
    stats.avg_degree = degrees.values().sum() / degrees.len()

    // Calculate connected components
    stats.connected_components = count_connected_components(graph)

    // Calculate density
    max_edges = stats.total_nodes * (stats.total_nodes - 1) / 2
    stats.density = stats.total_properties as f64 / max_edges as f64

    RETURN stats
END FUNCTION
```

## 6. Performance Optimizations

### 6.1 SIMD-Accelerated Force Calculation (Future)

```rust
#[cfg(target_feature = "simd128")]
FUNCTION apply_charge_forces_simd(graph: &Graph)
    // Process 4 nodes at a time with SIMD
    FOR chunk IN graph.nodes.chunks(4)
        // Load positions into SIMD registers
        xs = simd_load([chunk[0].x, chunk[1].x, chunk[2].x, chunk[3].x])
        ys = simd_load([chunk[0].y, chunk[1].y, chunk[2].y, chunk[3].y])

        FOR EACH other_node IN graph.nodes
            // Vectorized distance calculation
            dx = simd_sub(xs, simd_splat(other_node.x))
            dy = simd_sub(ys, simd_splat(other_node.y))
            dist_sq = simd_add(simd_mul(dx, dx), simd_mul(dy, dy))

            // Vectorized force calculation
            strength = simd_div(simd_splat(CHARGE_STRENGTH), dist_sq)
            fx = simd_mul(dx, strength)
            fy = simd_mul(dy, strength)

            // Accumulate forces
            // ... (unpack and apply)
        END FOR
    END FOR
END FUNCTION
```

### 6.2 Spatial Hashing for Collision Detection

```rust
FUNCTION apply_collision_detection(graph: &Graph)
    cell_size = MAX_NODE_RADIUS * 2
    grid = SpatialHashGrid::new(cell_size)

    // Insert all nodes into grid
    FOR EACH node IN graph.nodes
        grid.insert(node)
    END FOR

    // Check collisions only within same or adjacent cells
    FOR EACH node IN graph.nodes
        nearby = grid.query_nearby(node.position, node.radius * 2)

        FOR EACH other IN nearby
            IF node.id == other.id THEN
                CONTINUE
            END IF

            distance = node.position.distance(other.position)
            min_distance = node.radius + other.radius

            IF distance < min_distance THEN
                // Resolve collision
                overlap = min_distance - distance
                direction = (other.position - node.position).normalize()

                IF NOT other.pinned THEN
                    other.vx += direction.x * overlap * 0.5
                    other.vy += direction.y * overlap * 0.5
                END IF

                IF NOT node.pinned THEN
                    node.vx -= direction.x * overlap * 0.5
                    node.vy -= direction.y * overlap * 0.5
                END IF
            END IF
        END FOR
    END FOR
END FUNCTION
```

---

**Document Control:**
- Version: 1.0.0
- Last Updated: 2025-11-10
- Next Review: After specification approval
- Complexity Estimate: High (10,000+ LOC)
