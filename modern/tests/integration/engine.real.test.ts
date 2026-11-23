// @vitest-environment node
/**
 * Real-engine tests: the pinned @dreamlab-ai/vowl-wasm build, loaded from its
 * own .wasm bytes, fed by the owl2vowl normaliser with all nine legacy
 * ontologies. No mock is involved, so a schema mismatch between the
 * normaliser and the engine fails here as an engine load error.
 *
 * Expected counts are hand-derived from the files (classes + datatypes,
 * properties + generated set-operator edges), not read back from the engine;
 * foaf's 56 / 74 was also measured independently before this change.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initSync, WebVowl } from '@dreamlab-ai/vowl-wasm';
import { normaliseOwl2Vowl } from '@/lib/owl2vowl';
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

/** The engine seeds nodes on a circle of this radius (LayoutConfig::default). */
const SEED_RADIUS = 300;
const MAX_TICKS = 2000;

/** The settings the hook applies: useUIStore's defaults, read rather than
 *  copied so the test cannot drift from the app. */
const { linkDistance: LINK_DISTANCE, chargeStrength: CHARGE_STRENGTH } = useUIStore.getState().settings;

/** A layout that ever leaves this box (per axis) has diverged. It scales with
 *  the graph, as a settled force layout's extent does. */
function boundFor(nodeCount: number): number {
  return 10 * LINK_DISTANCE * Math.sqrt(nodeCount);
}

function configure(engine: WebVowl): void {
  engine.setCenter(0, 0);
  engine.setLinkDistance(LINK_DISTANCE);
  engine.setChargeStrength(CHARGE_STRENGTH);
}

interface LayoutRun {
  ticks: number;
  /** Largest |coordinate| seen on any tick. */
  peak: number;
  /** Largest single-node displacement on the last tick. */
  lastStep: number;
  allFinite: boolean;
}

/** Tick to isFinished (or MAX_TICKS), tracking the peak, finiteness and the
 *  final per-tick motion. */
function runLayout(engine: WebVowl): LayoutRun {
  let prev = engine.getNodePositions();
  let peak = 0;
  let lastStep = 0;
  let allFinite = true;
  const ticks = runToFinish(engine, (pos) => {
    lastStep = 0;
    for (let i = 0; i < pos.length; i++) {
      if (!Number.isFinite(pos[i])) allFinite = false;
      peak = Math.max(peak, Math.abs(pos[i]));
    }
    for (let i = 0; i < pos.length; i += 2) {
      lastStep = Math.max(lastStep, Math.hypot(pos[i] - prev[i], pos[i + 1] - prev[i + 1]));
    }
    prev = pos;
  });
  return { ticks, peak, lastStep, allFinite };
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

function runToFinish(engine: WebVowl, onTick?: (pos: Float32Array) => void): number {
  let ticks = 0;
  while (!engine.isFinished() && ticks < MAX_TICKS) {
    engine.tick();
    ticks++;
    onTick?.(engine.getNodePositions());
  }
  return ticks;
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
  initSync({ module: readFileSync(wasmPath) });
});

describe('the nine legacy ontologies through the normaliser into the real engine', () => {
  it('covers every file in legacy/src/app/data', () => {
    const onDisk = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
    expect(onDisk).toEqual([...FILES].sort());
  });

  describe.each(FILES)('%s', (file) => {
    const [expectedNodes, expectedEdges] = EXPECTED[file];

    it('loads without an engine error, with the expected node and edge counts', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      const engine = new WebVowl();
      try {
        expect(() => engine.loadOntology(JSON.stringify(n.engine))).not.toThrow();
        expect(engine.getNodeCount()).toBe(expectedNodes);
        expect(engine.getEdgeCount()).toBe(expectedEdges);
        expect(n.engine.class).toHaveLength(expectedNodes);
        expect(n.engine.property).toHaveLength(expectedEdges);
        // Nothing in the real corpus needs dropping.
        expect(n.report.dropped.filter((d) => d.id !== '')).toEqual([]);
      } finally {
        engine.free();
      }
    });

    it('never labels a node with a bare owl2vowl numeric id', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      // owl2vowl ids are opaque numbers; a node labelled with one carries no
      // meaning. (The hand-written benchmark uses readable ids such as
      // "EightSymmetric" with no label, which WebVOWL also shows as the id.)
      const bare = n.nodes.filter((v) => v.labelSource === 'id' && /^\d+$/.test(v.id)).map((v) => `${v.id} (${v.vowlType})`);
      expect(bare).toEqual([]);
    });

    it('builds the store graph from the same object, with node ids equal to the engine ids', () => {
      useGraphStore.getState().clear();
      const doc = readOntology(file);
      useGraphStore.getState().loadOntology(doc);
      const { nodes, edges, ontology } = useGraphStore.getState();

      const engine = new WebVowl();
      try {
        engine.loadOntology(JSON.stringify(ontology!.engine));
        expect([...engine.getNodeIds()].sort()).toEqual([...nodes.keys()].sort());
        expect(nodes.size).toBe(expectedNodes);
        expect(edges.size).toBe(expectedEdges);
        // Every edge has both endpoints in the graph, so every edge can render.
        for (const e of edges.values()) {
          expect(nodes.has(e.source) && nodes.has(e.target)).toBe(true);
        }
      } finally {
        engine.free();
      }
    });

    it.skipIf(expectedNodes < 2)('seeds distinct positions off the origin and reaches isFinished', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      const engine = new WebVowl();
      try {
        engine.loadOntology(JSON.stringify(n.engine));
        // Since 0.3.0 loadOntology keeps settings made before it; the hook
        // still applies them after each load, and so does this test.
        configure(engine);
        engine.initSimulation();

        const seed = engine.getNodePositions();
        expect(seed.length).toBe(expectedNodes * 2);
        expectDistinctAndSpread(seed, expectedNodes, 2 * SEED_RADIUS * 0.9);

        const ticks = runToFinish(engine);
        expect(engine.isFinished()).toBe(true);
        expect(ticks).toBeLessThan(MAX_TICKS);
      } finally {
        engine.free();
      }
    });

    // vowl-wasm 0.2.3 diverged here (peaks of 1e7 and beyond; ADR-001
    // closeout 2026-11-23). 0.3.0 fixed the force simulation, and this is the
    // inverted assertion: bounded, finite, no coincident nodes, settled.
    it.skipIf(expectedNodes < 2)('lays out bounded, finite, without coincident nodes, and settles', () => {
      const n = normaliseOwl2Vowl(readOntology(file));
      const engine = new WebVowl();
      try {
        engine.loadOntology(JSON.stringify(n.engine));
        configure(engine);
        engine.initSimulation();
        const run = runLayout(engine);

        expect(engine.isFinished()).toBe(true);
        expect(run.ticks).toBeLessThan(MAX_TICKS);
        expect(run.allFinite).toBe(true);
        expect(run.peak).toBeLessThan(boundFor(expectedNodes));
        // Measured 9.4 to 31 across the corpus; 1 unit means two nodes drawn
        // on top of each other.
        expect(minPairDistance(engine.getNodePositions())).toBeGreaterThan(1);
        // Measured at most 0.006 on the last tick.
        expect(run.lastStep).toBeLessThan(0.05 * LINK_DISTANCE);
      } finally {
        engine.free();
      }
    });
  });
});

describe('the sample ontologies behind the drop zone buttons (public/ontologies)', () => {
  const publicDir = path.resolve(modernRoot, 'public/ontologies');
  const samples = readdirSync(publicDir).filter((f) => f.endsWith('.json')).sort();

  it('includes the three sample buttons', () => {
    expect(samples).toEqual(['foaf.json', 'minimal.json', 'sioc.json']);
  });

  it.each(samples)('%s loads into the engine with the normaliser\'s counts and nothing dropped', (file) => {
    const n = normaliseOwl2Vowl(JSON.parse(readFileSync(path.join(publicDir, file), 'utf8')));
    const engine = new WebVowl();
    try {
      expect(() => engine.loadOntology(JSON.stringify(n.engine))).not.toThrow();
      expect(engine.getNodeCount()).toBe(n.nodes.length);
      expect(engine.getEdgeCount()).toBe(n.edges.length);
      expect(n.nodes.length).toBeGreaterThan(0);
      expect(n.report.dropped).toEqual([]);
    } finally {
      engine.free();
    }
  });
});

describe('the layout oracle on a hub-free graph', () => {
  // Control for the corpus assertions above: a chain (out-degree 1
  // everywhere) has no hubs, so it isolates the oracle itself. It also passed
  // on 0.2.3, which diverged only on graphs with hubs.
  it('a 12-node chain stays within the bound, spread, with no coincident nodes', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const n = normaliseOwl2Vowl({
      class: ids.map((id) => ({ id, type: 'owl:Class' })),
      property: ids.slice(1).map((id, i) => ({ id: `p${i}`, type: 'owl:ObjectProperty', domain: ids[i], range: id }))
    });
    const engine = new WebVowl();
    try {
      engine.loadOntology(JSON.stringify(n.engine));
      configure(engine);
      engine.initSimulation();
      const run = runLayout(engine);
      expect(engine.isFinished()).toBe(true);
      expect(run.allFinite).toBe(true);
      expect(run.peak).toBeLessThan(boundFor(ids.length));
      expectDistinctAndSpread(engine.getNodePositions(), ids.length, 100);
    } finally {
      engine.free();
    }
  });
});

describe('position updates do not reset the graph', () => {
  beforeEach(() => {
    useGraphStore.getState().clear();
  });

  it('bumps graphVersion only on load and clear', () => {
    const v0 = useGraphStore.getState().graphVersion;
    useGraphStore.getState().loadOntology(readOntology('foaf.json'));
    const v1 = useGraphStore.getState().graphVersion;
    expect(v1).toBe(v0 + 1);

    const { ontology } = useGraphStore.getState();
    const engine = new WebVowl();
    try {
      engine.loadOntology(JSON.stringify(ontology!.engine));
      engine.initSimulation();
      const ids = engine.getNodeIds();
      for (let i = 0; i < 30; i++) {
        engine.tick();
        useGraphStore.getState().updateNodePositions(ids, engine.getNodePositions());
      }
      expect(useGraphStore.getState().graphVersion).toBe(v1);

      // The store really holds the engine's positions.
      const pos = engine.getNodePositions();
      const n0 = useGraphStore.getState().nodes.get(ids[0])!;
      expect(n0.position.x).toBeCloseTo(pos[0], 3);
      expect(n0.position.y).toBeCloseTo(pos[1], 3);
    } finally {
      engine.free();
    }

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
