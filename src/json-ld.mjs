// Deterministic JSON-LD writing: compaction against a supplied context and stable key order.
//
// Two writers, both pure:
//   - `compactStatementsAsJsonLd(statements, { prefixes })`: RDF statements to a compacted JSON-LD
//     graph. Nodes are sorted by @id, a node's properties by key, a property's values by their JSON,
//     and equal values collapse; a single value is written bare, several as an array.
//   - `pruneEmpty(record)` and `jsonLdText(document)`: for documents built by hand in a fixed key
//     order (codemeta, schema.org): drop members that say nothing, then write 2-space JSON and a
//     final newline, so equal documents are equal bytes.
// A statement is { subject: string, predicate: string, object: { kind: "iri" | "literal", value: string,
// datatype?: string, language?: string } }, the shape of the house RDF terms.

export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** Prefixes as ordered [prefix, namespace] pairs (an object's entries keep their order). */
const pairsOf = (prefixes) => {
  const pairs = Array.isArray(prefixes) ? prefixes : Object.entries(prefixes ?? {});
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string") throw new TypeError("prefixes must map prefix to namespace");
  }
  return pairs;
};

/** The CURIE of an IRI under the first prefix whose namespace it properly extends; the IRI itself otherwise. */
export function compactIri(iri, prefixes) {
  for (const [prefix, namespace] of pairsOf(prefixes)) if (iri.startsWith(namespace) && iri.length > namespace.length) return `${prefix}:${iri.slice(namespace.length)}`;
  return iri;
}

function admitStatements(statements) {
  if (!Array.isArray(statements)) throw new TypeError("statements must be an array");
  statements.forEach((statement, index) => {
    const object = statement?.object;
    const ok = typeof statement?.subject === "string" && typeof statement.predicate === "string"
      && (object?.kind === "iri" || object?.kind === "literal") && typeof object.value === "string"
      && [object.datatype, object.language].every((part) => part === undefined || typeof part === "string");
    if (!ok) throw new TypeError(`statements[${index}] must be { subject, predicate, object: { kind: "iri" | "literal", value, datatype?, language? } }`);
  });
}

/**
 * RDF statements as a compacted JSON-LD document `{ "@context": prefixes, "@graph": [...] }`.
 * rdf:type becomes @type with a compacted value; an IRI object is `{ "@id" }`; a plain literal is its
 * text; a typed or language-tagged literal is `{ "@value", "@type" | "@language" }`.
 */
export function compactStatementsAsJsonLd(statements, { prefixes } = {}) {
  admitStatements(statements);
  const pairs = pairsOf(prefixes);
  const compact = (iri) => compactIri(iri, pairs);
  const nodes = new Map();
  for (const { subject, predicate, object } of statements) {
    if (!nodes.has(subject)) nodes.set(subject, new Map());
    const properties = nodes.get(subject);
    const key = predicate === RDF_TYPE ? "@type" : compact(predicate);
    const value = predicate === RDF_TYPE ? compact(object.value)
      : object.kind === "iri" ? { "@id": object.value }
        : object.datatype === undefined && object.language === undefined ? object.value
          : { "@value": object.value, ...(object.datatype === undefined ? { "@language": object.language } : { "@type": compact(object.datatype) }) };
    if (!properties.has(key)) properties.set(key, new Map());
    properties.get(key).set(JSON.stringify(value), value);
  }
  const graph = [...nodes.keys()].sort(compare).map((id) => {
    const node = { "@id": id };
    for (const key of [...nodes.get(id).keys()].sort(compare)) {
      const values = [...nodes.get(id).get(key).entries()].sort(([a], [b]) => compare(a, b)).map(([, value]) => value);
      node[key] = values.length === 1 ? values[0] : values;
    }
    return node;
  });
  return { "@context": Object.fromEntries(pairs), "@graph": graph };
}

/** Drop the members of a record that say nothing (undefined, or an empty array), keeping insertion order. */
export function pruneEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)));
}

/** A JSON-LD document as text: 2-space JSON in the document's own key order, and a final newline. */
export function jsonLdText(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}
