/**
 * Unit tests for useWasmSimulation hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWasmSimulation } from '@/hooks/useWasmSimulation';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';
import * as wasmModule from '@dreamlab-ai/vowl-wasm';

// Mock the WASM module under the specifier the hook actually imports. (This
// used to name '@/../rust-wasm/pkg/webvowl_wasm.js', a path that no longer
// exists, so the mock never applied and the real package tried to fetch its
// .wasm file inside jsdom.)
vi.mock('@dreamlab-ai/vowl-wasm', () => {
  return {
    default: vi.fn().mockResolvedValue(undefined),
    // A `function`, not an arrow: the hook calls `new WebVowl()`, and vitest 4
    // only lets a mock be constructed when its implementation is constructible.
    WebVowl: vi.fn().mockImplementation(function () {
      return {
        loadOntology: vi.fn(),
        setCenter: vi.fn(),
        setLinkDistance: vi.fn(),
        setChargeStrength: vi.fn(),
        initSimulation: vi.fn(),
        tick: vi.fn(),
        runSimulation: vi.fn(),
        isFinished: vi.fn().mockReturnValue(false),
        getAlpha: vi.fn().mockReturnValue(1.0),
        getNodeIds: vi.fn().mockReturnValue([]),
        getNodePositions: vi.fn().mockReturnValue(new Float32Array(0)),
        getGraphData: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
        getNodeCount: vi.fn().mockReturnValue(0),
        getEdgeCount: vi.fn().mockReturnValue(0),
        getStatistics: vi.fn().mockReturnValue({})
      };
    })
  };
});

// Mock React Three Fiber's useFrame
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Store callback for manual triggering in tests
    (global as any).__r3fFrameCallback = callback;
  })
}));

describe('useWasmSimulation', () => {
  beforeEach(() => {
    // Clear stores
    useGraphStore.getState().clear();

    // Reset frame callback
    (global as any).__r3fFrameCallback = null;
  });

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useWasmSimulation());

      // Wait for initialization
      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 1000 });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.alpha).toBe(1.0);
    });

    it('should auto-start simulation when autoStart is true', async () => {
      // Add nodes to trigger simulation
      useGraphStore.getState().addNode({
        id: 'node1',
        type: 'class',
        label: 'Test Node',
        iri: 'http://example.org/TestClass',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        properties: {}
      });

      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: true })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 1000 });

      // Simulation should start automatically
      await vi.waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      }, { timeout: 1000 });
    });

    it('should not auto-start when autoStart is false', async () => {
      useGraphStore.getState().addNode({
        id: 'node1',
        type: 'class',
        label: 'Test Node',
        iri: 'http://example.org/TestClass',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        properties: {}
      });

      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: false })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 1000 });

      // Should not start automatically
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Control Functions', () => {
    it('should start simulation', async () => {
      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: false })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('should stop simulation', async () => {
      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: true })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should reset simulation', async () => {
      useGraphStore.getState().addNode({
        id: 'node1',
        type: 'class',
        label: 'Test Node',
        iri: 'http://example.org/TestClass',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        properties: {}
      });

      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: true })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.alpha).toBe(1.0);
      expect(result.current.isRunning).toBe(true);
    });

    it('should perform single step', async () => {
      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: false })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.step();
      });

      // Simulation should not be running after step
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Settings Updates', () => {
    it('should update simulation when settings change', async () => {
      const { result } = renderHook(() => useWasmSimulation());

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Update settings
      act(() => {
        useUIStore.getState().updateSettings({ linkDistance: 200 });
      });

      // The new distance reaches the WASM engine instance the hook created.
      const instances = vi.mocked(wasmModule.WebVowl).mock.results;
      const engine = instances[instances.length - 1].value as { setLinkDistance: ReturnType<typeof vi.fn> };
      expect(engine.setLinkDistance).toHaveBeenLastCalledWith(200);
    });
  });

  describe('Graph Data Loading', () => {
    it('should load graph data when nodes are added', async () => {
      const { result } = renderHook(() =>
        useWasmSimulation({ autoStart: true })
      );

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Add nodes
      act(() => {
        useGraphStore.getState().addNode({
          id: 'node1',
          type: 'class',
          label: 'Test Node',
          iri: 'http://example.org/TestClass',
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          properties: {}
        });
      });

      // Should trigger simulation start
      await vi.waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      }, { timeout: 1000 });
    });

    it('should handle empty graph gracefully', async () => {
      const { result } = renderHook(() => useWasmSimulation());

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should not start with empty graph
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle WASM initialization failure', async () => {
      // Make the module's init function reject for this one render. (A
      // vi.mock() call inside a test is hoisted to the top of the file and
      // would replace the mock for every test, so the failure is injected
      // through the existing mock instead.)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(wasmModule.default).mockRejectedValueOnce(new Error('WASM initialization failed'));

      const { result } = renderHook(() => useWasmSimulation());

      // The failure is logged, and the hook neither crashes nor reports itself ready.
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to initialize WASM:', expect.any(Error));
      });
      expect(result.current.isInitialized).toBe(false);

      consoleError.mockRestore();
    });

    it('should handle simulation tick errors', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWasmSimulation());

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Trigger frame callback with error
      if ((global as any).__r3fFrameCallback) {
        act(() => {
          try {
            (global as any).__r3fFrameCallback();
          } catch (error) {
            // Expected
          }
        });
      }

      // Should stop simulation on error
      expect(result.current.isRunning).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useWasmSimulation());

      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      unmount();

      // Should cleanup successfully without errors
      expect(true).toBe(true);
    });
  });
});
