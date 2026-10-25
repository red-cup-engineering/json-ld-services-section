import test from "node:test";
import assert from "node:assert/strict";
import { RDF_TYPE, compactIri, compactStatementsAsJsonLd, jsonLdText, pruneEmpty } from "../src/json-ld.mjs";
import { A, B, PREFIXES, PROV, STATEMENTS } from "./helpers.mjs";

test("compactIri uses the first prefix whose namespace the IRI properly extends", () => {
  assert.equal(compactIri(`${PROV}Entity`, PREFIXES), "prov:Entity");
  assert.equal(compactIri(PROV, PREFIXES), PROV);
  assert.equal(compactIri("https://example.org/x", PREFIXES), "https://example.org/x");
  assert.equal(compactIri("http://a/b/c", [["short", "http://a/"], ["long", "http://a/b/"]]), "short:b/c");
  assert.equal(compactIri("http://a/b/c", [["long", "http://a/b/"], ["short", "http://a/"]]), "long:c");
  assert.throws(() => compactIri("x", [["p"]]), TypeError);
});

test("statements compact to a sorted graph: nodes by @id, keys sorted, values deduplicated, singletons bare", () => {
  const document = compactStatementsAsJsonLd(STATEMENTS, { prefixes: PREFIXES });
  assert.deepEqual(document["@context"], PREFIXES);
  assert.deepEqual(document["@graph"].map((node) => node["@id"]), [A, B]);
  assert.deepEqual(document["@graph"][0], {
    "@id": A,
    "@type": "prov:Entity",
    "dcterms:extent": { "@value": "12", "@type": "xsd:nonNegativeInteger" },
    "rdfs:label": ["a.md", { "@value": "une page", "@language": "fr" }],
  });
  assert.deepEqual(document["@graph"][1], { "@id": B, "@type": "prov:Entity", "prov:wasDerivedFrom": { "@id": A } });
});

test("the document is independent of statement order and byte-identical on every run", () => {
  const first = jsonLdText(compactStatementsAsJsonLd(STATEMENTS, { prefixes: PREFIXES }));
  assert.equal(first, jsonLdText(compactStatementsAsJsonLd([...STATEMENTS].reverse(), { prefixes: PREFIXES })));
  assert.equal(first, jsonLdText(compactStatementsAsJsonLd(JSON.parse(JSON.stringify(STATEMENTS)), { prefixes: PREFIXES })));
  assert.ok(first.endsWith("}\n"));
  assert.equal(RDF_TYPE, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
});

test("no prefixes leaves IRIs whole; malformed statements are refused", () => {
  const bare = compactStatementsAsJsonLd([STATEMENTS[0]], {});
  assert.deepEqual(bare, { "@context": {}, "@graph": [{ "@id": B, "@type": `${PROV}Entity` }] });
  assert.throws(() => compactStatementsAsJsonLd("x", {}), TypeError);
  assert.throws(() => compactStatementsAsJsonLd([{ subject: "s", predicate: "p", object: { kind: "bnode", value: "b" } }], {}), /statements\[0\]/u);
  assert.throws(() => compactStatementsAsJsonLd([{ subject: "s", predicate: "p", object: { kind: "iri", value: "o", datatype: 1 } }], {}), TypeError);
});

test("pruneEmpty drops undefined members and empty arrays, keeping order; jsonLdText is 2-space JSON and one newline", () => {
  const record = pruneEmpty({ "@type": "Thing", a: undefined, b: [], c: [1], d: 0, e: "", f: false, g: null });
  assert.deepEqual(Object.keys(record), ["@type", "c", "d", "e", "f", "g"]);
  assert.equal(jsonLdText({ "@context": "https://schema.org", name: "x" }), '{\n  "@context": "https://schema.org",\n  "name": "x"\n}\n');
});
