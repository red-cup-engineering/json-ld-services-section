import test from "node:test";
import assert from "node:assert/strict";
import { mapRecord, readPath } from "../src/map-records.mjs";
import { compactStatementsAsJsonLd } from "../src/json-ld.mjs";

const prefixes = { schema: "https://schema.org/" };
const record = {
  id: "fix-x",
  status: "open",
  says: ["first", "second"],
  items: [{ role: "user", text: "do it" }, { role: "agent", text: "ok" }, "bare"],
};

test("readPath reads the element, the record, the file and the index", () => {
  const row = { $record: record, $item: record.items[0], $file: "f", $index: 0 };
  assert.equal(readPath(row, "text"), "do it");
  assert.equal(readPath(row, "^.id"), "fix-x");
  assert.equal(readPath(row, "."), record.items[0]);
  assert.equal(readPath(row, "$file"), "f");
  assert.equal(readPath(row, "$index"), 0);
  const triple = { $record: [], $item: ["host", "deploys", "nothing"] };
  assert.equal(readPath(triple, "1"), "deploys");
});

test("a mapping makes one typed node per record, with values, prefixes and templates", () => {
  const doc = compactStatementsAsJsonLd(mapRecord(record, "f", {
    prefixes,
    type: "schema:Action",
    id: "urn:t:{id}",
    properties: {
      "schema:name": "says",
      "schema:actionStatus": { path: "status", values: { open: "schema:PotentialActionStatus" }, iri: true },
      "schema:agent": { value: "emsenn", prefix: "urn:person:", iri: true },
      "schema:url": { template: "urn:t:{id}/page", iri: true },
      "schema:about": { paths: ["missing", "id"] },
    },
  }), { prefixes });
  assert.deepEqual(doc["@graph"], [{
    "@id": "urn:t:fix-x",
    "@type": "schema:Action",
    "schema:about": "fix-x",
    "schema:actionStatus": { "@id": "https://schema.org/PotentialActionStatus" },
    "schema:agent": { "@id": "urn:person:emsenn" },
    "schema:name": ["first", "second"],
    "schema:url": { "@id": "urn:t:fix-x/page" },
  }]);
});

test("require skips a row whose required predicate gets no value", () => {
  const mapping = {
    prefixes,
    type: "schema:Message",
    id: "urn:m:{id}",
    require: ["schema:text"],
    properties: { "schema:text": "missing", "schema:about": "id" },
  };
  assert.deepEqual(mapRecord(record, "f", mapping), []);
  assert.equal(mapRecord(record, "f", { ...mapping, properties: { "schema:text": "id" } }).length, 2);
});

test("each and where make one node per matching element", () => {
  const statements = mapRecord(record, "f", {
    prefixes,
    type: "schema:Message",
    id: "urn:m:{^.id}-{$index}",
    each: "items",
    where: { role: "user" },
    properties: { "schema:text": "text" },
  });
  assert.deepEqual(statements.map((s) => s.subject), ["urn:m:fix-x-0", "urn:m:fix-x-0"]);
  assert.equal(statements[1].object.value, "do it");
});
