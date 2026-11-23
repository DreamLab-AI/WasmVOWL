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

Branch `fix/engine-contract-and-layout` (base `af25086`). The modern explorer now consumes vowl-wasm 0.2.3 (release tarball sha256 `55cbf3cf…d5e1`, verified against the release `.sha256`; lock integrity is the sha512 of those bytes; `vite build` emits the same `vowl_wasm_bg.wasm`, sha256 `e056639c…da0a`, loaded through `new URL(…, import.meta.url)`). The proposed/partial/inactive axes are unchanged.

Closed by this change, with evidence:

- **Hook/parser mismatch.** `modern/src/lib/owl2vowl.ts` merges owl2vowl base and attribute records into the engine's `{class, property}` shape; store and engine are built from that one object. `modern/tests/integration/engine.real.test.ts` loads the real WASM from its bytes in Node: all nine `legacy/src/app/data` files load without an engine error, with hand-derived counts (benchmark 52/86, foaf 56/74, goodrelations 147/461, muto 16/26, ontovibe 55/70, personasonto 100/247, sioc 49/125; new_ontology and template 0/0) and engine node ids equal to store node ids.
- **Ticks do not reset topology.** The hook's load effect keys on `graphVersion`, bumped only by load and clear; a frame is written with one `updateNodePositions` call. Mock-engine tests drive 60 frames and see one `loadOntology` and one `initSimulation`; the real-engine test shows 30 position updates leave `graphVersion` unchanged. In the browser (production build, `?debug` counters) foaf, goodrelations and sioc each showed `loadOntology` 1, `initSimulation` 1, 300 ticks, alpha below 0.001 (`isFinished`).
- **Labels, endpoints, datatype semantics.** Labels come from the language maps (all 56 foaf / 147 goodrelations / 49 sioc nodes labelled in the browser), every edge has both endpoints in the graph, datatype and literal nodes keep their kind and VOWL fill, subclass/disjoint/set-operator relations keep their kind. Edge-case rules (missing domain/range, arrays, undeclared datatype ranges, drops) are in the module header and `modern/tests/unit/owl2vowl.test.ts`.
- **Visible errors.** Engine init, load, node-set mismatch and tick errors, malformed documents and empty documents are raised as UI notifications (browser: "new_ontology.json contains no classes to display"; "Failed to load file: Invalid owl2vowl document: 'class' must be an array").

Stays open:

- **Layout quality (upstream defect).** vowl-wasm 0.2.3's `WebVowl` ForceSimulation diverges on every corpus graph: the highest out-degree node grows about 10× per tick (peak |coordinate| in the browser: foaf 1.5e19, sioc 4.1e22, goodrelations 2.6e30). Cause, from the 0.2.3 source: attraction is scaled by alpha in the force and again in integration (stiffness ≈ out-degree × alpha²), comes only from out-neighbours with no degree normalisation and parallel edges stacking, centre strength is 1.0, and `loadOntology` also resets the simulation config (the hook now reapplies it). `git log v0.2.3..main` shows no fix. The same graphs in 0.2.3's `NggExplorer` (CSR simulator, via `encodeNgg1`/`loadCsr`) stay bounded (foaf peak 300, min pairwise distance 15.9). A characterisation test asserts the divergence and has a bounded 12-node chain as positive control; it is to be flipped when the engine is fixed.
- Keyboard access, search/filter/selection/export acceptance, measured performance (goodrelations renders at roughly 7 fps with 461 edges) and publisher lineage are not addressed.
