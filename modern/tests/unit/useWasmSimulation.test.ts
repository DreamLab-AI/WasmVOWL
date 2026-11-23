/**
 * Unit tests for useWasmSimulation hook
 *
 * The engine is a mock here (the real engine is exercised in
 * tests/integration/engine.real.test.ts). The mock parses what the hook hands
 * it the way vowl-wasm does: it requires a `class` array and reports the ids
 * it was given, so a hook that sent the wrong shape would fail these tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWasmSimulation } from '@/hooks/useWasmSimulation';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';
import * as wasmModule from '@dreamlab-ai/vowl-wasm';

/** Where the useFrame mock keeps the hook's frame callback. */
const frameHost = globalThis as unknown as { __r3fFrameCallback: (() => void) | null };

interface MockEngine {
  loadOntology: ReturnType<typeof vi.fn>;
  setCenter: ReturnType<typeof vi.fn>;
  setLinkDistance: ReturnType<typeof vi.fn>;
  setChargeStrength: ReturnType<typeof vi.fn>;
  initSimulation: ReturnType<typeof vi.fn>;
  tick: ReturnType<typeof vi.fn>;
  runSimulation: ReturnType<typeof vi.fn>;
  isFinished: ReturnType<typeof vi.fn>;
  getAlpha: ReturnType<typeof vi.fn>;
  getNodeIds: ReturnType<typeof vi.fn>;
  getNodePositions: ReturnType<typeof vi.fn>;
  free: ReturnType<typeof vi.fn>;
}

// Mock the WASM module under the specifier the hook actually imports.
vi.mock('@dreamlab-ai/vowl-wasm', () => {
  return {
    default: vi.fn().mockResolvedValue(undefined),
    // A `function`, not an arrow: the hook calls `new WebVowl()`, and vitest 4
    // only lets a mock be constructed when its implementation is constructible.
    WebVowl: vi.fn().mockImplementation(function () {
      let ids: string[] = [];
      let ticks = 0;
      const engine = {
        loadOntology: vi.fn((json: string) => {
          const doc = JSON.parse(json);
          if (!Array.isArray(doc.class)) throw "Parse error: Missing 'class' array";
          if (!Array.isArray(doc.property)) throw "Parse error: Missing 'property' array";
          ids = doc.class.map((c: { id: string }) => c.id);
          ticks = 0;
        }),
        setCenter: vi.fn(),
        setLinkDistance: vi.fn(),
        setChargeStrength: vi.fn(),
        initSimulation: vi.fn(() => {
          ticks = 0;
        }),
        tick: vi.fn(() => {
          ticks++;
        }),
        runSimulation: vi.fn(),
        isFinished: vi.fn().mockReturnValue(false),
        getAlpha: vi.fn(() => Math.pow(0.98, ticks)),
        getNodeIds: vi.fn(() => [...ids]),
        getNodePositions: vi.fn(() => {
          const out = new Float32Array(ids.length * 2);
          ids.forEach((_, i) => {
            out[2 * i] = 300 * Math.cos(i) + ticks;
            out[2 * i + 1] = 300 * Math.sin(i) - ticks;
          });
          return out;
        }),
        free: vi.fn()
      };
      return engine;
    })
  };
});

// Mock React Three Fiber's useFrame
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Store callback for manual triggering in tests
    (globalThis as unknown as { __r3fFrameCallback: unknown }).__r3fFrameCallback = callback;
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

function latestEngine(): MockEngine {
  const results = vi.mocked(wasmModule.WebVowl).mock.results;
  return results[results.length - 1].value as MockEngine;
}

function frames(n: number) {
  act(() => {
    for (let i = 0; i < n; i++) frameHost.__r3fFrameCallback?.();
  });
}

async function mounted(options?: Parameters<typeof useWasmSimulation>[0]) {
  const hook = renderHook(() => useWasmSimulation(options));
  await vi.waitFor(() => {
    expect(hook.result.current.isInitialized).toBe(true);
  }, { timeout: 1000 });
  return hook;
}

describe('useWasmSimulation', () => {
  beforeEach(() => {
    useGraphStore.getState().clear();
    useUIStore.setState({ notifications: [] });
    useUIStore.getState().resetSettings();
    vi.mocked(wasmModule.WebVowl).mockClear();
    frameHost.__r3fFrameCallback = null;
  });

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = await mounted();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.alpha).toBe(1.0);
    });

    it('should auto-start simulation when an ontology is loaded and autoStart is true', async () => {
      const { result } = await mounted({ autoStart: true });

      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      await vi.waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      }, { timeout: 1000 });
    });

    it('should not auto-start when autoStart is false', async () => {
      const { result } = await mounted({ autoStart: false });

      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      expect(latestEngine().loadOntology).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Engine contract', () => {
    it('feeds the engine the normalised {class, property} object, not {nodes, edges}', async () => {
      await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      const engine = latestEngine();
      expect(engine.loadOntology).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(engine.loadOntology.mock.calls[0][0]);
      expect(sent).toEqual(useGraphStore.getState().ontology!.engine);
      expect(sent).not.toHaveProperty('nodes');
      expect(sent.class.map((c: { label: string }) => c.label)).toEqual(['Agent', 'Body', 'Literal']);
      expect(sent.property.map((p: { domain: string; range: string }) => [p.domain, p.range])).toEqual([
        ['a', 'b'],
        ['a', 'lit']
      ]);
    });

    it('engine node ids equal the store node ids', async () => {
      await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      const engineIds = latestEngine().getNodeIds() as string[];
      expect([...engineIds].sort()).toEqual([...useGraphStore.getState().nodes.keys()].sort());
    });

    it('applies the simulation settings after loadOntology (which resets them) and before initSimulation', async () => {
      useUIStore.getState().updateSettings({ linkDistance: 140, chargeStrength: -500 });
      await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      const e = latestEngine();
      const load = e.loadOntology.mock.invocationCallOrder[0];
      const init = e.initSimulation.mock.invocationCallOrder[0];
      const lastLink = e.setLinkDistance.mock.invocationCallOrder.at(-1)!;
      const lastCharge = e.setChargeStrength.mock.invocationCallOrder.at(-1)!;
      expect(load).toBeLessThan(lastLink);
      expect(lastLink).toBeLessThan(init);
      expect(load).toBeLessThan(lastCharge);
      expect(lastCharge).toBeLessThan(init);
      expect(e.setLinkDistance).toHaveBeenLastCalledWith(140);
      expect(e.setChargeStrength).toHaveBeenLastCalledWith(-500);
    });

    it('pushes the seeded positions to the store straight after initSimulation', async () => {
      await mounted({ autoStart: false });
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      const a = useGraphStore.getState().nodes.get('a')!;
      expect(a.position.x).toBeCloseTo(300, 3);
      expect(a.position.y).toBeCloseTo(0, 3);
      const b = useGraphStore.getState().nodes.get('b')!;
      expect(b.position.x).toBeCloseTo(300 * Math.cos(1), 3);
    });
  });

  describe('Topology lifetime', () => {
    it('ticks write positions but never reload or re-initialise the engine', async () => {
      const { result } = await mounted({ autoStart: true });
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      await vi.waitFor(() => expect(result.current.isRunning).toBe(true));
      const version = useGraphStore.getState().graphVersion;

      frames(60);

      const e = latestEngine();
      expect(e.tick).toHaveBeenCalledTimes(60);
      expect(e.loadOntology).toHaveBeenCalledTimes(1);
      expect(e.initSimulation).toHaveBeenCalledTimes(1);
      expect(useGraphStore.getState().graphVersion).toBe(version);
      // The store holds the 60th frame's positions.
      expect(useGraphStore.getState().nodes.get('a')!.position.x).toBeCloseTo(360, 3);
      expect(result.current.alpha).toBeCloseTo(Math.pow(0.98, 60), 6);
    });

    it('reloads the engine once per new file', async () => {
      await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      frames(5);
      act(() => {
        useGraphStore.getState().loadOntology({ class: [{ id: 'x', type: 'owl:Class' }], property: [] });
      });
      frames(5);

      const e = latestEngine();
      expect(e.loadOntology).toHaveBeenCalledTimes(2);
      expect(e.initSimulation).toHaveBeenCalledTimes(2);
      expect(e.getNodeIds()).toEqual(['x']);
    });

    it('stops when the graph is cleared, without loading an empty graph', async () => {
      const { result } = await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      act(() => {
        useGraphStore.getState().clear();
      });

      expect(latestEngine().loadOntology).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
    });

    it('stops once the engine reports it has finished', async () => {
      const { result } = await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      latestEngine().isFinished.mockReturnValue(true);
      frames(1);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.alpha).toBe(0);
    });
  });

  describe('Control Functions', () => {
    it('should start simulation', async () => {
      const { result } = await mounted({ autoStart: false });
      act(() => {
        result.current.start();
      });
      expect(result.current.isRunning).toBe(true);
    });

    it('should stop simulation', async () => {
      const { result } = await mounted({ autoStart: true });
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      act(() => {
        result.current.stop();
      });
      expect(result.current.isRunning).toBe(false);
    });

    it('should reset simulation', async () => {
      const { result } = await mounted({ autoStart: true });
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      frames(10);

      act(() => {
        result.current.reset();
      });

      expect(latestEngine().initSimulation).toHaveBeenCalledTimes(2);
      expect(latestEngine().loadOntology).toHaveBeenCalledTimes(1);
      expect(result.current.alpha).toBe(1.0);
      expect(result.current.isRunning).toBe(true);
    });

    it('should perform single step', async () => {
      const { result } = await mounted({ autoStart: false });
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      act(() => {
        result.current.step();
      });
      expect(latestEngine().tick).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Settings Updates', () => {
    it('should update simulation when settings change', async () => {
      await mounted();
      act(() => {
        useUIStore.getState().updateSettings({ linkDistance: 200 });
      });
      expect(latestEngine().setLinkDistance).toHaveBeenLastCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('surfaces an engine load error as a visible notification', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await mounted();
      latestEngine().loadOntology.mockImplementationOnce(() => {
        throw 'Graph error: Node \'x\' not found';
      });

      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      const { notifications } = useUIStore.getState();
      expect(notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining("Node 'x' not found")
      }));
      expect(latestEngine().initSimulation).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('surfaces an engine/store node-set mismatch as an error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await mounted();
      latestEngine().getNodeIds.mockReturnValueOnce(['a']);

      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });

      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('disagree on the node set')
      }));
      consoleError.mockRestore();
    });

    it('should handle WASM initialization failure visibly', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(wasmModule.default).mockRejectedValueOnce(new Error('WASM initialization failed'));

      const { result } = renderHook(() => useWasmSimulation());

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

    it('stops and notifies on a simulation tick error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = await mounted();
      act(() => {
        useGraphStore.getState().loadOntology(SAMPLE);
      });
      latestEngine().tick.mockImplementationOnce(() => {
        throw 'tick failed';
      });

      frames(1);

      expect(result.current.isRunning).toBe(false);
      expect(useUIStore.getState().notifications).toContainEqual(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('tick failed')
      }));
      consoleError.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('frees the engine on unmount', async () => {
      const { unmount } = await mounted();
      const engine = latestEngine();
      unmount();
      expect(engine.free).toHaveBeenCalledTimes(1);
    });
  });
});
