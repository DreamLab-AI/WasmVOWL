/**
 * owl2vowl document normaliser.
 *
 * owl2vowl (and the WebVOWL JSON it feeds) splits each element in two: a base
 * record in `class` / `property` / `datatype` carrying the id and type, and an
 * attribute record in `classAttribute` / `propertyAttribute` /
 * `datatypeAttribute` carrying the label, IRI, domain, range and the rest.
 * This module merges the two halves once and returns the node and edge
 * records the graph store renders; `toLayoutGraph` (src/lib/layoutGraph.ts)
 * maps the same records onto the layout engine's input, so the drawing and
 * the layout can never disagree.
 *
 * Decisions, one per edge case (each has a unit test in
 * tests/unit/owl2vowl.test.ts):
 *
 * - Merging: a base record's own fields win; the attribute record with the same
 *   id fills in the rest (WebVOWL `addAdditionalAttributes`).
 * - `datatype` / `datatypeAttribute` (the WebVOWL benchmark format) are merged
 *   into the node list after the classes.
 * - Datatype and literal ranges (`rdfs:Datatype`, `rdfs:Literal`) stay nodes,
 *   as owl2vowl and WebVOWL draw them, with node kind `datatype` / `literal`.
 *   A range that names an undeclared datatype (`xsd:…`, an XML Schema IRI, or
 *   `rdfs:Literal`) gets its own datatype node for that edge, as owl2vowl
 *   emits one datatype node per use.
 * - Labels: language map `en`, then `IRI-based`, `undefined`, `default`, any
 *   other value; then the IRI fragment; then a name for the type (`Literal`,
 *   `Thing`, and `Union` / `Intersection` / `Complement` / `Disjoint union`
 *   for anonymous set-operator classes, `Anonymous class` for other classes
 *   owl2vowl marks anonymous); then the id. `labelSource` records
 *   which. No node is left with an empty label.
 * - A property missing its domain or range first takes the swapped endpoints
 *   of its inverse property (named on either side, WebVOWL
 *   `createPropertyStructure`); failing that, the missing end is attached to
 *   one shared, synthesised `owl:Thing` node (the VOWL default for an
 *   unrestricted domain or range).
 * - A multi-valued domain or range becomes one edge per (domain, range) pair;
 *   the first keeps the property id, the others are `id#1`, `id#2`, ...
 * - Subclass and disjointness relations are taken where owl2vowl puts them, as
 *   `rdfs:SubClassOf` / `owl:disjointWith` properties. `superClasses` and
 *   `subClasses` on class attributes repeat them and stay node metadata.
 * - Set operators: `union`, `intersection`, `complement` and `disjointUnion`
 *   on a class generate `GENERATED-<OP>-<class>-<member>-<i>` edges (WebVOWL
 *   `addSetOperatorProperties`).
 * - Equivalent classes are kept as their own nodes (WebVOWL merges them into
 *   one; not done here).
 * - `inverse` is kept on the store edge only; the inverse property is its
 *   own edge in the list.
 * - Dropped, and recorded in `report.dropped` (and logged by the caller):
 *   records with an empty id, a repeated id (the first wins), and edges whose
 *   endpoint names no node.
 */

import type { EdgeType, NodeType } from '../types/graph';

/** Id of the synthesised node standing for owl:Thing when a domain or range is missing. */
export const OWL_THING_ID = 'vowl:owl-thing';

/** Prefix of the per-edge datatype nodes synthesised for undeclared datatype ranges. */
export const DATATYPE_NODE_PREFIX = 'vowl:datatype:';

const XSD_IRI = 'http://www.w3.org/2001/XMLSchema#';
const RDFS_LITERAL_IRI = 'http://www.w3.org/2000/01/rdf-schema#Literal';

/** If `ref` names a datatype (rather than a node id), its IRI-ish form and label. */
function datatypeRef(ref: string): { vowlType: string; label: string; iri: string } | undefined {
  if (ref === 'rdfs:Literal' || ref === RDFS_LITERAL_IRI) {
    return { vowlType: 'rdfs:Literal', label: 'Literal', iri: RDFS_LITERAL_IRI };
  }
  if (ref.startsWith('xsd:') && ref.length > 4) {
    return { vowlType: 'rdfs:Datatype', label: ref, iri: XSD_IRI + ref.slice(4) };
  }
  if (ref.startsWith(XSD_IRI) && ref.length > XSD_IRI.length) {
    return { vowlType: 'rdfs:Datatype', label: `xsd:${ref.slice(XSD_IRI.length)}`, iri: ref };
  }
  return undefined;
}

export interface PropertyCharacteristics {
  functional: boolean;
  inverseFunctional: boolean;
  transitive: boolean;
  symmetric: boolean;
}

export interface NormalisedNode {
  id: string;
  /** Store node kind (class, datatype, literal). */
  kind: NodeType;
  /** The owl2vowl type as written, e.g. `owl:Class`, `owl:Thing`, `rdfs:Literal`, `owl:unionOf`. */
  vowlType: string;
  label: string;
  /** Where the label came from: the document, the IRI fragment, the type, or the id. */
  labelSource: 'document' | 'iri' | 'type' | 'id';
  iri?: string;
  comment?: string;
  /** owl2vowl attribute flags (`external`, `deprecated`, ...). */
  attributes: string[];
  instances: number;
  individuals: number;
  equivalent: string[];
  superClasses: string[];
  subClasses: string[];
  /** True for nodes the normaliser created (the shared owl:Thing, per-edge datatypes). */
  synthetic: boolean;
}

export type EndpointSource = 'declared' | 'inverse' | 'owl:Thing' | 'generated';

export interface NormalisedEdge {
  id: string;
  /** The property id this edge came from (differs from `id` for expanded pairs). */
  propertyId: string;
  source: string;
  target: string;
  kind: EdgeType;
  vowlType: string;
  label: string;
  iri?: string;
  comment?: string;
  attributes: string[];
  characteristics: PropertyCharacteristics;
  inverse?: string;
  cardinality?: { exact?: string; min?: string; max?: string };
  endpoints: EndpointSource;
  generated: boolean;
}

export interface DroppedRecord {
  kind: 'class' | 'property';
  id: string;
  reason: string;
}

export interface NormalisationReport {
  dropped: DroppedRecord[];
  /** Property ids whose missing domain or range was attached to owl:Thing. */
  thingFallbacks: string[];
  /** Property ids whose endpoints came from their inverse property. */
  inverseResolved: string[];
  /** Property ids expanded into several edges. */
  expanded: string[];
  /** Edge ids whose undeclared datatype range got its own datatype node. */
  datatypesSynthesised: string[];
}

export interface NormalisedOntology {
  /** Marker so the store can tell a normalised object from a raw document. */
  readonly normalised: true;
  nodes: NormalisedNode[];
  edges: NormalisedEdge[];
  metadata: { title?: string; iri?: string; version?: string; description?: string };
  report: NormalisationReport;
}

type Rec = Record<string, unknown>;

const LABEL_PREFERENCE = ['en', 'IRI-based', 'undefined', 'default'];

/** Label for a node with neither a label nor an IRI, by owl2vowl type (lower-cased). */
const TYPE_LABEL: Record<string, string> = {
  'rdfs:literal': 'Literal',
  'owl:thing': 'Thing',
  'owl:unionof': 'Union',
  'owl:intersectionof': 'Intersection',
  'owl:complementof': 'Complement',
  'owl:disjointunionof': 'Disjoint union'
};

const SET_OPERATORS: Array<[string, string]> = [
  ['complement', 'COMPLEMENT'],
  ['intersection', 'INTERSECTION'],
  ['union', 'UNION'],
  ['disjointUnion', 'DISJOINTUNION']
];

/** owl2vowl property type (lower-cased) -> store edge kind. */
const EDGE_KIND: Record<string, EdgeType> = {
  'owl:objectproperty': 'objectProperty',
  'owl:datatypeproperty': 'datatypeProperty',
  'rdfs:subclassof': 'subclass',
  'owl:disjointwith': 'disjoint',
  setoperatorproperty: 'setOperator',
  'rdf:property': 'objectProperty',
  'owl:somevaluesfrom': 'objectProperty',
  'owl:allvaluesfrom': 'objectProperty',
  'owl:equivalentproperty': 'objectProperty',
  'owl:functionalproperty': 'objectProperty',
  'owl:inversefunctionalproperty': 'objectProperty',
  'owl:transitiveproperty': 'objectProperty',
  'owl:symmetricproperty': 'objectProperty'
};

const DEFAULT_EDGE_LABEL: Partial<Record<EdgeType, string>> = {
  subclass: 'Subclass of',
  disjoint: 'Disjoint with'
};

function isRecord(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function idOf(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(idOf).filter((s) => s !== '');
  const one = idOf(v);
  return one === '' ? [] : [one];
}

/** Pick one string from a plain string or an owl2vowl language map. */
function pickText(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() === '' ? undefined : v;
  if (!isRecord(v)) return undefined;
  for (const key of LABEL_PREFERENCE) {
    const s = v[key];
    if (typeof s === 'string' && s.trim() !== '') return s;
  }
  for (const s of Object.values(v)) {
    if (typeof s === 'string' && s.trim() !== '') return s;
  }
  return undefined;
}

function iriFragment(iri: string | undefined): string | undefined {
  if (!iri) return undefined;
  const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  const frag = cut >= 0 ? iri.slice(cut + 1) : '';
  return frag === '' ? undefined : frag;
}

function arrayField(doc: Rec, key: string): Rec[] {
  const v = doc[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    throw new Error(`Invalid owl2vowl document: '${key}' must be an array`);
  }
  return v.filter(isRecord);
}

/** Merge base records with the attribute record of the same id; base fields win. */
function merge(base: Rec[], attributes: Rec[]): Rec[] {
  const byId = new Map<string, Rec>();
  for (const a of attributes) {
    const id = idOf(a.id);
    if (id !== '' && !byId.has(id)) byId.set(id, a);
  }
  return base.map((b) => ({ ...(byId.get(idOf(b.id)) ?? {}), ...b }));
}

function nodeKind(vowlType: string): NodeType {
  switch (vowlType.toLowerCase()) {
    case 'rdfs:datatype':
      return 'datatype';
    case 'rdfs:literal':
      return 'literal';
    default:
      return 'class';
  }
}

function characteristicsOf(rec: Rec, vowlType: string): PropertyCharacteristics {
  const attrs = strList(rec.attributes).map((a) => a.toLowerCase());
  const t = vowlType.toLowerCase();
  const flag = (field: string, attr: string, type: string) =>
    rec[field] === true || attrs.includes(attr) || t === type;
  return {
    functional: flag('functional', 'functional', 'owl:functionalproperty'),
    inverseFunctional: flag('inverseFunctional', 'inverse functional', 'owl:inversefunctionalproperty'),
    transitive: flag('transitive', 'transitive', 'owl:transitiveproperty'),
    symmetric: flag('symmetric', 'symmetric', 'owl:symmetricproperty')
  };
}

/**
 * Normalise an owl2vowl / WebVOWL JSON document.
 *
 * @throws Error when the input is not a JSON object, or when `class`,
 *   `property`, `datatype` or one of the attribute fields is present but not
 *   an array.
 */
export function normaliseOwl2Vowl(doc: unknown): NormalisedOntology {
  if (!isRecord(doc)) {
    throw new Error('Invalid ontology: not an owl2vowl document (expected a JSON object)');
  }

  const report: NormalisationReport = {
    dropped: [],
    thingFallbacks: [],
    inverseResolved: [],
    expanded: [],
    datatypesSynthesised: []
  };

  // ---- nodes -------------------------------------------------------------
  const rawClasses = [
    ...merge(arrayField(doc, 'class'), arrayField(doc, 'classAttribute')),
    ...merge(arrayField(doc, 'datatype'), arrayField(doc, 'datatypeAttribute'))
  ];

  const nodes: NormalisedNode[] = [];
  const nodeIds = new Set<string>();
  const classRecords: Array<[NormalisedNode, Rec]> = [];

  for (const rec of rawClasses) {
    const id = idOf(rec.id);
    if (id === '') {
      report.dropped.push({ kind: 'class', id, reason: 'empty id' });
      continue;
    }
    if (nodeIds.has(id)) {
      report.dropped.push({ kind: 'class', id, reason: 'duplicate id' });
      continue;
    }
    const vowlType = str(rec.type) ?? 'owl:Class';
    const iri = str(rec.iri);
    const docLabel = pickText(rec.label);
    const iriLabel = docLabel ? undefined : iriFragment(iri);
    const anonymous = strList(rec.attributes).includes('anonymous');
    const typeLabel = docLabel || iriLabel
      ? undefined
      : TYPE_LABEL[vowlType.toLowerCase()] ?? (anonymous ? 'Anonymous class' : undefined);
    const label = docLabel ?? iriLabel ?? typeLabel ?? id;
    const labelSource = docLabel ? 'document' : iriLabel ? 'iri' : typeLabel ? 'type' : 'id';
    const individuals = rec.individuals;
    const node: NormalisedNode = {
      id,
      kind: nodeKind(vowlType),
      vowlType,
      label,
      labelSource,
      iri,
      comment: pickText(rec.comment),
      attributes: strList(rec.attributes),
      instances: typeof rec.instances === 'number' ? rec.instances : 0,
      individuals: Array.isArray(individuals) ? individuals.length : typeof individuals === 'number' ? individuals : 0,
      equivalent: strList(rec.equivalent),
      superClasses: strList(rec.superClasses),
      subClasses: strList(rec.subClasses),
      synthetic: false
    };
    nodes.push(node);
    nodeIds.add(id);
    classRecords.push([node, rec]);
  }

  // ---- properties --------------------------------------------------------
  const rawProperties = merge(arrayField(doc, 'property'), arrayField(doc, 'propertyAttribute'));
  const properties = new Map<string, Rec>();
  for (const rec of rawProperties) {
    const id = idOf(rec.id);
    if (id === '') {
      report.dropped.push({ kind: 'property', id, reason: 'empty id' });
      continue;
    }
    if (properties.has(id)) {
      report.dropped.push({ kind: 'property', id, reason: 'duplicate id' });
      continue;
    }
    properties.set(id, rec);
  }

  // Inverse partners, named on either side.
  const partner = new Map<string, string>();
  for (const [id, rec] of properties) {
    const inv = idOf(rec.inverse);
    if (inv !== '' && properties.has(inv)) partner.set(id, inv);
  }
  for (const [id, inv] of [...partner]) {
    if (!partner.has(inv)) partner.set(inv, id);
  }

  let needThing = false;
  const edges: NormalisedEdge[] = [];

  for (const [id, rec] of properties) {
    const vowlType = str(rec.type) ?? 'owl:ObjectProperty';
    const kind = EDGE_KIND[vowlType.toLowerCase()] ?? 'objectProperty';
    const iri = str(rec.iri);

    let domains = strList(rec.domain);
    let ranges = strList(rec.range);
    let endpoints: EndpointSource = 'declared';

    if (domains.length === 0 || ranges.length === 0) {
      const inv = partner.get(id);
      const invRec = inv ? properties.get(inv) : undefined;
      if (invRec && strList(invRec.domain).length > 0 && strList(invRec.range).length > 0) {
        domains = strList(invRec.range);
        ranges = strList(invRec.domain);
        endpoints = 'inverse';
        report.inverseResolved.push(id);
      }
    }
    if (domains.length === 0 || ranges.length === 0) {
      if (domains.length === 0) domains = [OWL_THING_ID];
      if (ranges.length === 0) ranges = [OWL_THING_ID];
      endpoints = 'owl:Thing';
      needThing = true;
      report.thingFallbacks.push(id);
    }

    const label = pickText(rec.label) ?? iriFragment(iri) ?? DEFAULT_EDGE_LABEL[kind] ?? id;
    const card = {
      exact: str(idOf(rec.cardinality)),
      min: str(idOf(rec.minCardinality)),
      max: str(idOf(rec.maxCardinality))
    };
    const base = {
      propertyId: id,
      kind,
      vowlType,
      label,
      iri,
      comment: pickText(rec.comment),
      attributes: strList(rec.attributes),
      characteristics: characteristicsOf(rec, vowlType),
      inverse: partner.get(id),
      cardinality: card.exact || card.min || card.max ? card : undefined,
      endpoints,
      generated: false
    };

    let n = 0;
    for (const d of domains) {
      for (const r of ranges) {
        edges.push({ ...base, id: n === 0 ? id : `${id}#${n}`, source: d, target: r });
        n++;
      }
    }
    if (n > 1) report.expanded.push(id);
  }

  // Set-operator edges.
  for (const [node, rec] of classRecords) {
    for (const [field, op] of SET_OPERATORS) {
      strList(rec[field]).forEach((member, i) => {
        edges.push({
          id: `GENERATED-${op}-${node.id}-${member}-${i}`,
          propertyId: `GENERATED-${op}-${node.id}-${member}-${i}`,
          source: node.id,
          target: member,
          kind: 'setOperator',
          vowlType: 'setOperatorProperty',
          label: '',
          attributes: [],
          characteristics: { functional: false, inverseFunctional: false, transitive: false, symmetric: false },
          endpoints: 'generated',
          generated: true
        });
      });
    }
  }

  if (needThing) {
    nodes.push({
      id: OWL_THING_ID,
      kind: 'class',
      vowlType: 'owl:Thing',
      label: 'Thing',
      labelSource: 'type',
      iri: 'http://www.w3.org/2002/07/owl#Thing',
      attributes: [],
      instances: 0,
      individuals: 0,
      equivalent: [],
      superClasses: [],
      subClasses: [],
      synthetic: true
    });
    nodeIds.add(OWL_THING_ID);
  }

  // Undeclared datatype ranges: one datatype node per edge (owl2vowl style).
  for (const e of edges) {
    if (nodeIds.has(e.target)) continue;
    const dt = datatypeRef(e.target);
    if (!dt) continue;
    const id = `${DATATYPE_NODE_PREFIX}${e.id}`;
    nodes.push({
      id,
      kind: nodeKind(dt.vowlType),
      vowlType: dt.vowlType,
      label: dt.label,
      labelSource: 'type',
      iri: dt.iri,
      attributes: ['datatype'],
      instances: 0,
      individuals: 0,
      equivalent: [],
      superClasses: [],
      subClasses: [],
      synthetic: true
    });
    nodeIds.add(id);
    report.datatypesSynthesised.push(e.id);
    e.target = id;
  }

  // Edges whose endpoint names no node can be neither drawn nor laid out.
  const kept: NormalisedEdge[] = [];
  for (const e of edges) {
    if (!nodeIds.has(e.source)) {
      report.dropped.push({ kind: 'property', id: e.id, reason: `unknown domain: ${e.source}` });
    } else if (!nodeIds.has(e.target)) {
      report.dropped.push({ kind: 'property', id: e.id, reason: `unknown range: ${e.target}` });
    } else {
      kept.push(e);
    }
  }

  // ---- metadata ----------------------------------------------------------
  const header = isRecord(doc.header) ? doc.header : {};
  const metadata = {
    title: pickText(header.title),
    iri: str(header.iri),
    version: str(header.version),
    description: pickText(header.description)
  };

  return { normalised: true, nodes, edges: kept, metadata, report };
}

/** True for an object produced by [`normaliseOwl2Vowl`]. */
export function isNormalisedOntology(v: unknown): v is NormalisedOntology {
  return isRecord(v) && v.normalised === true && Array.isArray(v.nodes) && Array.isArray(v.edges);
}
