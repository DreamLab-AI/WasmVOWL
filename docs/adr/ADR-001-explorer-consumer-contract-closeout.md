---
id: ADR-001
title: Bind explorer release to a verified consumer schema and publisher lineage
date: 2026-09-04
decision_status: proposed
implementation_status: partial
activation_status: inactive
owner: explorer-maintainer-role-unassigned
review_trigger: schema, WASM binding, publisher copy or release changes
verified_commit: 36105cc3ad04a91415b889799e8608b08cf68b45
---

# ADR-001 — Explorer consumer contract and closeout

## Context

The standalone modern explorer and publisher copies have diverged. The standalone hook sends nodes/edges to a Rust parser requiring class/classes; Map mutation fails in the current frontend suite. Local Rust success does not establish browser/WASM integration. The review reports 47 passing native tests and frontend results of 19 passed, 60 failed.

## Proposed decision

Treat a versioned consumer schema and reproducible publisher lineage as release requirements. Name the maintained standalone and publisher variants; bind their Rust/WASM artefacts and ontology projection to the release manifest. Keep this proposal inactive until adopted through the maintainer's decision process. The owner role above is required, not an accepted personal assignment.

## Closeout extension — 2026-09-04

> Note 2026-11-21: the "Map mutation fails" and "19 passed, 60 failed" statements in Context are out of date. The Map failure was real: `modern/src/stores/useGraphStore.ts` never enabled Immer's MapSet plugin, so every `set()` on the store threw (now `enableMapSet()` there, near the top of the file). The same change fixed two store actions that called other actions from inside `set()` and lost the result (statistics after `loadOntology`, filters). `modern/` now passes 79 of 79 under `npm --prefix modern test`. The hook/parser mismatch, topology reset, real-corpus browser load and the remaining acceptance items are not addressed by this change and stay open.

Work packages: CP-01/02/06/08. Dependencies: authoritative corpus/export identity, schema agreement and a browser-capable validation environment.

Acceptance requires resolving Map initialisation and the hook/parser mismatch; proving that simulation ticks do not repeatedly reset topology; loading the actual corpus in a browser with the actual WASM module; retaining labels, endpoints and datatype semantics; and demonstrating visible errors, keyboard access, search/filter/selection/export and measured performance. Preserve historical reports as dated evidence and qualify any claim whose tested revision or hardware is unknown.

Evidence: [estate explorer review](../../../VisionFlow/docs/estate-review/ontology-explorer.md) and [source/test receipt](../../../VisionFlow/docs/estate-review/evidence/explorer-snapshot.json). No live deployment, graphics or performance acceptance is claimed.

## Estate execution scope — 2026-09-07

The standalone demo remains a held variant, distinct from the deployed publisher explorer using the maintained vowl-wasm package. The [current estate audit](../../../VisionFlow/docs/estate-review/2026-09-07-estate-audit.md) retains the source mismatch and dated failing tests; a passing public publisher search journey does not close this proposal. No standalone deployment or performance claim is added.

## Remote integration qualification — 2026-09-07

Remote commit `b359aa0` extracts the vendored Rust crate, installs the v0.1.1 release archive and adds stable node-ID/position accessors in the React hook. The integration retains those changes and the local hygiene/rebranding commits. The hook still sends `nodes`/`edges`; generation/schema agreement and topology lifetime remain consumer acceptance requirements. Prior native test counts describe the removed local engine, not the installed archive. The proposed/partial/inactive axes are unchanged.

## Consumer contract closeout — 2026-11-23

Branch `fix/engine-contract-and-layout` (base `af25086`). Browser runs: production build served by `vite preview`, driven in the estate's browser sidecar (Chrome 159 beta, GPU not recorded). The modern explorer now consumes vowl-wasm 0.2.3 (release tarball sha256 `55cbf3cf…d5e1`, verified against the release `.sha256`; lock integrity is the sha512 of those bytes; `vite build` emits the same `vowl_wasm_bg.wasm`, sha256 `e056639c…da0a`, loaded through `new URL(…, import.meta.url)`). The proposed/partial/inactive axes are unchanged.

Closed by this change, with evidence:

- **Hook/parser mismatch.** `modern/src/lib/owl2vowl.ts` merges owl2vowl base and attribute records into the engine's `{class, property}` shape; store and engine are built from that one object. `modern/tests/integration/engine.real.test.ts` loads the real WASM from its bytes in Node: all nine `legacy/src/app/data` files load without an engine error, with hand-derived counts (benchmark 52/86, foaf 56/74, goodrelations 147/461, muto 16/26, ontovibe 55/70, personasonto 100/247, sioc 49/125; new_ontology and template 0/0) and engine node ids equal to store node ids.
- **Ticks do not reset topology.** The hook's load effect keys on `graphVersion`, bumped only by load and clear; a frame is written with one `updateNodePositions` call. Mock-engine tests drive 60 frames and see one `loadOntology` and one `initSimulation`; the real-engine test shows 30 position updates leave `graphVersion` unchanged. In the browser (`?debug` counters) foaf, goodrelations and sioc each showed `loadOntology` 1, `initSimulation` 1, 300 ticks, alpha below 0.001 (`isFinished`), `graphVersion` 1.
- **Labels, endpoints, datatype semantics.** Labels come from the language maps, then the IRI, then a type name (Literal, Thing, Union, Intersection, Complement, Disjoint union, Anonymous class); the real-engine test asserts no node in the nine files falls back to an opaque numeric owl2vowl id, and the rebuilt bundle showed 0 numeric labels for goodrelations in the browser (60 union nodes labelled "Union"). Every edge has both endpoints in the graph (all 74 / 461 / 125 edges for foaf / goodrelations / sioc in the browser), datatype and literal nodes keep their kind and VOWL fill, subclass/disjoint/set-operator relations keep their kind. Edge-case rules (missing domain/range, arrays, undeclared datatype ranges, drops) are in the module header and `modern/tests/unit/owl2vowl.test.ts`.
- **Visible errors.** Engine init, load, node-set mismatch and tick errors, malformed documents and empty documents are raised as UI notifications (browser: "new_ontology.json contains no classes to display"; "Failed to load file: Invalid owl2vowl document: 'class' must be an array").

Stays open:

- **Layout quality (upstream defect).** *Superseded by the 0.3.0 adoption below: bounded layout met, readability partial.* vowl-wasm 0.2.3's `WebVowl` ForceSimulation diverges on every corpus graph: the highest out-degree node grows about 10× per tick (peak |coordinate| in the browser: foaf 1.5e19, sioc 4.1e22, goodrelations 2.6e30). Cause, from the 0.2.3 source: attraction is scaled by alpha in the force and again in integration (stiffness ≈ out-degree × alpha²), comes only from out-neighbours with no degree normalisation and parallel edges stacking, centre strength is 1.0, and `loadOntology` also resets the simulation config (the hook now reapplies it). vowl-wasm `origin/main` at `f04ff27` (fetched 2026-11-23) has no layout change since v0.2.3 beyond one lint attribute. In an exploratory probe kept outside the repo (edges symmetrised, self-loops dropped), the same graphs in 0.2.3's `NggExplorer` (CSR simulator, via `encodeNgg1`/`loadCsr`) stayed bounded (peak about 300 for foaf, sioc and goodrelations; minimum pairwise distance 15.9 / 8.2 / 2.0), which points at that simulator, or a patched `ForceSimulation`, as the fix path. A characterisation test asserts the divergence and has a bounded 12-node chain as positive control; it is to be flipped when the engine is fixed.
- Keyboard access, search/filter/selection/export acceptance, measured performance (not measured; goodrelations visibly renders slowly with 461 edges on the sidecar) and publisher lineage are not addressed.

## Engine 0.3.0 adoption — 2026-11-23

Same branch. The explorer now pins `@dreamlab-ai/vowl-wasm` `0.3.0` from the npm registry (exact version, lock `resolved` on registry.npmjs.org, integrity `sha512-TzR8h1Lx…oKQ==`). The npm tarball is byte-identical to the GitHub release asset `vowl-wasm-0.3.0-pkg.tgz` (both sha256 `d2af7e50…d305`, the value in the release `.sha256`). Its npm SLSA provenance names `DreamLab-AI/vowl-wasm`, `.github/workflows/release.yml`, `refs/tags/v0.3.0`. The registry is preferred to the release URL now that releases publish there with provenance. `vite build` emits `assets/vowl_wasm_bg-*.wasm` (272 kB), loaded through `new URL("/assets/vowl_wasm_bg-….wasm", import.meta.url)`. 0.3.0 fixes the force simulation: springs act on both ends with d3's degree-normalised strength, the charge sign is repulsive, there is a short-range limit and d3 `forceCenter` centring, and settings survive `loadOntology`. The proposed/partial/inactive axes are unchanged.

**Real-engine evidence** (`modern/tests/integration/engine.real.test.ts`, Node, the hook's settings read from `useUIStore`: link distance 100, charge −300). The divergence characterisation is inverted. For each of the seven non-empty corpus files the test now asserts:

- every coordinate on every tick is finite and below 10 × link distance × √n;
- `isFinished` is reached before 2000 ticks (it takes 300);
- no two nodes are within 1 unit (measured minimum 9.4 to 31);
- the last tick moves no node more than 0.05 × link distance (measured at most 0.006).

The 12-node chain stays as the hub-free control. Measured peaks over the whole run, against their bounds: benchmark 398/7211, foaf 366/7483, goodrelations 415/12124, muto 388/4000, ontovibe 351/7416, personasonto 334/10000, sioc 348/7000. None exceeds the 300-unit seed circle by more than about 40%.

**Browser evidence.** Vite dev server with `NODE_ENV=development`, `?debug`, browser sidecar at a 1920×993 viewport. Each file was dropped as a `DataTransfer` drop on the drop zone, using the menu's New button between files. Positions were read from the store after `isFinished` plus 2.5 s.

| File | Charge | Nodes / edges | Engine loads (cumulative) | Final extent x, y | Min pair distance | Pairs closer than one node diameter (40) |
|---|---|---|---|---|---|---|
| foaf | −300 | 56 / 74 | 1 | −366…211, −315…313 | 11.8 | 34 |
| goodrelations | −300 | 147 / 461 | 2 | −276…415, −222…177 | 9.4 | 536 |
| goodrelations | −1000 | 147 / 461 | 3 | −385…432, −267…215 | 15.1 | 305 |
| sioc | −300 | 49 / 125 | 4 | −253…234, −267…247 | 15.0 | 33 |

- `initSimulation` matched `loadOntology` (one each per file), every run finished in 300 ticks, and every coordinate was finite.
- The browser numbers equal the Node numbers for the same graph and settings.
- No console errors or warnings.

**Layout acceptance.**

- **Bounded and settled: met.** Shown in the table and the tests above.
- **Readable: partial.**
  - *foaf and sioc:* the whole graph fits the viewport once zoomed out, with labelled hubs and spokes. The dense core of each still overlaps labels.
  - *goodrelations:* 147 nodes and 461 edges settle inside roughly 700 × 450 units, a hairball whose core labels are unreadable at any zoom.
  - *Why:*
    - The engine's alpha schedule always stops at 300 ticks, and `WebVowl` exposes no alpha-decay or collision setting.
    - Node discs are 40 units across, against a link distance of 100.
- **Default camera framing.** The camera sits at z = 500 with a 50° field of view, so it shows about ±233 units vertically. Every settled corpus layout is larger than that, so the user has to zoom out with the mouse wheel. The menu's zoom buttons change `viewport.zoom` but do not move the camera (a pre-existing defect).

**Charge setting kept at −300.** The Node sweep covered link distance 100 and 150 against charge −30, −300 and −1000.

- Against the engine default of −30, −300 roughly halves the overlapping pairs on every file and doubles the minimum separation.
- Going on to −1000 cuts overlapping pairs by a further 33–68% on six files (goodrelations 536 → 305); on muto they go from 2 to 0.
- The cost of −1000 is larger graphs:
  - foaf's peak goes from 366 to 602;
  - at link distance 150, one ontovibe node went to 1494.
- On goodrelations the core stays unreadable at either setting.

Since −1000 does not make the dense case readable and pushes the sparse ones further outside the default camera framing, the hook keeps −300 (and link distance 100). The hook still applies its settings after every load, although 0.3.0 no longer resets them.

**Disconnected components.**

- 0.3.0 does not attract separate components towards each other: d3 `forceCenter` moves only the centroid. So small components stay near the initial 300-unit seed circle while the main component contracts inside it (foaf: main component radius 220, eleven small components at 82 to 380 from the centre; goodrelations: 141-node component radius 191, its 4-, 1- and 1-node components at 285 to 383).
- In the UI they appear as isolated nodes or tiny clusters ringing the main graph. The singletons below come from a union-find over the normalised edges; their screen placement was read off the screenshots.
  - foaf: `LabelProperty` on the left; `Person` (twice), `ImageObject` and `Agent` below; `Class` to the right; `CreativeWork` above;
  - goodrelations: a `Thing` with three `Literal`s (the `productID`/`name`/`description` properties) on the right, and the deprecated "N-ary relations" and "Location of sales or service provisioning" classes on the left.
- This is the known limitation reported by the vowl-wasm agent. It reads as "not connected" rather than as an error.

**Debug hook.** `window.__wasmvowl` is now installed only when `import.meta.env.DEV` is true, and then only with `?debug`. The production bundle contains no `__wasmvowl` string and no `?debug` check (grep of `dist/assets/*.js`). A dev server started from a shell that exports `NODE_ENV=production` reports `DEV: false`, so the browser run above set `NODE_ENV=development`.

**Production preview smoke.** `vite build` output served by `vite preview` on 0.0.0.0, with foaf and sioc dropped the same way:

- each `.wasm` request (`assets/vowl_wasm_bg-lQVkJm7H.wasm`) returned HTTP 200;
- the header showed 56 / 74 and 49 / 125;
- `window.__wasmvowl` was undefined even with `?debug`;
- no console errors;
- the settled layouts look the same as the dev-server runs (the engine is deterministic for a given graph and settings).

goodrelations was not repeated on the preview.

Screenshots and the position JSON are kept outside the repo, in the agent session's scratch directory (`browser-evidence-030/`):

- foaf and sioc, each settled at the default camera and zoomed out;
- goodrelations at −300 zoomed out only (the default-camera capture failed);
- goodrelations at −1000 at the default camera and zoomed out;
- the preview's foaf and sioc, zoomed out.

Stays open:

- Readability of dense graphs (goodrelations). This is engine-side: alpha schedule, collision, and component packing for disconnected parts.
- Default camera framing and the unwired zoom buttons.
- Keyboard access, search/filter/selection/export acceptance and measured performance. On the sidecar the one-tick-per-frame simulation took about 50 s for 300 ticks on foaf and sioc (about 170 ms per frame) and 116 s on goodrelations at −300 (about 390 ms per frame). These are observations, not a benchmark.
- Publisher lineage.

## Camera, labels and CI — 2026-11-23

Branch `feat/readable-camera-labels-ci` (base `ccb934e`). Engine unchanged: `@dreamlab-ai/vowl-wasm` 0.3.0, hook settings link distance 100 and charge −300. The proposed/partial/inactive axes are unchanged.

Closed by this change:

- **Default camera framing.** `modern/src/lib/cameraFit.ts` computes the camera distance and centre that show the graph's bounds, with padding, inside the visible part of the canvas: the part on screen and not under an element marked `data-canvas-overlay` (the menu bar and the sidebar). The canvas is `100vh` tall below a 77 px menu, so its bottom 77 px were off-screen, and the 350 px sidebar covers its right edge. The bounds include every node's disc and its estimated label box, wrapped lines included (`framingPoints` in `modern/src/lib/nodeGeometry.ts`). `CameraController` frames the graph on load, re-frames it every 300 ms while the layout runs, and frames it again when the layout settles. It stops following once the user drags or wheels the camera or uses a menu zoom. Switching 2D/3D frames from that mode's default angle. The far plane and the orbit limit grow with the fitted distance. The camera's `far` had been three.js's default 2000 and the orbit limit was also 2000, either of which would have clipped a fitted large graph. Tests: `modern/tests/unit/cameraFit.test.ts`, which projects the fitted bounds back to pixels and checks they lie in the free area, centred; and `nodeGeometry.test.ts`.
- **Zoom buttons.** Zoom in and out, the new **Fit** button and reset now queue a `cameraRequest` (`useUIStore`) that `CameraController` carries out. Zoom moves the camera along its view direction, 1.25x per click, clamped to 50 to 50,000 units. They used to write `viewport.zoom`, which nothing read. `GraphCanvas` now selects only the view mode from the store. It used to subscribe to the whole store and pass a new camera `position` array on every render. Tests: `useUIStore.test.ts` and `TopMenuBar.test.tsx`.
- **Label declutter.** `modern/src/lib/labelDeclutter.ts`, fed by `labelCandidates.ts` and run by `LabelDeclutter` at most every 250 ms when positions, selection or zoom change:
  - A label is hidden when its on-screen font would fall below its kind's minimum: edge labels 8 px; datatype, literal, owl:Thing and set-operator labels 7 px; class labels have none.
  - The remaining labels are placed greedily, class labels first, then minor node labels, then edge labels, higher degree first within a kind. A label whose box would overlap one already placed is hidden.
  - The selected and hovered node, and the selected node's edges, always keep their labels.
  - Tests: `labelDeclutter.test.ts`, `labelCandidates.test.ts`, `useLabelStore.test.ts`.
- **CI.** `.github/workflows/ci.yml` runs `npm ci`, lint, type-check, test and build in `modern/` on push to `master` and on pull requests, plus `checks/root-surface.test.mjs`. The actions are pinned by SHA: checkout v4.4.0 (the pin vowl-wasm uses) and setup-node v4.4.0 (the pin most common across the estate's workflows; both SHAs checked against the upstream tags). The dead `.travis.yml` (Node 4-6, `grunt jshint`, no Gruntfile) is removed, and a root-surface check keeps it out and keeps deploy steps out of CI. No deploy or Pages workflow was added.

**Browser evidence.** Vite dev server (`NODE_ENV=development`, `?debug`), browser sidecar, 1920×993 viewport. Each file was dropped as a `DataTransfer` drop, with no manual zoom. The screenshots and a measurements file are kept outside the repo, in the agent session's scratch directory (`browser-evidence-readability/`).

| File | Nodes / edges | Ticks | Settled extent x, y | Node labels hidden | Edge labels hidden |
|---|---|---|---|---|---|
| foaf | 56 / 74 | 300 | −366…211, −314…313 | 22 of 56 | 66 of 74 |
| sioc | 49 / 125 | 300 | −253…234, −267…247 | 17 of 49 | 118 of 125 |
| goodrelations | 147 / 461 | 300 | −276…415, −222…177 | 112 of 147 | 245 of 461 |

- At the default camera after settling, each whole graph sat inside the free area, including goodrelations' far-left deprecated classes with their four-line labels and its separate `Thing`/`Literal` component on the right.
- The zoom buttons moved the camera in and out, and Fit returned to the framed view.
- `loadOntology` and `initSimulation` ran once per file. There were no console errors or warnings.

Stays open:

- **Overlap and density.** The layout still packs nodes closer than their drawn discs: the engine has no collision force. goodrelations' core is a hairball whose labels mostly declutter away. Labels can still sit on top of other nodes' discs, because the declutter tests label against label only.
- **Label boxes are estimates.** They assume a 0.6 em glyph advance and even wrapping. A long unbreakable word can be wider than estimated, so a residual overlap is possible.
- **Engine.** The hook is unchanged, and WasmVOWL is the only consumer of the `WebVowl` simulator; the other explorers use `NggExplorer`. The likely next step is to move WasmVOWL onto `NggExplorer` rather than add forces to `WebVowl`. A parked draft (DreamLab-AI/vowl-wasm#5) records collision, positional-gravity and annealing setters for `WebVowl` with fixture evidence, in case that move does not happen.
- Keyboard access, search/filter/selection/export acceptance, measured performance and publisher lineage, as before.

