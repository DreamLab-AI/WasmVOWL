/**
 * Opt-in diagnostics for driving the explorer from a browser automation
 * session. Off unless the page URL carries `?debug` (any value): then
 * `window.__wasmvowl` exposes the graph store and the number of engine loads
 * and simulation initialisations, so a test can read node positions and
 * check that the engine is loaded once per file rather than once per frame.
 */

export interface EngineCounters {
  /** Calls to WebVowl.loadOntology. */
  loadOntology: number;
  /** Calls to WebVowl.initSimulation. */
  initSimulation: number;
  /** Simulation ticks driven by the frame loop. */
  ticks: number;
  /** Last engine alpha seen by the frame loop. */
  alpha: number;
  /** True once the engine reported isFinished() for the current graph. */
  finished: boolean;
}

export const engineCounters: EngineCounters = {
  loadOntology: 0,
  initSimulation: 0,
  ticks: 0,
  alpha: 1,
  finished: false
};

export function debugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
}

/** Publish `handles` as `window.__wasmvowl` when `?debug` is set. */
export function exposeDebugHandle(handles: Record<string, unknown>): void {
  if (!debugEnabled()) return;
  (window as unknown as { __wasmvowl?: Record<string, unknown> }).__wasmvowl = {
    ...handles,
    counters: engineCounters
  };
}
