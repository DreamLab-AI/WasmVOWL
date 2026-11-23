/**
 * Core graph type definitions for WebVOWL
 */

export type NodeType = 'class' | 'datatype' | 'literal' | 'property';
export type EdgeType = 'objectProperty' | 'datatypeProperty' | 'subclass' | 'disjoint' | 'setOperator';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Ontology facts carried on a node (from the owl2vowl normaliser). */
export interface NodeProperties {
  /** The owl2vowl type as written, e.g. `owl:Class`, `owl:Thing`, `rdfs:Literal`. */
  vowlType?: string;
  comment?: string;
  instances?: number;
  individuals?: number;
  attributes?: string[];
  equivalent?: string[];
  superClasses?: string[];
  subClasses?: string[];
  /** True for nodes the normaliser synthesised (shared owl:Thing, per-edge datatypes). */
  synthetic?: boolean;
  [key: string]: unknown;
}

/** Ontology facts carried on an edge (from the owl2vowl normaliser). */
export interface EdgeProperties {
  propertyId?: string;
  vowlType?: string;
  iri?: string;
  comment?: string;
  attributes?: string[];
  functional?: boolean;
  inverseFunctional?: boolean;
  transitive?: boolean;
  symmetric?: boolean;
  inverse?: string;
  /** Where the endpoints came from: declared, inverse, owl:Thing or generated. */
  endpoints?: string;
  generated?: boolean;
  [key: string]: unknown;
}

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  iri?: string;
  position: Vector3;
  velocity: Vector3;
  properties: NodeProperties;

  // Visual properties
  color?: string;
  radius?: number;
  opacity?: number;

  // Interaction state
  selected?: boolean;
  hovered?: boolean;
  pinned?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label: string;
  properties: EdgeProperties;

  // Visual properties
  color?: string;
  width?: number;
  opacity?: number;

  // Interaction state
  selected?: boolean;
  hovered?: boolean;
}

export interface GraphData {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  metadata?: {
    title?: string;
    description?: string;
    version?: string;
    namespace?: Record<string, string>;
  };
}

export interface GraphFilter {
  type: 'degree' | 'nodeType' | 'edgeType' | 'property';
  config: { nodeType?: string; edgeType?: string; min?: number; max?: number; [key: string]: unknown };
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  classCounts: Record<string, number>;
  propertyCounts: Record<string, number>;
  maxDegree: number;
  avgDegree: number;
}
