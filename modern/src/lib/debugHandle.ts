/**
 * Opt-in diagnostics for driving the explorer from a browser automation
 * session. Development builds only (`import.meta.env.DEV`, as under the
 * `vite` dev server), and then only when the page URL carries `?debug` (any
 * value): `window.__wasmvowl` exposes the graph and UI stores, the number
 * of engine loads and whether the layout has settled, so a test can read node
 * positions and check that the engine is loaded once per file rather than
 * once per frame. A production build replaces
 * `import.meta.env.DEV` with `false`, so the handle and its name are dropped
 * from the bundle.
 */

export interface EngineCounters {
  /** Graphs loaded into the NggExplorer (cumulative, one per opened file). */
  loads: number;
  /** Position snapshots written to the store for the current graph. */
  snapshots: number;
  /** True once the layout of the current graph settled. */
  settled: boolean;
}

export const engineCounters: EngineCounters = {
  loads: 0,
  snapshots: 0,
  settled: false
};

export function debugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
}

/** Publish `handles` as `window.__wasmvowl` in a development build when `?debug` is set. */
export function exposeDebugHandle(handles: Record<string, unknown>): void {
  if (!import.meta.env.DEV || !debugEnabled()) return;
  (window as unknown as { __wasmvowl?: Record<string, unknown> }).__wasmvowl = {
    ...handles,
    counters: engineCounters
  };
}
