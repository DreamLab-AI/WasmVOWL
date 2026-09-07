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

Work packages: CP-01/02/06/08. Dependencies: authoritative corpus/export identity, schema agreement and a browser-capable validation environment.

Acceptance requires resolving Map initialisation and the hook/parser mismatch; proving that simulation ticks do not repeatedly reset topology; loading the actual corpus in a browser with the actual WASM module; retaining labels, endpoints and datatype semantics; and demonstrating visible errors, keyboard access, search/filter/selection/export and measured performance. Preserve historical reports as dated evidence and qualify any claim whose tested revision or hardware is unknown.

Evidence: [estate explorer review](../../../VisionFlow/docs/estate-review/ontology-explorer.md) and [source/test receipt](../../../VisionFlow/docs/estate-review/evidence/explorer-snapshot.json). No live deployment, graphics or performance acceptance is claimed.

## Estate execution scope — 2026-09-07

The standalone demo remains a held variant, distinct from the deployed publisher explorer using the maintained vowl-wasm package. The [current estate audit](../../../VisionFlow/docs/estate-review/2026-09-07-estate-audit.md) retains the source mismatch and dated failing tests; a passing public publisher search journey does not close this proposal. No standalone deployment or performance claim is added.
