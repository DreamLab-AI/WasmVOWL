/**
 * OWL ontology type definitions
 *
 * `OntologyData` describes an owl2vowl / WebVOWL JSON document as it arrives
 * (a file, a sample). It is loose on purpose: owl2vowl splits each element
 * between a base record (`class`, `property`) and an attribute record
 * (`classAttribute`, `propertyAttribute`), labels may be language maps, and
 * domain/range may be strings or arrays. `src/lib/owl2vowl.ts` turns it into
 * the one normalised shape the store and the WASM engine both consume.
 */

type LabelValue = string | Record<string, string>;

export interface OWLClass {
  id: string;
  type?: string;
  iri?: string;
  label?: LabelValue; // String or language map
  comment?: LabelValue;
  attributes?: string[];
  instances?: number;
  [key: string]: unknown;
}

export interface OWLProperty {
  id: string;
  type?: string;
  iri?: string;
  label?: LabelValue;
  comment?: LabelValue;
  domain?: string | string[];
  range?: string | string[];
  functional?: boolean;
  inverse?: string;
  [key: string]: unknown;
}

export interface OWLDatatype {
  id: string;
  type: 'rdfs:Datatype';
  iri: string;
  label?: Record<string, string>;
}

export interface OWLAxiom {
  type: 'subClassOf' | 'equivalentClass' | 'disjointWith' | 'propertyDomain' | 'propertyRange';
  subject: string;
  object: string;
  properties?: Record<string, unknown>;
}

export interface OntologyData {
  header?: {
    title?: LabelValue;
    iri?: string;
    version?: string;
    author?: string[];
    description?: LabelValue;
  };
  namespace?: unknown;
  class?: OWLClass[];
  property?: OWLProperty[];
  datatype?: Array<Partial<OWLDatatype> & { id: string }>;
  classAttribute?: Array<Record<string, unknown>>;
  propertyAttribute?: Array<Record<string, unknown>>;
  datatypeAttribute?: Array<Record<string, unknown>>;
}

export interface ParsedOntology {
  nodes: OWLClass[];
  edges: OWLProperty[];
  datatypes: OWLDatatype[];
  axioms: OWLAxiom[];
  metadata: {
    title: string;
    iri: string;
    version: string;
    namespaces: Record<string, string>;
  };
}
