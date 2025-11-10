/**
 * WASM simulation integration hook
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGraphStore } from '../stores/useGraphStore';
import { useUIStore } from '../stores/useUIStore';

// Will be dynamically imported
type WebVowl = {
  loadOntology(json: string): void;
  setCenter(x: number, y: number): void;
  setLinkDistance(distance: number): void;
  setChargeStrength(strength: number): void;
  initSimulation(): void;
  tick(): void;
  runSimulation(iterations: number): void;
  isFinished(): boolean;
  getAlpha(): number;
  getGraphData(): any;
  getNodeCount(): number;
  getEdgeCount(): number;
  getStatistics(): any;
};

interface UseWasmSimulationOptions {
  autoStart?: boolean;
  iterations?: number;
}

export function useWasmSimulation(options: UseWasmSimulationOptions = {}) {
  const { autoStart = true, iterations } = options;

  const wasmRef = useRef<WebVowl | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [alpha, setAlpha] = useState(1.0);

  const { nodes, edges, updateNodePosition } = useGraphStore();
  const { settings } = useUIStore();

  // Initialize WASM module
  useEffect(() => {
    let mounted = true;

    async function initWasm() {
      try {
        // Dynamically import WASM module
        const wasmModule = await import('../../../rust-wasm/pkg/webvowl_wasm.js');
        await wasmModule.default(); // Initialize WASM

        if (!mounted) return;

        wasmRef.current = new wasmModule.WebVowl();
        setIsInitialized(true);

        // Configure simulation
        wasmRef.current.setCenter(0, 0);
        wasmRef.current.setLinkDistance(settings.linkDistance);
        wasmRef.current.setChargeStrength(settings.chargeStrength);

      } catch (error) {
        console.error('Failed to initialize WASM:', error);
      }
    }

    initWasm();

    return () => {
      mounted = false;
      if (wasmRef.current) {
        wasmRef.current = null;
      }
    };
  }, []);

  // Load graph data when nodes/edges change
  useEffect(() => {
    if (!wasmRef.current || !isInitialized) return;
    if (nodes.size === 0) return;

    const graphData = {
      nodes: Array.from(nodes.values()).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label
      })),
      edges: Array.from(edges.values()).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type
      }))
    };

    try {
      wasmRef.current.loadOntology(JSON.stringify(graphData));
      wasmRef.current.initSimulation();

      if (autoStart) {
        if (iterations) {
          wasmRef.current.runSimulation(iterations);
          setIsRunning(false); // Will be animated frame-by-frame
        } else {
          setIsRunning(true);
        }
      }
    } catch (error) {
      console.error('Failed to load ontology into WASM:', error);
    }
  }, [nodes, edges, isInitialized, autoStart, iterations]);

  // Update simulation parameters when settings change
  useEffect(() => {
    if (!wasmRef.current) return;

    wasmRef.current.setLinkDistance(settings.linkDistance);
    wasmRef.current.setChargeStrength(settings.chargeStrength);
  }, [settings.linkDistance, settings.chargeStrength]);

  // Run simulation tick on each frame
  useFrame(() => {
    const wasm = wasmRef.current;
    if (!wasm || !isRunning) return;

    try {
      // Check if simulation is finished
      if (wasm.isFinished()) {
        setIsRunning(false);
        setAlpha(0);
        return;
      }

      // Perform one tick
      wasm.tick();

      // Get updated alpha
      const currentAlpha = wasm.getAlpha();
      setAlpha(currentAlpha);

      // Get updated positions and update React state
      const graphData = wasm.getGraphData();

      if (graphData && graphData.nodes) {
        graphData.nodes.forEach((node: any) => {
          updateNodePosition(node.id, [node.x, node.y, 0]);
        });
      }
    } catch (error) {
      console.error('Simulation tick error:', error);
      setIsRunning(false);
    }
  });

  // Control functions
  const start = () => {
    if (wasmRef.current && !isRunning) {
      setIsRunning(true);
    }
  };

  const stop = () => {
    setIsRunning(false);
  };

  const reset = () => {
    if (wasmRef.current) {
      wasmRef.current.initSimulation();
      setAlpha(1.0);
      if (autoStart) {
        setIsRunning(true);
      }
    }
  };

  const step = () => {
    if (wasmRef.current && !isRunning) {
      wasmRef.current.tick();

      const graphData = wasmRef.current.getGraphData();
      if (graphData && graphData.nodes) {
        graphData.nodes.forEach((node: any) => {
          updateNodePosition(node.id, [node.x, node.y, 0]);
        });
      }

      setAlpha(wasmRef.current.getAlpha());
    }
  };

  return {
    isInitialized,
    isRunning,
    alpha,
    start,
    stop,
    reset,
    step
  };
}
