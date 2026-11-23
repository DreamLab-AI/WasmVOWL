// @vitest-environment node
/**
 * Real-engine tests: the pinned @dreamlab-ai/vowl-wasm build, loaded from its
 * own .wasm bytes, laid out through @dreamlab-ai/ontomark-graph's driver
 * (`createLayout(vowlEngine(mod))`, the same path the hook takes) and fed by
 * the owl2vowl normaliser with all nine legacy ontologies. Nothing is mocked:
 * a mapping the driver rejects fails here as a layout error.
 *
 * Expected counts are hand-derived from the files (classes + datatypes,
 * properties + generated set-operator edges), not read back from the engine.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as vowl from '@dreamlab-ai/vowl-wasm';
import {
  RECOMMENDED_LAYOUT_PARAMS,
  createLayout,
  layoutInput,
  vowlEngine,
  type LayoutParams
} from '@dreamlab-ai/ontomark-graph/layout';
import type { GraphData } from '@dreamlab-ai/ontomark-graph';
import { normaliseOwl2Vowl } from '@/lib/owl2vowl';
import { toLayoutGraph } from '@/lib/layoutGraph';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';

const here = path.dirname(fileURLToPath(import.meta.url));
const modernRoot = path.resolve(here, '../..');
const dataDir = path.resolve(modernRoot, '../legacy/src/app/data');

function readOntology(file: string): unknown {
  return JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
}

/** file -> [nodes, edges] */
const EXPECTED: Record<string, [number, number]> = {
  'benchmark.json': [52, 86], // 49 classes + 3 datatypes; 82 properties + 4 set-operator edges (15 endpoints via inverse)
  'foaf.json': [56, 74],
  'goodrelations.json': [147, 461], // 250 properties + 211 set-operator edges (61 unionOf nodes)
  'muto.json': [16, 26],
  'new_ontology.json': [0, 0], // header and metrics only: no class or property arrays
  'ontovibe.json': [55, 70], // 51 properties + 19 set-operator edges
  'personasonto.json': [100, 247], // 229 properties + 18 set-operator edges
  'sioc.json': [49, 125],
  'template.json': [0, 0] // the schema template: its only class and property have an empty id
};

const FILES = Object.keys(EXPECTED);
const MAX_TICKS = 2000;

/** The parameters the hook applies: useUIStore's defaults, read rather than
 *  copied so the test cannot drift from the app. */
const LAYOUT: LayoutParams = useUIStore.getState().settings.layout;
const LINK_DISTANCE = useUIStore.getState().settings.layout.linkDistance;
const COLLIDE_RADIUS = RECOMMENDED_LAYOUT_PARAMS.collideRadius;
/** collideStrength 0.7 resolves 70% of an overlap per pass, so the floor is
 *  approached, not met exactly. Measured minimum pair distance 41.67
 *  (goodrelations) to 42.00 (muto); with collision off the same graphs settle
 *  with pairs 4.9 to 33.3 apart, so this tolerance still tells them apart. */
const COLLIDE_TOLERANCE = 1;

/** A layout that ever leaves this box (per axis) has diverged. It scales with
 *  the graph, as a settled force layout's extent does. */
function boundFor(nodeCount: number): number {
  return 10 * LINK_DISTANCE * Math.sqrt(nodeCount);
}

interface LayoutRun {
  loads: number;
  ticks: number;
  settled: boolean;
  errors: Error[];
  ignored: string[];
  supported: readonly string[];
  /** Largest |coordinate| in any snapshot. */
  peak: number;
  /** Largest single-node displacement on the last tick. */
  lastStep: number;
  allFinite: boolean;
  positions: Float32Array;
}

/**
 * Drive the real engine through the ontomark-graph driver one tick per slice
 * (so every tick is observed) with a manual scheduler, until it settles or
 * MAX_TICKS. The engine is wrapped only to count loads and ticks.
 */
function runLayout(graph: GraphData, params: LayoutParams = LAYOUT): LayoutRun {
  const base = vowlEngine(vowl);
  const run: LayoutRun = {
    loads: 0, ticks: 0, settled: false, errors: [], ignored: [], supported: base.supportedParams,
    peak: 0, lastStep: 0, allFinite: true, positions: new Float32Array(0)
  };
  const engine = {
    ...base,
    load(input: Parameters<typeof base.load>[0]) { run.loads++; base.load(input); },
    tick() { run.ticks++; base.tick(); }
  };
  const queue: Array<() => void> = [];
  let prev: Float32Array | null = null;
  const layout = createLayout(engine, {
    params,
    maxTicksPerFrame: 1,
    now: () => 0,
    schedule: (fn) => queue.push(fn),
    cancel: () => {},
    onIgnoredParams: (keys) => run.ignored.push(...keys),
    onError: (error) => run.errors.push(error),
    onSettled: () => { run.settled = true; },
    onPositions: (xy) => {
      run.lastStep = 0;
      for (let i = 0; i < xy.length; i++) {
        if (!Number.isFinite(xy[i])) run.allFinite = false;
        run.peak = Math.max(run.peak, Math.abs(xy[i]));
      }
      if (prev) {
        for (let i = 0; i < xy.length; i += 2) {
          run.lastStep = Math.max(run.lastStep, Math.hypot(xy[i] - prev[i], xy[i + 1] - prev[i + 1]));
        }
      }
      prev = xy.slice();
    }
  });
  try {
    layout.setGraph(graph);
    while (queue.length > 0 && run.ticks < MAX_TICKS) queue.shift()!();
    run.positions = layout.positions();
  } finally {
    layout.destroy();
  }
  return run;
}

function minPairDistance(pos: Float32Array): number {
  let min = Infinity;
  for (let i = 0; i < pos.length; i += 2) {
    for (let j = i + 2; j < pos.length; j += 2) {
      min = Math.min(min, Math.hypot(pos[i] - pos[j], pos[i + 1] - pos[j + 1]));
    }
  }
  return min;
}

function expectDistinctAndSpread(pos: Float32Array, count: number, minExtent: number): void {
  const xs: number[] = [];
  const ys: number[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const x = pos[2 * i];
    const y = pos[2 * i + 1];
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    xs.push(x);
    ys.push(y);
    seen.add(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  expect(seen.size).toBe(count);
  expect(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))).toBeGreaterThan(minExtent);
}

beforeAll(() => {
  const wasmPath = path.join(modernRoot, 'node_modules/@dreamlab-ai/vowl-wasm/vowl_wasm_bg.wasm');
  vowl.initSync({ module: readFileSync(wasmPath) });
});

describe('the pinned engine and the app settings', () => {
  it('is vowl-wasm 0.4.0, which takes every layout setting the app sends', () => {
    expect(vowl.version()).toBe('0.4.0');
    const engine = vowlEngine(vowl);
    try {
      for (const key of Object.keys(LAYOUT)) expect(engine.supportedParams).toContain(key);
      expect(engine.setParams(LAYOUT)).toEqual({ applied: Object.keys(LAYOUT), ignored: [] });
    } finally {
      engine.dispose?.();
    }
  });

  it('defaults to RECOMMENDED_LAYOUT_PARAMS on top of the engine defaults', () => {
    expect(LAYOUT).toMatchObject(RECOMMENDED_LAYOUT_PARAMS);
  });
});

describe('the nine legacy ontologies through the normaliser into the real layout', () => {
  it('covers every file in legacy/src/app/data', () => {
    const onDisk = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
    expect(onDisk).toEqual([...FILES].sort());
  });

  describe.each(FILES)('%s', (file) => {
    const [expectedNodes, expectedEdges] = EXPECTED[file];

    it('normalises to the expected node and edge counts with nothing dropped', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      expect(n.nodes).toHaveLength(expectedNodes);
      expect(n.edges).toHaveLength(expectedEdges);
      // Nothing in the real corpus needs dropping.
      expect(n.report.dropped.filter((d) => d.id !== '')).toEqual([]);
    });

    it('never labels a node with a bare owl2vowl numeric id', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      // owl2vowl ids are opaque numbers; a node labelled with one carries no
      // meaning. (The hand-written benchmark uses readable ids such as
      // "EightSymmetric" with no label, which WebVOWL also shows as the id.)
      const bare = n.nodes.filter((v) => v.labelSource === 'id' && /^\d+$/.test(v.id)).map((v) => `${v.id} (${v.vowlType})`);
      expect(bare).toEqual([]);
    });

    it('maps the store graph onto layout indices in store order, every edge a spring', () => {
      useGraphStore.getState().clear();
      useGraphStore.getState().loadOntology(readOntology(file));
      const { nodes, edges, ontology } = useGraphStore.getState();
      const { graph, ids } = toLayoutGraph(ontology!);

      // Index i of the layout is the i-th store node: positions come back in this order.
      expect(ids).toEqual([...nodes.keys()]);
      expect(graph.nodes.map((v) => v.id)).toEqual(ids);
      expect(nodes.size).toBe(expectedNodes);
      expect(graph.edges).toHaveLength(expectedEdges);
      expect(edges.size).toBe(expectedEdges);

      // The driver accepts the graph; its springs are the store edges minus
      // self-loops, with repeated and reversed pairs merged.
      const input = layoutInput(graph);
      const pairs = new Set<string>();
      for (const e of graph.edges) {
        if (e.source === e.target) continue;
        pairs.add([e.source, e.target].sort().join('\u0000'));
      }
      expect(input.count).toBe(expectedNodes);
      expect(input.edgeA.length).toBe(pairs.size);
    });

    it.skipIf(expectedNodes < 2)('loads once and settles bounded, finite, collision-spaced and still', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      const run = runLayout(toLayoutGraph(n).graph);

      expect(run.errors).toEqual([]);
      expect(run.ignored).toEqual([]);
      expect(run.loads).toBe(1);
      expect(run.settled).toBe(true);
      expect(run.ticks).toBeLessThan(MAX_TICKS);
      expect(run.positions.length).toBe(expectedNodes * 2);
      expect(run.allFinite).toBe(true);
      // Peaks measured at 100 to 283, under 5% of the bound.
      expect(run.peak).toBeLessThan(boundFor(expectedNodes));
      // Collision keeps every pair two radii apart, give or take what one
      // 0.7-strength pass leaves.
      expect(minPairDistance(run.positions)).toBeGreaterThanOrEqual(2 * COLLIDE_RADIUS - COLLIDE_TOLERANCE);
      // Measured at most 0.095 (goodrelations) on the last tick.
      expect(run.lastStep).toBeLessThan(0.05 * LINK_DISTANCE);
    });
  });
});

describe('the sample ontologies behind the drop zone buttons (public/ontologies)', () => {
  const publicDir = path.resolve(modernRoot, 'public/ontologies');
  const samples = readdirSync(publicDir).filter((f) => f.endsWith('.json')).sort();

  it('includes the three sample buttons', () => {
    expect(samples).toEqual(['foaf.json', 'minimal.json', 'sioc.json']);
  });

  it.each(samples)('%s lays out with the normaliser\'s node count and nothing dropped', (file) => {
    const n = normaliseOwl2Vowl(JSON.parse(readFileSync(path.join(publicDir, file), 'utf8')));
    expect(n.nodes.length).toBeGreaterThan(0);
    expect(n.report.dropped).toEqual([]);
    const run = runLayout(toLayoutGraph(n).graph);
    expect(run.errors).toEqual([]);
    expect(run.loads).toBe(1);
    expect(run.settled).toBe(true);
    expect(run.positions.length).toBe(n.nodes.length * 2);
  });
});

describe('the layout oracle on a hub-free graph', () => {
  // Control for the corpus assertions above: a chain (degree at most 2) has
  // no hubs, so it isolates the oracle itself from hub-driven behaviour.
  it('a 12-node chain settles within the bound, spread, with no coincident nodes', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const n = normaliseOwl2Vowl({
      class: ids.map((id) => ({ id, type: 'owl:Class' })),
      property: ids.slice(1).map((id, i) => ({ id: `p${i}`, type: 'owl:ObjectProperty', domain: ids[i], range: id }))
    });
    const run = runLayout(toLayoutGraph(n).graph);
    expect(run.errors).toEqual([]);
    expect(run.settled).toBe(true);
    expect(run.allFinite).toBe(true);
    expect(run.peak).toBeLessThan(boundFor(ids.length));
    expectDistinctAndSpread(run.positions, ids.length, 100);
  });
});

describe('position updates do not reset the graph', () => {
  beforeEach(() => {
    useGraphStore.getState().clear();
  });

  it('bumps graphVersion only on load and clear, and the store holds the layout positions', () => {
    const v0 = useGraphStore.getState().graphVersion;
    useGraphStore.getState().loadOntology(readOntology('foaf.json'));
    const v1 = useGraphStore.getState().graphVersion;
    expect(v1).toBe(v0 + 1);

    const { graph, ids } = toLayoutGraph(useGraphStore.getState().ontology!);
    const queue: Array<() => void> = [];
    let last = new Float32Array(0);
    const layout = createLayout(vowlEngine(vowl), {
      params: LAYOUT,
      maxTicksPerFrame: 1,
      now: () => 0,
      schedule: (fn) => queue.push(fn),
      cancel: () => {},
      onPositions: (xy) => {
        useGraphStore.getState().updateNodePositions(ids, xy);
        last = xy.slice();
      }
    });
    try {
      layout.setGraph(graph);
      for (let i = 0; i < 30 && queue.length > 0; i++) queue.shift()!();
    } finally {
      layout.destroy();
    }
    expect(useGraphStore.getState().graphVersion).toBe(v1);

    const n0 = useGraphStore.getState().nodes.get(ids[0])!;
    expect(n0.position.x).toBeCloseTo(last[0], 3);
    expect(n0.position.y).toBeCloseTo(last[1], 3);
    const nLast = useGraphStore.getState().nodes.get(ids[ids.length - 1])!;
    expect(nLast.position.x).toBeCloseTo(last[2 * ids.length - 2], 3);

    useGraphStore.getState().clear();
    expect(useGraphStore.getState().graphVersion).toBe(v1 + 1);
  });

  it('applies a whole frame of positions in one store update', () => {
    useGraphStore.getState().loadOntology(readOntology('sioc.json'));
    const ids = [...useGraphStore.getState().nodes.keys()];
    const positions = new Float32Array(ids.length * 2).map((_, i) => i + 1);

    let notifications = 0;
    const unsubscribe = useGraphStore.subscribe(() => {
      notifications++;
    });
    useGraphStore.getState().updateNodePositions(ids, positions);
    unsubscribe();

    expect(notifications).toBe(1);
    const last = useGraphStore.getState().nodes.get(ids[ids.length - 1])!;
    expect(last.position).toEqual({ x: ids.length * 2 - 1, y: ids.length * 2, z: 0 });
  });
});
