/**
 * Unit tests for the owl2vowl normaliser: one decision per edge case.
 *
 * The normaliser turns an owl2vowl / WebVOWL JSON document into the merged
 * `{ class, property }` shape the vowl-wasm engine accepts, plus the node and
 * edge records the graph store renders. Every case below is a rule the
 * engine or the VOWL notation forces; the real-engine file
 * (tests/integration/engine.real.test.ts) checks the nine legacy ontologies.
 */

import { describe, it, expect } from 'vitest';
import { normaliseOwl2Vowl, OWL_THING_ID, DATATYPE_NODE_PREFIX } from '@/lib/owl2vowl';

function edge(n: ReturnType<typeof normaliseOwl2Vowl>, id: string) {
  const e = n.edges.find((x) => x.id === id);
  if (!e) throw new Error(`edge ${id} missing`);
  return e;
}

function node(n: ReturnType<typeof normaliseOwl2Vowl>, id: string) {
  const v = n.nodes.find((x) => x.id === id);
  if (!v) throw new Error(`node ${id} missing`);
  return v;
}

describe('normaliseOwl2Vowl', () => {
  describe('merging base records with their attribute records', () => {
    it('takes labels and IRIs from classAttribute, preferring the English label', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: '1', type: 'owl:Class' }],
        classAttribute: [
          { id: '1', iri: 'http://xmlns.com/foaf/0.1/Agent', label: { 'IRI-based': 'Agent', en: 'Agent (en)' } }
        ],
        property: []
      });

      expect(n.engine.class).toEqual([
        { id: '1', type: 'owl:Class', label: 'Agent (en)', iri: 'http://xmlns.com/foaf/0.1/Agent' }
      ]);
      expect(node(n, '1')).toMatchObject({ kind: 'class', vowlType: 'owl:Class', label: 'Agent (en)' });
    });

    it('takes domain, range and label from propertyAttribute', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }, { id: 'b', type: 'owl:Class' }],
        classAttribute: [],
        property: [{ id: 'p', type: 'owl:objectProperty' }],
        propertyAttribute: [{ id: 'p', domain: 'a', range: 'b', label: { 'IRI-based': 'knows' } }]
      });

      expect(n.engine.property).toEqual([
        expect.objectContaining({ id: 'p', type: 'owl:ObjectProperty', label: 'knows', domain: 'a', range: 'b' })
      ]);
      expect(edge(n, 'p')).toMatchObject({ source: 'a', target: 'b', kind: 'objectProperty', endpoints: 'declared' });
    });

    it('lets fields on the base record win over the attribute record (WebVOWL addAdditionalAttributes)', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'c', type: 'owl:Class', label: 'Base label' }],
        classAttribute: [{ id: 'c', label: 'Attribute label', iri: 'http://ex.org/c' }],
        property: [{ id: 'p', domain: 'c', range: 'c', type: 'owl:ObjectProperty' }]
      });

      expect(node(n, 'c')).toMatchObject({ label: 'Base label', iri: 'http://ex.org/c' });
      expect(edge(n, 'p')).toMatchObject({ source: 'c', target: 'c' });
    });

    it('accepts the store-era shape (label maps and single-element domain/range arrays on the base record)', () => {
      const n = normaliseOwl2Vowl({
        class: [
          { id: 'Person', type: 'owl:Class', label: { en: 'Person' } },
          { id: 'Org', type: 'owl:Class', label: { default: 'Organisation' } }
        ],
        property: [{ id: 'worksFor', type: 'owl:ObjectProperty', domain: ['Person'], range: ['Org'] }]
      });

      expect(node(n, 'Org').label).toBe('Organisation');
      expect(n.engine.property[0]).toMatchObject({ domain: 'Person', range: 'Org' });
    });
  });

  describe('labels', () => {
    it('never hands the engine an empty label', () => {
      const n = normaliseOwl2Vowl({
        class: [
          { id: 'x', type: 'owl:Class', label: '' },
          { id: 'y', type: 'owl:Class', iri: 'http://ex.org/onto#Thingy' },
          { id: 'z', type: 'rdfs:Literal' },
          { id: 't', type: 'owl:Thing' }
        ],
        property: []
      });

      const labels = Object.fromEntries(n.engine.class.map((c) => [c.id, c.label]));
      expect(labels).toEqual({ x: 'x', y: 'Thingy', z: 'Literal', t: 'Thing' });
    });
  });

  describe('datatype and literal ranges', () => {
    it('keeps rdfs:Literal and rdfs:Datatype as datatype nodes, as owl2vowl and WebVOWL draw them', () => {
      const n = normaliseOwl2Vowl({
        class: [
          { id: 'c', type: 'owl:Class' },
          { id: 'lit', type: 'rdfs:Literal' },
          { id: 'dt', type: 'rdfs:Datatype' }
        ],
        classAttribute: [{ id: 'dt', iri: 'http://www.w3.org/2001/XMLSchema#string', label: { 'IRI-based': 'string' } }],
        property: [
          { id: 'p1', type: 'owl:datatypeProperty' },
          { id: 'p2', type: 'owl:datatypeProperty' }
        ],
        propertyAttribute: [
          { id: 'p1', domain: 'c', range: 'lit' },
          { id: 'p2', domain: 'c', range: 'dt' }
        ]
      });

      expect(node(n, 'lit')).toMatchObject({ kind: 'literal', vowlType: 'rdfs:Literal', label: 'Literal' });
      expect(node(n, 'dt')).toMatchObject({ kind: 'datatype', vowlType: 'rdfs:Datatype', label: 'string' });
      expect(edge(n, 'p1').kind).toBe('datatypeProperty');
      expect(n.engine.class.map((c) => c.type)).toEqual(['owl:Class', 'rdfs:Literal', 'rdfs:Datatype']);
    });

    it('gives an undeclared datatype range (xsd:, XML Schema IRI, rdfs:Literal) its own datatype node per edge', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'Person', type: 'owl:Class' }],
        property: [
          { id: 'age', type: 'owl:DatatypeProperty', domain: 'Person', range: 'xsd:integer' },
          { id: 'height', type: 'owl:DatatypeProperty', domain: 'Person', range: 'xsd:integer' },
          { id: 'born', type: 'owl:DatatypeProperty', domain: 'Person', range: 'http://www.w3.org/2001/XMLSchema#date' },
          { id: 'note', type: 'owl:DatatypeProperty', domain: 'Person', range: 'rdfs:Literal' }
        ]
      });

      expect(n.edges.map((e) => [e.id, e.target])).toEqual([
        ['age', `${DATATYPE_NODE_PREFIX}age`],
        ['height', `${DATATYPE_NODE_PREFIX}height`],
        ['born', `${DATATYPE_NODE_PREFIX}born`],
        ['note', `${DATATYPE_NODE_PREFIX}note`]
      ]);
      expect(node(n, `${DATATYPE_NODE_PREFIX}age`)).toMatchObject({
        kind: 'datatype', label: 'xsd:integer', iri: 'http://www.w3.org/2001/XMLSchema#integer', synthetic: true
      });
      expect(node(n, `${DATATYPE_NODE_PREFIX}born`).label).toBe('xsd:date');
      expect(node(n, `${DATATYPE_NODE_PREFIX}note`)).toMatchObject({ kind: 'literal', label: 'Literal' });
      expect(n.report.datatypesSynthesised).toEqual(['age', 'height', 'born', 'note']);
      expect(n.report.dropped).toEqual([]);
    });

    it('reads the separate datatype / datatypeAttribute arrays of the WebVOWL benchmark format', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'c', type: 'owl:Class', label: 'C' }],
        datatype: [{ id: 'dt', type: 'rdfs:Datatype', label: 'e.g. String' }],
        datatypeAttribute: [{ id: 'dt', comment: 'a datatype' }],
        property: [{ id: 'p' }],
        propertyAttribute: [{ id: 'p', type: 'owl:DatatypeProperty', domain: 'c', range: 'dt' }]
      });

      expect(node(n, 'dt')).toMatchObject({ kind: 'datatype', label: 'e.g. String', comment: 'a datatype' });
      expect(edge(n, 'p')).toMatchObject({ source: 'c', target: 'dt' });
    });
  });

  describe('properties without domain or range', () => {
    it('takes swapped endpoints from the inverse property, whichever side declares the inverse', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }, { id: 'b', type: 'owl:Class' }],
        property: [{ id: 'to' }, { id: 'from' }, { id: 'up' }, { id: 'down' }],
        propertyAttribute: [
          // `to` names its inverse; `from` has no endpoints and no inverse field.
          { id: 'to', type: 'owl:ObjectProperty', domain: 'a', range: 'b', inverse: 'from' },
          { id: 'from', type: 'owl:ObjectProperty' },
          // `down` names its inverse and has no endpoints itself.
          { id: 'up', type: 'owl:ObjectProperty', domain: 'a', range: 'b' },
          { id: 'down', type: 'owl:ObjectProperty', inverse: 'up' }
        ]
      });

      expect(edge(n, 'from')).toMatchObject({ source: 'b', target: 'a', endpoints: 'inverse', inverse: 'to' });
      expect(edge(n, 'down')).toMatchObject({ source: 'b', target: 'a', endpoints: 'inverse', inverse: 'up' });
      expect(n.nodes.some((v) => v.id === OWL_THING_ID)).toBe(false);
    });

    it('attaches a missing end to one shared owl:Thing node (VOWL default) and records it', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }],
        property: [
          { id: 'noRange', type: 'owl:ObjectProperty', domain: 'a' },
          { id: 'noDomain', type: 'owl:ObjectProperty', range: ['a'] },
          { id: 'neither', type: 'owl:ObjectProperty', domain: [], range: [] }
        ]
      });

      expect(edge(n, 'noRange')).toMatchObject({ source: 'a', target: OWL_THING_ID, endpoints: 'owl:Thing' });
      expect(edge(n, 'noDomain')).toMatchObject({ source: OWL_THING_ID, target: 'a', endpoints: 'owl:Thing' });
      expect(edge(n, 'neither')).toMatchObject({ source: OWL_THING_ID, target: OWL_THING_ID });
      expect(n.nodes.filter((v) => v.id === OWL_THING_ID)).toHaveLength(1);
      expect(node(n, OWL_THING_ID)).toMatchObject({ vowlType: 'owl:Thing', label: 'Thing', synthetic: true });
      expect(n.engine.class.map((c) => c.id)).toContain(OWL_THING_ID);
      expect(n.report.thingFallbacks.sort()).toEqual(['neither', 'noDomain', 'noRange']);
    });
  });

  describe('domain and range arrays', () => {
    it('expands a multi-valued domain/range into one edge per pair, keeping the original id on the first', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }, { id: 'b', type: 'owl:Class' }, { id: 'c', type: 'owl:Class' }],
        property: [{ id: 'p', type: 'owl:ObjectProperty', domain: ['a', 'b'], range: 'c' }]
      });

      expect(n.edges.map((e) => [e.id, e.source, e.target])).toEqual([
        ['p', 'a', 'c'],
        ['p#1', 'b', 'c']
      ]);
      expect(n.engine.property.map((p) => p.id)).toEqual(['p', 'p#1']);
      expect(n.report.expanded).toEqual(['p']);
    });
  });

  describe('relation kinds', () => {
    it('maps owl2vowl property types case-insensitively through one table', () => {
      const types: Record<string, string> = {
        'owl:objectProperty': 'objectProperty',
        'owl:ObjectProperty': 'objectProperty',
        'owl:datatypeProperty': 'datatypeProperty',
        'rdfs:SubClassOf': 'subclass',
        'owl:disjointWith': 'disjoint',
        'rdf:Property': 'objectProperty',
        'owl:someValuesFrom': 'objectProperty',
        'owl:allValuesFrom': 'objectProperty',
        'owl:equivalentProperty': 'objectProperty',
        'owl:FunctionalProperty': 'objectProperty',
        'owl:InverseFunctionalProperty': 'objectProperty',
        'owl:TransitiveProperty': 'objectProperty',
        'owl:SymmetricProperty': 'objectProperty'
      };
      const ids = Object.keys(types);
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }],
        property: ids.map((t, i) => ({ id: `p${i}`, type: t, domain: 'a', range: 'a' }))
      });

      ids.forEach((t, i) => {
        expect([t, edge(n, `p${i}`).kind]).toEqual([t, types[t]]);
        expect(edge(n, `p${i}`).vowlType).toBe(t);
      });
      expect(edge(n, `p${ids.indexOf('owl:FunctionalProperty')}`).characteristics.functional).toBe(true);
      expect(edge(n, `p${ids.indexOf('owl:TransitiveProperty')}`).characteristics.transitive).toBe(true);
      expect(n.engine.property.find((p) => p.id === `p${ids.indexOf('rdfs:SubClassOf')}`)?.type).toBe('subclass');
    });

    it('reads characteristics from the attributes list too', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }],
        property: [{ id: 'p', type: 'owl:objectProperty', domain: 'a', range: 'a', attributes: ['functional', 'symmetric'] }]
      });
      expect(edge(n, 'p').characteristics).toMatchObject({ functional: true, symmetric: true, transitive: false });
      expect(n.engine.property[0]).toMatchObject({ functional: true, symmetric: true });
    });

    it('keeps subclass and disjoint relations where owl2vowl puts them: in the property list', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }, { id: 'b', type: 'owl:Class' }],
        classAttribute: [{ id: 'a', superClasses: ['b'] }, { id: 'b', subClasses: ['a'] }],
        property: [{ id: 's', type: 'rdfs:SubClassOf' }, { id: 'd', type: 'owl:disjointWith' }],
        propertyAttribute: [{ id: 's', domain: 'a', range: 'b' }, { id: 'd', domain: 'a', range: 'b' }]
      });

      // superClasses / subClasses on classAttribute duplicate the SubClassOf
      // property; they are kept as node metadata, not turned into more edges.
      expect(n.edges.map((e) => [e.id, e.kind])).toEqual([['s', 'subclass'], ['d', 'disjoint']]);
      expect(edge(n, 's').label).toBe('Subclass of');
    });

    it('generates set-operator edges from union/intersection/complement/disjointUnion (WebVOWL addSetOperatorProperties)', () => {
      const n = normaliseOwl2Vowl({
        class: [
          { id: 'u', type: 'owl:unionOf' },
          { id: 'a', type: 'owl:Class' },
          { id: 'b', type: 'owl:Class' }
        ],
        classAttribute: [{ id: 'u', union: ['a', 'b'] }],
        property: []
      });

      expect(n.edges.map((e) => [e.id, e.source, e.target, e.kind])).toEqual([
        ['GENERATED-UNION-u-a-0', 'u', 'a', 'setOperator'],
        ['GENERATED-UNION-u-b-1', 'u', 'b', 'setOperator']
      ]);
      expect(n.edges.every((e) => e.generated)).toBe(true);
    });
  });

  describe('what is dropped, and that it is logged', () => {
    it('drops records with an empty id, duplicate ids and edges to unknown nodes, and reports each', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: '', type: '' }, { id: 'a', type: 'owl:Class' }, { id: 'a', type: 'owl:Class' }],
        property: [
          { id: '', domain: '', range: '' },
          { id: 'p', type: 'owl:ObjectProperty', domain: 'a', range: 'ghost' },
          { id: 'q', type: 'owl:ObjectProperty', domain: 'a', range: 'a' },
          { id: 'q', type: 'owl:ObjectProperty', domain: 'a', range: 'a' }
        ]
      });

      expect(n.nodes.map((v) => v.id)).toEqual(['a']);
      expect(n.edges.map((e) => e.id)).toEqual(['q']);
      expect(n.report.dropped.map((d) => [d.kind, d.id, d.reason])).toEqual([
        ['class', '', 'empty id'],
        ['class', 'a', 'duplicate id'],
        ['property', '', 'empty id'],
        ['property', 'q', 'duplicate id'],
        ['property', 'p', 'unknown range: ghost']
      ]);
    });
  });

  describe('document shape', () => {
    it('always gives the engine both arrays, even for a document with neither', () => {
      const n = normaliseOwl2Vowl({ header: { iri: 'http://ex.org/empty' }, namespace: [] });
      expect(n.engine.class).toEqual([]);
      expect(n.engine.property).toEqual([]);
      expect(n.nodes).toEqual([]);
      expect(n.metadata.iri).toBe('http://ex.org/empty');
    });

    it('never passes inverseOf to the engine (it would add a second edge reusing the inverse id)', () => {
      const n = normaliseOwl2Vowl({
        class: [{ id: 'a', type: 'owl:Class' }],
        property: [
          { id: 'p', type: 'owl:ObjectProperty', domain: 'a', range: 'a', inverse: 'q' },
          { id: 'q', type: 'owl:ObjectProperty', domain: 'a', range: 'a', inverse: 'p' }
        ]
      });
      expect(JSON.stringify(n.engine)).not.toContain('inverse');
      expect(edge(n, 'p').inverse).toBe('q');
    });

    it('rejects input that is not a JSON object, and a class field that is not an array', () => {
      expect(() => normaliseOwl2Vowl(null)).toThrow(/not an owl2vowl document/);
      expect(() => normaliseOwl2Vowl([1, 2])).toThrow(/not an owl2vowl document/);
      expect(() => normaliseOwl2Vowl({ class: {} })).toThrow(/'class' must be an array/);
    });

    it('reads the header title from a language map', () => {
      const n = normaliseOwl2Vowl({ header: { title: { en: 'FOAF' }, version: '0.99' }, class: [], property: [] });
      expect(n.metadata).toMatchObject({ title: 'FOAF', version: '0.99' });
    });
  });
});
