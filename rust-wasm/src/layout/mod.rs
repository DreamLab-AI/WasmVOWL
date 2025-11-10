//! Force-directed layout algorithms
//!
//! This module implements physics-based graph layout algorithms,
//! primarily force-directed layouts similar to D3.js force simulations.

pub mod force;
pub mod simulation;

use crate::Result;
use crate::graph::VowlGraph;

/// Trait for layout algorithms
#[cfg_attr(test, mockall::automock)]
pub trait LayoutAlgorithm {
    /// Initialize the layout
    fn initialize(&mut self, graph: &mut VowlGraph) -> Result<()>;

    /// Perform one tick of the simulation
    fn tick(&mut self, graph: &mut VowlGraph) -> Result<()>;

    /// Run the simulation for n iterations
    fn run(&mut self, graph: &mut VowlGraph, iterations: usize) -> Result<()>;

    /// Check if simulation is finished
    fn is_finished(&self) -> bool;

    /// Get current alpha (simulation progress)
    fn alpha(&self) -> f64;
}

/// Configuration for force-directed layout
#[derive(Debug, Clone)]
pub struct LayoutConfig {
    /// Simulation alpha (energy)
    pub alpha: f64,

    /// Alpha decay rate
    pub alpha_decay: f64,

    /// Minimum alpha before stopping
    pub alpha_min: f64,

    /// Velocity decay (damping)
    pub velocity_decay: f64,

    /// Link distance
    pub link_distance: f64,

    /// Link strength
    pub link_strength: f64,

    /// Charge strength (repulsion)
    pub charge_strength: f64,

    /// Center force strength
    pub center_strength: f64,

    /// Center position
    pub center: (f64, f64),
}

impl Default for LayoutConfig {
    fn default() -> Self {
        Self {
            alpha: 1.0,
            alpha_decay: 0.0228,
            alpha_min: 0.001,
            velocity_decay: 0.6,
            link_distance: 30.0,
            link_strength: 1.0,
            charge_strength: -30.0,
            center_strength: 1.0,
            center: (0.0, 0.0),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = LayoutConfig::default();
        assert_eq!(config.alpha, 1.0);
        assert!(config.alpha_decay > 0.0);
        assert!(config.alpha_min > 0.0);
    }

    #[test]
    fn test_config_values() {
        let config = LayoutConfig {
            alpha: 0.5,
            link_distance: 50.0,
            ..Default::default()
        };

        assert_eq!(config.alpha, 0.5);
        assert_eq!(config.link_distance, 50.0);
    }
}
