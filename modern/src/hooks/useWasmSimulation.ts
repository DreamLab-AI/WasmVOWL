/**
 * WASM simulation integration hook
 *
 * Owns one `WebVowl` engine from @dreamlab-ai/vowl-wasm. The engine is loaded
 * from the store's normalised ontology (`ontology.engine`, the same object the
 * store built its nodes and edges from) once per `graphVersion`, that is once
 * per loaded file; simulation ticks only write positions back to the store
 * and never reload or re-initialise the engine.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { WebVowl } from '@dreamlab-ai/vowl-wasm';
import { useGraphStore } from '../stores/useGraphStore';
import { useUIStore } from '../stores/useUIStore';
import { engineCounters, exposeDebugHandle } from '../lib/debugHandle';

interface UseWasmSimulationOptions {
  autoStart?: boolean;
  iterations?: number;
}

/** wasm-bindgen errors arrive as plain strings, not Error objects. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function useWasmSimulation(options: UseWasmSimulationOptions = {}) {
  const { autoStart = true, iterations } = options;

  const wasmRef = useRef<WebVowl | null>(null);
  /** Index-to-id map for getNodePositions(). Captured once per loaded graph:
   *  the engine guarantees the order is stable until the next loadOntology. */
  const nodeIdsRef = useRef<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [alpha, setAlpha] = useState(1.0);

  const graphVersion = useGraphStore((s) => s.graphVersion);
  const updateNodePositions = useGraphStore((s) => s.updateNodePositions);
  const linkDistance = useUIStore((s) => s.settings.linkDistance);
  const chargeStrength = useUIStore((s) => s.settings.chargeStrength);
  const addNotification = useUIStore((s) => s.addNotification);

  /** Since vowl-wasm 0.3.0 loadOntology keeps the parameters set before it
   *  (0.2.x reset them). They are still applied after every load, so the
   *  engine always matches the current UI settings whatever happened before. */
  const applySettings = useCallback((wasm: WebVowl) => {
    const { settings } = useUIStore.getState();
    wasm.setCenter(0, 0);
    wasm.setLinkDistance(settings.linkDistance);
    wasm.setChargeStrength(settings.chargeStrength);
  }, []);

  const pushPositions = useCallback((wasm: WebVowl) => {
    updateNodePositions(nodeIdsRef.current, wasm.getNodePositions());
  }, [updateNodePositions]);

  // Initialize WASM module
  useEffect(() => {
    let mounted = true;
    let engine: WebVowl | null = null;

    async function initWasm() {
      try {
        const wasmModule = await import('@dreamlab-ai/vowl-wasm');
        await wasmModule.default();
        if (!mounted) return;

        engine = new wasmModule.WebVowl();
        wasmRef.current = engine;
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize WASM:', error);
        if (mounted) {
          addNotification({
            type: 'error',
            message: `Layout engine failed to start: ${describeError(error)}`,
            duration: 10000
          });
        }
      }
    }

    initWasm();
    exposeDebugHandle({ graphStore: useGraphStore, uiStore: useUIStore });

    return () => {
      mounted = false;
      if (wasmRef.current === engine) wasmRef.current = null;
      engine?.free();
    };
  }, [addNotification]);

  // Load the graph into the engine once per graphVersion (load or clear).
  useEffect(() => {
    const wasm = wasmRef.current;
    if (!wasm || !isInitialized) return;

    const { ontology, nodes } = useGraphStore.getState();
    nodeIdsRef.current = [];
    engineCounters.finished = false;
    engineCounters.ticks = 0;
    if (!ontology || ontology.engine.class.length === 0) {
      setIsRunning(false);
      return;
    }

    try {
      wasm.loadOntology(JSON.stringify(ontology.engine));
      engineCounters.loadOntology++;

      const engineIds = wasm.getNodeIds();
      const storeIds = [...nodes.keys()];
      if (!sameIds(engineIds, storeIds)) {
        throw new Error(
          `engine and store disagree on the node set (${engineIds.length} engine nodes, ${storeIds.length} store nodes)`
        );
      }
      nodeIdsRef.current = engineIds;

      applySettings(wasm);
      wasm.initSimulation();
      engineCounters.initSimulation++;
      // Show the seeded layout at once rather than every node at the origin.
      pushPositions(wasm);
      setAlpha(wasm.getAlpha());

      if (autoStart) {
        if (iterations) {
          wasm.runSimulation(iterations);
          pushPositions(wasm);
          setIsRunning(false);
        } else {
          setIsRunning(true);
        }
      }
    } catch (error) {
      console.error('Failed to load ontology into WASM:', error);
      setIsRunning(false);
      addNotification({
        type: 'error',
        message: `Layout engine could not load this ontology: ${describeError(error)}`,
        duration: 10000
      });
    }
  }, [graphVersion, isInitialized, autoStart, iterations, applySettings, pushPositions, addNotification]);

  // Update simulation parameters when settings change
  useEffect(() => {
    const wasm = wasmRef.current;
    if (!wasm) return;
    wasm.setLinkDistance(linkDistance);
    wasm.setChargeStrength(chargeStrength);
  }, [linkDistance, chargeStrength]);

  // Run simulation tick on each frame
  useFrame(() => {
    const wasm = wasmRef.current;
    if (!wasm || !isRunning) return;

    try {
      if (wasm.isFinished()) {
        engineCounters.finished = true;
        engineCounters.alpha = wasm.getAlpha();
        setIsRunning(false);
        setAlpha(0);
        return;
      }

      wasm.tick();
      engineCounters.ticks++;

      const currentAlpha = wasm.getAlpha();
      engineCounters.alpha = currentAlpha;
      setAlpha(currentAlpha);

      // One store update for the whole frame.
      pushPositions(wasm);
    } catch (error) {
      console.error('Simulation tick error:', error);
      setIsRunning(false);
      addNotification({
        type: 'error',
        message: `Layout simulation stopped: ${describeError(error)}`,
        duration: 10000
      });
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
    const wasm = wasmRef.current;
    if (wasm && nodeIdsRef.current.length > 0) {
      wasm.initSimulation();
      engineCounters.initSimulation++;
      engineCounters.finished = false;
      pushPositions(wasm);
      setAlpha(1.0);
      if (autoStart) {
        setIsRunning(true);
      }
    }
  };

  const step = () => {
    const wasm = wasmRef.current;
    if (wasm && !isRunning && nodeIdsRef.current.length > 0) {
      wasm.tick();
      pushPositions(wasm);
      setAlpha(wasm.getAlpha());
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
