# @red-cup-engineering/json-ld-services-section

Deterministic JSON-LD writing for the Group's services: compaction against a supplied
prefix context with a stable order of nodes, keys and values, so equal data is equal bytes.

It exists because three services each wrote JSON-LD by hand: `prov-o-provenance-service`
compacted PROV-O statements with four prefixes, and `research-release-metadata-service`
built codemeta and schema.org documents in a fixed key order. Both now use this package.

## What it does

```js
import { compactStatementsAsJsonLd, compactIri, pruneEmpty, jsonLdText } from "@red-cup-engineering/json-ld-services-section/json-ld";
```

- `compactStatementsAsJsonLd(statements, { prefixes })` — RDF statements to
  `{ "@context": prefixes, "@graph": [...] }`. Nodes are sorted by `@id`, a node's
  properties by key, a property's values by their JSON; equal values collapse; one value is
  written bare, several as an array. `rdf:type` becomes `@type`; an IRI object is `{ "@id" }`; a
  plain literal is its text; a typed or language-tagged literal is `{ "@value", "@type" | "@language" }`.
  The same statements in any order give the same document. A statement is
  `{ subject, predicate, object: { kind: "iri" | "literal", value, datatype?, language? } }`.
- `compactIri(iri, prefixes)` — the CURIE under the first prefix (in the order given) whose
  namespace the IRI properly extends; the IRI itself otherwise.
- `pruneEmpty(record)` and `jsonLdText(document)` — for documents built by hand in a fixed key
  order: drop members that are `undefined` or an empty array, then write 2-space JSON and one
  final newline.

## The operation

`compactRdfStatementsAsJsonLd({ statements, prefixes }) -> { jsonLd }` is an effect-free typed
operation with the house NDJSON face (`compact-rdf-statements-as-json-ld`: one JSON value per
input line, one per output line; a refusal is a line with `ok: false` and exit code 2).

- Refusals: `TypeError` for a request that is not `{ statements, prefixes }`, a statement of
  another shape, or prefixes that are not an object of strings.
- Precondition: statements are RDF terms as above; blank-node labels may stand as subjects.
- Postcondition: the document is a function of the set of statements and the ordered prefixes alone.
- Effect class: pure.
- Witness: `test/json-ld.test.mjs` (order independence, deduplication, byte identity) and
  `test/face.test.mjs` (the command face).

## Held market offer

The operation is declared in `package.json#x-market` and in `data/records/offers/` as a held
offer (`saleStatus: "held"`, sold by the `engineering` enterprise, $0.005 a call, runtime
`edge`). Holding it keeps it off sale until the catalog merge that puts it on. The
`market-offers` workflow derives and reconciles it. `test/offers.test.mjs` pins the offer
against the schemas in `test/fixtures/`.

## Not here

Expansion, framing and RDF dataset canonicalization are not done here: this writes a document,
it does not interpret one. Canonical N-Quads is `computer-triplet-serialized-content-engineering-services-section/rdf-canonicalization`.

MIT licensed.

## Mapping house JSON records to a standard vocabulary

`map-records-as-json-ld.mjs <mappings.json> <file>...` reads JSON or JSONL records and
prints one JSON-LD graph. A mapping names the node `type`, an `id` template, an optional
`each` array and `where` filter, and `properties` from predicate to source path, so a record
of any house shape becomes schema.org, OSLC, Dublin Core or any other vocabulary's nodes
without new code. `src/map-records.mjs` documents the mapping fields, and
`test/map-records.test.mjs` is its witness. The internal services section's
`lib/record-mappings/` holds the mappings that wrote its `data/records/*.jsonld`.
