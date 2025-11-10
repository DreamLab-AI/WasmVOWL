//! WASM bindings for JavaScript interop

use crate::{
    graph::{builder::GraphBuilder, VowlGraph},
    layout::{simulation::ForceSimulation, LayoutAlgorithm},
    ontology::{parser::StandardParser, OntologyParser},
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Main WebVOWL WASM interface
#[wasm_bindgen]
pub struct WebVowl {
    graph: Option<VowlGraph>,
    simulation: ForceSimulation,
}

#[wasm_bindgen]
impl WebVowl {
    /// Create a new WebVOWL instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            graph: None,
            simulation: ForceSimulation::new(),
        }
    }

    /// Load ontology from JSON string
    #[wasm_bindgen(js_name = loadOntology)]
    pub fn load_ontology(&mut self, json: &str) -> std::result::Result<(), JsValue> {
        let parser = StandardParser::new();
        let ontology_data = parser
            .parse(json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        parser
            .validate(&ontology_data)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let graph = GraphBuilder::from_ontology(&ontology_data)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        self.graph = Some(graph);
        Ok(())
    }

    /// Initialize the force simulation
    #[wasm_bindgen(js_name = initSimulation)]
    pub fn init_simulation(&mut self) -> std::result::Result<(), JsValue> {
        let graph = self
            .graph
            .as_mut()
            .ok_or_else(|| JsValue::from_str("No graph loaded"))?;

        self.simulation
            .initialize(graph)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(())
    }

    /// Run simulation for n iterations
    #[wasm_bindgen(js_name = runSimulation)]
    pub fn run_simulation(&mut self, iterations: usize) -> std::result::Result<(), JsValue> {
        let graph = self
            .graph
            .as_mut()
            .ok_or_else(|| JsValue::from_str("No graph loaded"))?;

        self.simulation
            .run(graph, iterations)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(())
    }

    /// Perform one simulation tick
    #[wasm_bindgen(js_name = tick)]
    pub fn tick(&mut self) -> std::result::Result<(), JsValue> {
        let graph = self
            .graph
            .as_mut()
            .ok_or_else(|| JsValue::from_str("No graph loaded"))?;

        self.simulation
            .tick(graph)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(())
    }

    /// Check if simulation is finished
    #[wasm_bindgen(js_name = isFinished)]
    pub fn is_finished(&self) -> bool {
        self.simulation.is_finished()
    }

    /// Get current alpha value
    #[wasm_bindgen(js_name = getAlpha)]
    pub fn get_alpha(&self) -> f64 {
        self.simulation.alpha()
    }

    /// Set simulation center
    #[wasm_bindgen(js_name = setCenter)]
    pub fn set_center(&mut self, x: f64, y: f64) {
        self.simulation.set_center(x, y);
    }

    /// Set link distance
    #[wasm_bindgen(js_name = setLinkDistance)]
    pub fn set_link_distance(&mut self, distance: f64) {
        self.simulation.set_link_distance(distance);
    }

    /// Set charge strength
    #[wasm_bindgen(js_name = setChargeStrength)]
    pub fn set_charge_strength(&mut self, strength: f64) {
        self.simulation.set_charge_strength(strength);
    }

    /// Get graph data as JSON
    #[wasm_bindgen(js_name = getGraphData)]
    pub fn get_graph_data(&self) -> std::result::Result<JsValue, JsValue> {
        let graph = self
            .graph
            .as_ref()
            .ok_or_else(|| JsValue::from_str("No graph loaded"))?;

        let data = GraphData::from_graph(graph);
        serde_wasm_bindgen::to_value(&data).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Get node count
    #[wasm_bindgen(js_name = getNodeCount)]
    pub fn get_node_count(&self) -> usize {
        self.graph.as_ref().map(|g| g.node_count()).unwrap_or(0)
    }

    /// Get edge count
    #[wasm_bindgen(js_name = getEdgeCount)]
    pub fn get_edge_count(&self) -> usize {
        self.graph.as_ref().map(|g| g.edge_count()).unwrap_or(0)
    }

    /// Get graph statistics
    #[wasm_bindgen(js_name = getStatistics)]
    pub fn get_statistics(&self) -> std::result::Result<JsValue, JsValue> {
        let graph = self
            .graph
            .as_ref()
            .ok_or_else(|| JsValue::from_str("No graph loaded"))?;

        let stats = Statistics {
            node_count: graph.node_count(),
            edge_count: graph.edge_count(),
            class_count: graph.metadata().class_count,
            property_count: graph.metadata().property_count,
            max_degree: graph.metadata().max_degree,
            density: graph.metadata().density,
        };

        serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

/// Graph data for JSON export
#[derive(Debug, Clone, Serialize, Deserialize)]
struct GraphData {
    nodes: Vec<NodeData>,
    edges: Vec<EdgeData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NodeData {
    id: String,
    label: String,
    x: f64,
    y: f64,
    node_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EdgeData {
    id: String,
    label: String,
    source: String,
    target: String,
    edge_type: String,
}

impl GraphData {
    fn from_graph(graph: &VowlGraph) -> Self {
        let nodes = graph
            .nodes()
            .iter()
            .map(|n| NodeData {
                id: n.id.clone(),
                label: n.label.clone(),
                x: n.visual.x,
                y: n.visual.y,
                node_type: format!("{:?}", n.node_type),
            })
            .collect();

        let edges = graph
            .edges()
            .iter()
            .map(|e| EdgeData {
                id: e.id.clone(),
                label: e.label.clone(),
                source: String::new(), // Would need proper tracking
                target: String::new(),
                edge_type: format!("{:?}", e.edge_type),
            })
            .collect();

        Self { nodes, edges }
    }
}

/// Statistics data
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Statistics {
    node_count: usize,
    edge_count: usize,
    class_count: usize,
    property_count: usize,
    max_degree: usize,
    density: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_webvowl_creation() {
        let webvowl = WebVowl::new();
        assert_eq!(webvowl.get_node_count(), 0);
        assert_eq!(webvowl.get_edge_count(), 0);
    }

    #[wasm_bindgen_test]
    fn test_load_ontology() {
        let mut webvowl = WebVowl::new();

        let json = r#"
        {
            "class": [
                {
                    "id": "class1",
                    "label": "Class 1",
                    "type": "owl:Class"
                }
            ],
            "property": []
        }
        "#;

        let result = webvowl.load_ontology(json);
        assert!(result.is_ok());
        assert_eq!(webvowl.get_node_count(), 1);
    }
}
