/**
 * Unit tests for useWasmSimulation.
 *
 * The hook drives @dreamlab-ai/ontomark-graph's real layout driver and
 * vowl-wasm adapter (`createLayout(vowlEngine(mod))`); only the WASM module
 * is a double here, an NggExplorer that records what it is given. Slices run
 * on a manual scheduler passed through the hook's options. The real engine is
 * exercised in tests/integration/engine.real.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWasmSimulation } from '@/hooks/useWasmSimulation';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';
import { engineCounters } from '@/lib/debugHandle';
import * as wasmModule from '@dreamlab-ai/vowl-wasm';

/** Ticks after which the double reports it has settled. */
const FINISH_AT = 5;

interface ExplorerDouble {
  loadArrays: ReturnType<typeof vi.fn>;
  setParam: ReturnType<typeof vi.fn>;
  tick: ReturnType<typeof vi.fn>;
  isFinished: ReturnType<typeof vi.fn>;
  writePositionsInto: ReturnType<typeof vi.fn>;
  reheat: ReturnType<typeof vi.fn>;
  free: ReturnType<typeof vi.fn>;
}

const versionHost = globalThis as unknown as { __vowlVersion: string };
versionHost.__vowlVersion = '0.4.0';

vi.mock('@dreamlab-ai/vowl-wasm', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  // The adapter reads the bundle version to decide which setParam keys exist.
  version: vi.fn(() => (globalThis as unknown as { __vowlVersion: string }).__vowlVersion),
  // A `function`, not an arrow: the adapter calls `new NggExplorer()`.
  NggExplorer: vi.fn().mockImplementation(function () {
    let seed = new Float32Array(0);
    let ticks = 0;
    const explorer = {
      loadArrays: vi.fn((positions: Float32Array, a: Uint32Array, b: Uint32Array, kinds: Uint8Array) => {
        if (a.length !== b.length || a.length !== kinds.length) throw 'loadArrays: edge arrays must be parallel';
        seed = Float32Array.from(positions);
        ticks = 0;
      }),
      setParam: vi.fn(),
      tick: vi.fn(() => {
        if (ticks < FINISH_AT) ticks++;
      }),
      isFinished: vi.fn(() => ticks >= FINISH_AT),
      writePositionsInto: vi.fn((out: Float32Array) => {
        for (let i = 0; i < out.length; i += 2) {
          out[i] = seed[i] + ticks;
          out[i + 1] = seed[i + 1] - ticks;
        }
      }),
      reheat: vi.fn(() => {
        ticks = 0;
      }),
      free: vi.fn()
    };
    return explorer;
  })
}));

const SAMPLE = {
  class: [
    { id: 'a', type: 'owl:Class' },
    { id: 'b', type: 'owl:Class' },
    { id: 'lit', type: 'rdfs:Literal' }
  ],
  classAttribute: [
    { id: 'a', label: { en: 'Agent' } },
    { id: 'b', label: { en: 'Body' } }
  ],
  property: [{ id: 'p', type: 'owl:objectProperty' }, { id: 'q', type: 'owl:datatypeProperty' }],
  propertyAttribute: [
    { id: 'p', domain: 'a', range: 'b', label: { en: 'has' } },
    { id: 'q', domain: 'a', range: 'lit', label: { en: 'name' } }
  ]
};

/** Same ids as SAMPLE, other springs: the driver would warm-start it from SAMPLE's positions. */
const SAMPLE_REUSING_IDS = {
  class: [
    { id: 'a', type: 'owl:Class' },
    { id: 'b', type: 'owl:Class' },
    { id: 'lit', type: 'owl:Class' }
  ],
  property: [{ id: 'r', type: 'owl:objectProperty', domain: 'b', range: 'lit' }]
};

let queue: Array<() => void> = [];
const scheduler = {
  schedule: (fn: () => void) => queue.push(fn),
  cancel: () => {},
  now: () => 0
};

/** Run scheduled slices until none is left (each slice ticks until settled or 60 ticks). */
function drain(limit = 100) {
  act(() => {
    for (let i = 0; i < limit && queue.length > 0; i++) queue.shift()!();
  });
}

function latestExplorer(): ExplorerDouble {
  const results = vi.mocked(wasmModule.NggExplorer).mock.results;
  return results[results.length - 1].value as ExplorerDouble;
}

async function mounted() {
  const hook = renderHook(() => useWasmSimulation(scheduler));
  await vi.waitFor(() => {
    expect(hook.result.current.isInitialized).toBe(true);
  }, { timeout: 1000 });
  return hook;
}

function load(doc: unknown) {
  act(() => {
    useGraphStore.getState().loadOntology(doc);
  });
}

describe('useWasmSimulation', () => {
  beforeEach(() => {
    useGraphStore.getState().clear();
    useUIStore.setState({ notifications: [] });
    useUIStore.getState().resetSettings();
    vi.mocked(wasmModule.NggExplorer).mockClear();
    versionHost.__vowlVersion = '0.4.0';
    queue = [];
    engineCounters.loads = 0;
  });

  describe('Initialization', () => {
    it('starts idle with one explorer and nothing loaded', async () => {
      const { result } = await mounted();
      expect(result.current.isRunning).toBe(false);
      expect(wasmModule.NggExplorer).toHaveBeenCalledTimes(1);
      expect(latestExplorer().loadArrays).not.toHaveBeenCalled();
    });

    it('applies every layout setting from the UI store before the first graph', async () => {
      await mounted();
      const { layout } = useUIStore.getState().settings;
      const sent = Object.fromEntries(latestExplorer().setParam.mock.calls);
      expect(sent).toEqual(layout);
    });
  });

  describe('Input mapping', () => {
    it('loads the store nodes in store order and every edge as a spring between their indices', async () => {
      await mounted();
      load(SAMPLE);

      const e = latestExplorer();
      expect(e.loadArrays).toHaveBeenCalledTimes(1);
      const [positions, a, b, kinds] = e.loadArrays.mock.calls[0];
      expect([...useGraphStore.getState().nodes.keys()]).toEqual(['a', 'b', 'lit']);
      expect(positions).toHaveLength(6);
      // p: a -> b, q: a -> lit, as undirected pairs keyed by the lower index.
      expect([...a]).toEqual([0, 0]);
      expect([...b]).toEqual([1, 2]);
      expect([...kinds]).toEqual([0, 0]);
    });

    it('writes each snapshot back to the node at the same index, in one store update', async () => {
      await mounted();
      load(SAMPLE);
      const [seed] = latestExplorer().loadArrays.mock.calls[0] as [Float32Array];

      let updates = 0;
      const unsubscribe = useGraphStore.subscribe(() => updates++);
      drain();
      unsubscribe();

      // One slice ticks to settled (FINISH_AT ticks) and reports once.
      expect(updates).toBe(1);
      const { nodes } = useGraphStore.getState();
      ['a', 'b', 'lit'].forEach((id, i) => {
        expect(nodes.get(id)!.position.x).toBeCloseTo(seed[2 * i] + FINISH_AT, 3);
        expect(nodes.get(id)!.position.y).toBeCloseTo(seed[2 * i + 1] - FINISH_AT, 3);
      });
    });
  });

  describe('Topology lifetime', () => {
    it('runs from a load until the layout settles', async () => {
      const { result } = await mounted();
      load(SAMPLE);
      expect(result.current.isRunning).toBe(true);
      drain();
      expect(result.current.isRunning).toBe(false);
      expect(engineCounters.settled).toBe(true);
    });

    it('position updates never reload the engine or bump graphVersion', async () => {
      await mounted();
      load(SAMPLE);
      const version = useGraphStore.getState().graphVersion;
      drain();
      act(() => {
        useGraphStore.getState().updateNodePositions(['a'], [1, 2]);
        useGraphStore.getState().selectNode('a');
      });
      drain();
      expect(latestExplorer().loadArrays).toHaveBeenCalledTimes(1);
      expect(useGraphStore.getState().graphVersion).toBe(version);
      expect(engineCounters.loads).toBe(1);
    });

    it('loads each new file once and cold, even when it reuses the previous ids', async () => {
      const { result } = await mounted();
      load(SAMPLE);
      drain();
      const e = latestExplorer();
      load(SAMPLE_REUSING_IDS);

      expect(e.loadArrays).toHaveBeenCalledTimes(2);
      expect(engineCounters.loads).toBe(2);
      // Not seeded from SAMPLE's settled positions, and not a warm restart.
      expect(e.reheat).not.toHaveBeenCalled();
      const [first] = e.loadArrays.mock.calls[0] as [Float32Array];
      const [second] = e.loadArrays.mock.calls[1] as [Float32Array];
      expect([...second]).toEqual([...first]);
      expect(result.current.isRunning).toBe(true);
      drain();
      expect(result.current.isRunning).toBe(false);
    });

    it('reloads the same file when it is opened again', async () => {
      const { result } = await mounted();
      load(SAMPLE);
      drain();
      load(SAMPLE);
      expect(latestExplorer().loadArrays).toHaveBeenCalledTimes(2);
      expect(result.current.isRunning).toBe(true);
      drain();
      expect(result.current.isRunning).toBe(false);
    });

    it('stops when the graph is cleared, without loading an empty graph', async () => {
      const { result } = await mounted();
      load(SAMPLE);
      act(() => {
        useGraphStore.getState().clear();
      });
      drain();
      expect(latestExplorer().loadArrays).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
      // The cleared graph's pending slice reported nothing.
      expect(useGraphStore.getState().nodes.size).toBe(0);
    });
  });

  describe('Settings updates', () => {
    it('sends only the changed key and restarts a settled layout warm', async () => {
      const { result } = await mounted();
      load(SAMPLE);
      drain();
      const e = latestExplorer();
      e.setParam.mockClear();

      act(() => {
        useUIStore.getState().updateLayout({ collideRadius: 14 });
      });

      expect(e.setParam.mock.calls).toEqual([['collideRadius', 14]]);
      expect(e.reheat).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(true);
      drain();
      expect(result.current.isRunning).toBe(false);
    });

    it('restores the defaults on resetSettings', async () => {
      await mounted();
      act(() => {
        useUIStore.getState().updateLayout({ linkDistance: 90, charge: 500 });
      });
      const e = latestExplorer();
      e.setParam.mockClear();
      act(() => {
        useUIStore.getState().resetSettings();
      });
      expect(Object.fromEntries(e.setParam.mock.calls)).toEqual({ linkDistance: 60, charge: 2000 });
    });
  });

  describe('Error handling', () => {
    it('surfaces an engine load error as a visible notification and stops', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = await mounted();
      latestExplorer().loadArrays.mockImplementationOnce(() => {
        throw 'loadArrays: edge 0 (0, 9) names a node outside 0..3';
      });

      load(SAMPLE);

      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('names a node outside')
      }));
      expect(result.current.isRunning).toBe(false);
      consoleError.mockRestore();
    });

    it('stops and notifies on a tick error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = await mounted();
      load(SAMPLE);
      latestExplorer().tick.mockImplementationOnce(() => {
        throw 'tick failed';
      });

      drain();

      expect(result.current.isRunning).toBe(false);
      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('tick failed')
      }));
      consoleError.mockRestore();
    });

    it('warns when the engine cannot apply a layout setting', async () => {
      versionHost.__vowlVersion = '0.3.0';
      await mounted();
      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'warning',
        message: expect.stringContaining('collideRadius')
      }));
    });

    it('reports a WASM initialisation failure visibly', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(wasmModule.default).mockRejectedValueOnce(new Error('WASM initialization failed'));

      const { result } = renderHook(() => useWasmSimulation(scheduler));

      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to initialize WASM:', expect.any(Error));
      });
      expect(result.current.isInitialized).toBe(false);
      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('WASM initialization failed')
      }));
      consoleError.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('frees the explorer once on unmount and reports nothing afterwards', async () => {
      const { unmount } = await mounted();
      load(SAMPLE);
      const e = latestExplorer();
      unmount();
      drain();
      expect(e.free).toHaveBeenCalledTimes(1);
      expect(e.tick).not.toHaveBeenCalled();
    });
  });
});
