/**
 * Layout integration hook.
 *
 * Lays the graph out with vowl-wasm's NggExplorer through
 * @dreamlab-ai/ontomark-graph's driver (`createLayout(vowlEngine(mod))`), the
 * simulator every other vowl-wasm consumer uses. One driver and one explorer
 * live for the lifetime of the hook. The graph is (re)loaded from the store's
 * normalised ontology once per `graphVersion`, that is once per loaded file;
 * the driver ticks in time-boxed animation-frame slices and each snapshot is
 * written to the store in one update. Position and selection updates never
 * reload the engine.
 */

import { useEffect, useRef, useState } from 'react';
import {
  createLayout,
  vowlEngine,
  type Layout,
  type LayoutOptions,
  type VowlLayoutEngine
} from '@dreamlab-ai/ontomark-graph/layout';
import { useGraphStore } from '../stores/useGraphStore';
import { useUIStore } from '../stores/useUIStore';
import { useLabelStore } from '../stores/useLabelStore';
import { engineCounters, exposeDebugHandle } from '../lib/debugHandle';
import { toLayoutGraph } from '../lib/layoutGraph';
import type { LayoutSettings } from '../types/ui';

/** Scheduler overrides for the driver (tests drive slices by hand). Read once, at mount. */
export type UseWasmSimulationOptions = Pick<LayoutOptions, 'schedule' | 'cancel' | 'now'>;

const EMPTY_GRAPH = { nodes: [], edges: [] };

/** wasm-bindgen errors arrive as plain strings, not Error objects. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The adapter with its loads counted for the debug handle. */
function countingEngine(engine: VowlLayoutEngine): VowlLayoutEngine {
  return {
    ...engine,
    load(input) {
      engineCounters.loads++;
      engine.load(input);
    }
  };
}

export function useWasmSimulation(options: UseWasmSimulationOptions = {}) {
  const optionsRef = useRef(options);
  const layoutRef = useRef<Layout | null>(null);
  /** Index-to-id map for the driver's snapshots, set with each loaded graph. */
  const idsRef = useRef<string[]>([]);
  /** The layout settings last sent to the engine. */
  const appliedRef = useRef<LayoutSettings | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const graphVersion = useGraphStore((s) => s.graphVersion);
  const layoutSettings = useUIStore((s) => s.settings.layout);
  const addNotification = useUIStore((s) => s.addNotification);

  // Load the engine and create the one driver.
  useEffect(() => {
    let mounted = true;
    let layout: Layout | null = null;

    async function init() {
      try {
        const wasmModule = await import('@dreamlab-ai/vowl-wasm');
        await wasmModule.default();
        if (!mounted) return;

        const params = useUIStore.getState().settings.layout;
        const { schedule, cancel, now } = optionsRef.current;
        layout = createLayout(countingEngine(vowlEngine(wasmModule)), {
          params,
          schedule,
          cancel,
          now,
          onPositions: (xy) => {
            engineCounters.snapshots++;
            useGraphStore.getState().updateNodePositions(idsRef.current, xy);
          },
          onSettled: () => {
            engineCounters.settled = true;
            setIsRunning(false);
          },
          onError: (error) => {
            console.error('Layout failed:', error);
            setIsRunning(false);
            useUIStore.getState().addNotification({
              type: 'error',
              message: `Layout stopped: ${describeError(error)}`,
              duration: 10000
            });
          },
          onIgnoredParams: (keys) => {
            useUIStore.getState().addNotification({
              type: 'warning',
              message: `The layout engine ignored these settings: ${keys.join(', ')}`,
              duration: 10000
            });
          }
        });
        appliedRef.current = params;
        layoutRef.current = layout;
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

    init();
    exposeDebugHandle({ graphStore: useGraphStore, uiStore: useUIStore, labelStore: useLabelStore });

    return () => {
      mounted = false;
      if (layoutRef.current === layout) layoutRef.current = null;
      // Releases the explorer too.
      layout?.destroy();
    };
  }, [addNotification]);

  // Lay out the graph once per graphVersion (load or clear).
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout || !isInitialized) return;

    engineCounters.settled = false;
    engineCounters.snapshots = 0;
    // Forget the previous graph first. The driver otherwise starts nodes whose
    // ids it already knows where the last file left them (owl2vowl ids are
    // small numbers, so unrelated files share many), restarts warm, and skips
    // a graph identical to the last one: a newly opened file must start cold.
    layout.setGraph(EMPTY_GRAPH);
    idsRef.current = [];

    const { ontology } = useGraphStore.getState();
    if (!ontology || ontology.nodes.length === 0) {
      setIsRunning(false);
      return;
    }

    try {
      const { graph, ids } = toLayoutGraph(ontology);
      idsRef.current = ids;
      setIsRunning(true);
      // A failed load reaches onError, which stops the run.
      layout.setGraph(graph);
    } catch (error) {
      // The driver's own graph validation throws rather than reporting.
      console.error('Layout failed:', error);
      setIsRunning(false);
      addNotification({
        type: 'error',
        message: `Layout engine could not load this ontology: ${describeError(error)}`,
        duration: 10000
      });
    }
  }, [graphVersion, isInitialized, addNotification]);

  // Follow settings changes live, sending only what changed.
  useEffect(() => {
    const layout = layoutRef.current;
    const previous = appliedRef.current;
    if (!layout || !previous || previous === layoutSettings) return;
    appliedRef.current = layoutSettings;
    const changed = Object.fromEntries(
      Object.entries(layoutSettings).filter(([key, value]) => previous[key] !== value)
    );
    if (Object.keys(changed).length === 0) return;
    layout.setParams(changed);
    // A loaded layout restarts warm; it settles again through onSettled.
    if (layout.getState().running) setIsRunning(true);
  }, [layoutSettings, isInitialized]);

  return { isInitialized, isRunning };
}
